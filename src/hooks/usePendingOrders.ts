import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface ExtractedLineItem {
  item_number: string;
  description: string | null;
  quantity: number;
  unit_price: number | null;
  unit_of_measure: string | null;
}

export interface ExtractedPOData {
  customer_name: string | null;
  customer_address: string | null;
  customer_city: string | null;
  customer_state: string | null;
  customer_zip: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  po_number: string | null;
  po_date: string | null;
  requested_delivery_date: string | null;
  ship_to_name: string | null;
  ship_to_address: string | null;
  ship_to_city: string | null;
  ship_to_state: string | null;
  ship_to_zip: string | null;
  line_items: ExtractedLineItem[];
  notes: string | null;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  confidence: number;
}

export interface PendingPurchaseOrder {
  id: string;
  email_from: string | null;
  email_subject: string | null;
  email_message_id: string | null;
  received_at: string;
  pdf_storage_path: string | null;
  pdf_filename: string | null;
  raw_extracted_data: ExtractedPOData | null;
  extraction_status: string;
  extraction_error: string | null;
  matched_customer_id: string | null;
  customer_confidence: number | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  created_sales_order_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  matched_customer?: {
    id: string;
    name: string;
    code: string;
  } | null;
  reviewer?: {
    first_name: string;
    last_name: string;
  } | null;
}

// Helper to safely parse extracted data from JSON
function parseExtractedData(json: Json | null): ExtractedPOData | null {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null;
  return json as unknown as ExtractedPOData;
}

// Helper to map database row to our type
function mapToPendingOrder(row: any): PendingPurchaseOrder {
  return {
    ...row,
    raw_extracted_data: parseExtractedData(row.raw_extracted_data),
  };
}

export function usePendingOrders(statusFilter?: string) {
  return useQuery({
    queryKey: ['pending-purchase-orders', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('pending_purchase_orders')
        .select(`
          *,
          matched_customer:customers(id, name, code),
          reviewer:profiles!pending_purchase_orders_reviewed_by_fkey(first_name, last_name)
        `)
        .order('received_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []).map(mapToPendingOrder) as PendingPurchaseOrder[];
    },
  });
}

export function usePendingOrdersCount() {
  return useQuery({
    queryKey: ['pending-purchase-orders-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('pending_purchase_orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'reviewing']);

      if (error) throw error;
      return count || 0;
    },
  });
}

export function usePendingOrder(id: string) {
  return useQuery({
    queryKey: ['pending-purchase-order', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pending_purchase_orders')
        .select(`
          *,
          matched_customer:customers(id, name, code),
          reviewer:profiles!pending_purchase_orders_reviewed_by_fkey(first_name, last_name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return mapToPendingOrder(data) as PendingPurchaseOrder;
    },
    enabled: !!id,
  });
}

export function useUpdatePendingOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase
        .from('pending_purchase_orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['pending-purchase-orders-count'] });
    },
    onError: (error) => {
      console.error('Failed to update pending order:', error);
      toast.error('Failed to update pending order');
    },
  });
}

export function useRejectPendingOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('pending_purchase_orders')
        .update({
          status: 'rejected',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          notes,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['pending-purchase-orders-count'] });
      toast.success('Order rejected');
    },
    onError: (error) => {
      console.error('Failed to reject order:', error);
      toast.error('Failed to reject order');
    },
  });
}

export function useExtractPO() {
  return useMutation({
    mutationFn: async ({ pdfBase64, mimeType = 'application/pdf' }: { pdfBase64: string; mimeType?: string }) => {
      const { data, error } = await supabase.functions.invoke('extract-po-pdf', {
        body: { pdfBase64, mimeType },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Extraction failed');

      return data.data as ExtractedPOData;
    },
    onError: (error) => {
      console.error('Failed to extract PO data:', error);
      toast.error('Failed to extract data from PDF');
    },
  });
}

export function useCreatePendingOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      pdf_storage_path: string;
      pdf_filename: string;
      raw_extracted_data?: ExtractedPOData;
      extraction_status: string;
      matched_customer_id?: string;
    }) => {
      const insertData: Record<string, unknown> = {
        pdf_storage_path: data.pdf_storage_path,
        pdf_filename: data.pdf_filename,
        extraction_status: data.extraction_status,
      };

      if (data.raw_extracted_data) {
        insertData.raw_extracted_data = data.raw_extracted_data as unknown as Json;
      }

      if (data.matched_customer_id) {
        insertData.matched_customer_id = data.matched_customer_id;
      }

      const { data: result, error } = await supabase
        .from('pending_purchase_orders')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['pending-purchase-orders-count'] });
    },
    onError: (error) => {
      console.error('Failed to create pending order:', error);
      toast.error('Failed to create pending order');
    },
  });
}

export function getPdfUrl(storagePath: string) {
  const { data } = supabase.storage
    .from('incoming-purchase-orders')
    .getPublicUrl(storagePath);
  
  return data.publicUrl;
}

export async function getSignedPdfUrl(storagePath: string) {
  const { data, error } = await supabase.storage
    .from('incoming-purchase-orders')
    .createSignedUrl(storagePath, 3600); // 1 hour expiry

  if (error) throw error;
  return data.signedUrl;
}
