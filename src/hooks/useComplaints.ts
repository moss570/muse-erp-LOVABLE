import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import type { CustomerComplaint } from '@/types/customer-complaints';

// ============================================
// COMPLAINTS
// ============================================

export function useComplaints(filters?: {
  status?: string;
  type?: string;
  severity?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  return useQuery({
    queryKey: ['customer-complaints', filters],
    queryFn: async () => {
      let query = supabase
        .from('customer_complaints')
        .select(`
          *,
          customer:customers(id, name),
          product:products(id, name, sku),
          capa:corrective_actions(id, capa_number, status),
          assigned_to_profile:profiles!customer_complaints_assigned_to_fkey(id, first_name, last_name)
        `)
        .order('received_date', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.type) {
        query = query.eq('complaint_type', filters.type);
      }
      if (filters?.severity) {
        query = query.eq('severity', filters.severity);
      }
      if (filters?.dateFrom) {
        query = query.gte('received_date', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('received_date', filters.dateTo);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useComplaint(complaintId: string | undefined) {
  return useQuery({
    queryKey: ['customer-complaint', complaintId],
    queryFn: async () => {
      if (!complaintId) return null;

      const { data, error } = await supabase
        .from('customer_complaints')
        .select(`
          *,
          customer:customers(id, name),
          product:products(id, name, sku),
          capa:corrective_actions(id, capa_number, status, title),
          assigned_to_profile:profiles!customer_complaints_assigned_to_fkey(id, first_name, last_name)
        `)
        .eq('id', complaintId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!complaintId,
  });
}

export function useCreateComplaint() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: Partial<CustomerComplaint>) => {
      // Generate complaint number
      const { data: numberData } = await supabase.rpc('generate_complaint_number');
      
      const { data, error } = await supabase
        .from('customer_complaints')
        .insert({
          customer_name: input.customer_name || 'Unknown',
          complaint_type: input.complaint_type || 'other',
          description: input.description || '',
          severity: input.severity || 'minor',
          complaint_date: input.complaint_date || new Date().toISOString().split('T')[0],
          received_date: input.received_date || new Date().toISOString().split('T')[0],
          customer_id: input.customer_id,
          customer_contact: input.customer_contact,
          customer_email: input.customer_email,
          customer_phone: input.customer_phone,
          product_id: input.product_id,
          product_name: input.product_name,
          product_sku: input.product_sku,
          production_lot_number: input.production_lot_number,
          best_by_date: input.best_by_date,
          purchase_date: input.purchase_date,
          purchase_location: input.purchase_location,
          received_via: input.received_via,
          assigned_to: input.assigned_to,
          reportable_event: input.reportable_event || false,
          complaint_number: numberData || `CMP-${Date.now()}`,
          created_by: user?.id,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-complaints'] });
      toast.success('Complaint created successfully');
    },
    onError: (error) => {
      console.error('Failed to create complaint:', error);
      toast.error('Failed to create complaint');
    },
  });
}

export function useUpdateComplaint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<CustomerComplaint>) => {
      const { data, error } = await supabase
        .from('customer_complaints')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customer-complaints'] });
      queryClient.invalidateQueries({ queryKey: ['customer-complaint', data.id] });
    },
    onError: (error) => {
      console.error('Failed to update complaint:', error);
      toast.error('Failed to update complaint');
    },
  });
}

export function useCreateCapaFromComplaint() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ complaintId, severity }: { complaintId: string; severity?: string }) => {
      // Get complaint details
      const { data: complaint, error: fetchError } = await supabase
        .from('customer_complaints')
        .select('*')
        .eq('id', complaintId)
        .single();

      if (fetchError) throw fetchError;

      // Generate CAPA number
      const { data: capaNumber } = await supabase.rpc('generate_capa_number');

      // Create CAPA
      const { data: capa, error: capaError } = await supabase
        .from('corrective_actions')
        .insert({
          capa_number: capaNumber || `CAPA-${Date.now()}`,
          capa_type: 'complaint',
          title: `Customer Complaint: ${complaint.complaint_number}`,
          description: complaint.description,
          severity: severity || complaint.severity || 'major',
          source_type: 'complaint',
          source_id: complaintId,
          occurrence_date: complaint.complaint_date,
          discovery_date: complaint.received_date,
          product_id: complaint.product_id,
          created_by: user?.id,
        })
        .select()
        .single();

      if (capaError) throw capaError;

      // Link CAPA to complaint
      await supabase
        .from('customer_complaints')
        .update({ capa_id: capa.id, capa_required: true })
        .eq('id', complaintId);

      return capa;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-complaints'] });
      queryClient.invalidateQueries({ queryKey: ['capas'] });
      toast.success('CAPA created from complaint');
    },
    onError: (error) => {
      console.error('Failed to create CAPA:', error);
      toast.error('Failed to create CAPA');
    },
  });
}

export function useComplaintSettings() {
  return useQuery({
    queryKey: ['complaint-settings'],
    queryFn: async () => {
      // Return default settings - can be expanded with actual settings table
      return {
        autoCreateCapa: ['illness', 'foreign_material', 'allergen'],
        defaultResponseDays: 5,
        requireSampleForCritical: true,
      };
    },
  });
}

// ============================================
// CUSTOMERS & PRODUCTS (for form selects)
// ============================================

export function useCustomers() {
  return useQuery({
    queryKey: ['customers-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, email, phone, contact_name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });
}

export function useProducts() {
  return useQuery({
    queryKey: ['products-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });
}

export function useProfiles() {
  return useQuery({
    queryKey: ['profiles-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .order('first_name');
      if (error) throw error;
      return data;
    },
  });
}
