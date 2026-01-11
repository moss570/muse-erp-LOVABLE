import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Invoice {
  id: string;
  purchase_order_id: string;
  supplier_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  subtotal: number;
  tax_amount: number | null;
  total_amount: number;
  payment_status: string;
  payment_date: string | null;
  payment_reference: string | null;
  amount_paid: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  po_item_id: string | null;
  receiving_item_id: string | null;
  material_id: string | null;
  description: string;
  quantity: number;
  unit_cost: number;
  line_total: number | null;
}

export interface AdditionalCost {
  id: string;
  invoice_id: string;
  cost_type: string;
  description: string | null;
  amount: number;
  allocation_method: string;
  allocated_to_item_id: string | null;
  xero_account_code: string | null;
}

export interface CreateInvoiceInput {
  purchase_order_id: string;
  supplier_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date?: string;
  tax_amount?: number;
  freight_amount?: number;
  invoice_type?: 'material' | 'freight';
  notes?: string;
  line_items: {
    po_item_id?: string;
    receiving_item_id?: string;
    material_id?: string;
    description: string;
    quantity: number;
    unit_cost: number;
  }[];
}

export interface CreateAdditionalCostInput {
  invoice_id: string;
  cost_type: string;
  description?: string;
  amount: number;
  allocation_method: string;
  allocated_to_item_id?: string;
  xero_account_code?: string;
}

// Fetch invoices for a PO
export function usePOInvoices(poId?: string) {
  return useQuery({
    queryKey: ['po-invoices', poId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_order_invoices')
        .select(`
          *,
          supplier:suppliers(id, name, code),
          created_by_profile:profiles!purchase_order_invoices_created_by_fkey(first_name, last_name)
        `)
        .eq('purchase_order_id', poId)
        .order('invoice_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!poId,
  });
}

// Fetch single invoice with line items
export function useInvoice(id?: string) {
  return useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_order_invoices')
        .select(`
          *,
          supplier:suppliers(id, name, code),
          purchase_order:purchase_orders(id, po_number),
          created_by_profile:profiles!purchase_order_invoices_created_by_fkey(first_name, last_name)
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

// Fetch invoice line items
export function useInvoiceLineItems(invoiceId?: string) {
  return useQuery({
    queryKey: ['invoice-line-items', invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoice_line_items')
        .select(`
          *,
          material:materials(id, name, code),
          po_item:purchase_order_items(id, quantity_ordered, unit_cost),
          receiving_item:po_receiving_items(id, internal_lot_number, quantity_received)
        `)
        .eq('invoice_id', invoiceId);
      if (error) throw error;
      return data;
    },
    enabled: !!invoiceId,
  });
}

// Fetch additional costs
export function useAdditionalCosts(invoiceId?: string) {
  return useQuery({
    queryKey: ['additional-costs', invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoice_additional_costs')
        .select('*')
        .eq('invoice_id', invoiceId);
      if (error) throw error;
      return data;
    },
    enabled: !!invoiceId,
  });
}

// Fetch landed cost allocations
export function useLandedCostAllocations(invoiceId?: string) {
  return useQuery({
    queryKey: ['landed-cost-allocations', invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('landed_cost_allocations')
        .select(`
          *,
          receiving_lot:receiving_lots(
            id, 
            internal_lot_number, 
            material:materials(name, code),
            quantity_in_base_unit
          )
        `)
        .eq('invoice_id', invoiceId);
      if (error) throw error;
      return data;
    },
    enabled: !!invoiceId,
  });
}

// Create invoice with line items
export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateInvoiceInput) => {
      const { data: { user } } = await supabase.auth.getUser();

      // Calculate subtotal from line items
      const subtotal = input.line_items.reduce(
        (sum, item) => sum + item.quantity * item.unit_cost,
        0
      );
      const totalAmount = subtotal + (input.tax_amount || 0) + (input.freight_amount || 0);

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('purchase_order_invoices')
        .insert({
          purchase_order_id: input.purchase_order_id,
          supplier_id: input.supplier_id,
          invoice_number: input.invoice_number,
          invoice_date: input.invoice_date,
          due_date: input.due_date,
          subtotal,
          tax_amount: input.tax_amount,
          freight_amount: input.freight_amount || 0,
          invoice_type: input.invoice_type || 'material',
          total_amount: totalAmount,
          notes: input.notes,
          created_by: user?.id,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create line items (line_total is a generated column, don't include it)
      if (input.line_items.length > 0) {
        const lineItems = input.line_items.map((item) => ({
          invoice_id: invoice.id,
          po_item_id: item.po_item_id || null,
          receiving_item_id: item.receiving_item_id || null,
          material_id: item.material_id || null,
          description: item.description,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
        }));

        const { error: lineError } = await supabase
          .from('invoice_line_items')
          .insert(lineItems);

        if (lineError) throw lineError;
      }

      return invoice;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['po-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', data.id] });
      toast.success('Invoice created successfully');
    },
    onError: (error: Error & { code?: string }) => {
      // Check for duplicate invoice number constraint violation
      if (error.message?.includes('purchase_order_invoices_supplier_id_invoice_number_key') || 
          error.message?.includes('duplicate key value')) {
        toast.error('Duplicate Invoice Number', {
          description: 'An invoice with this number already exists for this supplier. Please use a different invoice number.',
        });
      } else {
        toast.error('Failed to create invoice', {
          description: error.message,
        });
      }
    },
  });
}

// Add additional cost
export function useAddAdditionalCost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAdditionalCostInput) => {
      const { data, error } = await supabase
        .from('invoice_additional_costs')
        .insert({
          invoice_id: input.invoice_id,
          cost_type: input.cost_type,
          description: input.description,
          amount: input.amount,
          allocation_method: input.allocation_method,
          allocated_to_item_id: input.allocated_to_item_id,
          xero_account_code: input.xero_account_code,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['additional-costs', data.invoice_id] });
      queryClient.invalidateQueries({ queryKey: ['invoice', data.invoice_id] });
      toast.success('Additional cost added');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add cost: ${error.message}`);
    },
  });
}

// Delete additional cost
export function useDeleteAdditionalCost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, invoiceId }: { id: string; invoiceId: string }) => {
      const { error } = await supabase
        .from('invoice_additional_costs')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { invoiceId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['additional-costs', data.invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoice', data.invoiceId] });
      toast.success('Additional cost removed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove cost: ${error.message}`);
    },
  });
}

// Calculate landed costs (calls database function)
export function useCalculateLandedCosts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const { error } = await supabase.rpc('calculate_landed_costs', {
        p_invoice_id: invoiceId,
      });
      if (error) throw error;
    },
    onSuccess: (_, invoiceId) => {
      queryClient.invalidateQueries({ queryKey: ['landed-cost-allocations', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
      toast.success('Landed costs calculated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to calculate landed costs: ${error.message}`);
    },
  });
}

// Update invoice payment
export function useUpdateInvoicePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payment_status,
      payment_date,
      payment_reference,
      amount_paid,
    }: {
      id: string;
      payment_status: string;
      payment_date?: string;
      payment_reference?: string;
      amount_paid?: number;
    }) => {
      const { data, error } = await supabase
        .from('purchase_order_invoices')
        .update({
          payment_status,
          payment_date,
          payment_reference,
          amount_paid,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['po-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', data.id] });
      toast.success('Payment updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update payment: ${error.message}`);
    },
  });
}

// Approve invoice and calculate landed costs
export function useApproveInvoice() {
  const queryClient = useQueryClient();
  const calculateLandedCosts = useCalculateLandedCosts();

  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('purchase_order_invoices')
        .update({
          approval_status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
        })
        .eq('id', invoiceId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      // Calculate landed costs after approval
      try {
        await calculateLandedCosts.mutateAsync(data.id);
      } catch (e) {
        console.error('Failed to calculate landed costs:', e);
      }
      
      queryClient.invalidateQueries({ queryKey: ['po-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', data.id] });
      toast.success('Invoice approved and landed costs calculated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to approve invoice: ${error.message}`);
    },
  });
}

// Link freight invoice to material invoice
export function useLinkFreightInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      materialInvoiceId,
      freightInvoiceId,
      allocationAmount,
    }: {
      materialInvoiceId: string;
      freightInvoiceId: string;
      allocationAmount?: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('invoice_freight_links')
        .insert({
          material_invoice_id: materialInvoiceId,
          freight_invoice_id: freightInvoiceId,
          allocation_amount: allocationAmount,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoice-freight-links', variables.materialInvoiceId] });
      toast.success('Freight invoice linked');
    },
    onError: (error: Error) => {
      toast.error(`Failed to link freight invoice: ${error.message}`);
    },
  });
}

// Get linked freight invoices for a material invoice
export function useLinkedFreightInvoices(materialInvoiceId?: string) {
  return useQuery({
    queryKey: ['invoice-freight-links', materialInvoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoice_freight_links')
        .select(`
          *,
          freight_invoice:purchase_order_invoices!invoice_freight_links_freight_invoice_id_fkey(
            id, invoice_number, invoice_date, total_amount, supplier:suppliers(name)
          )
        `)
        .eq('material_invoice_id', materialInvoiceId);

      if (error) throw error;
      return data;
    },
    enabled: !!materialInvoiceId,
  });
}

// Get available freight invoices (for linking)
export function useAvailableFreightInvoices(supplierId?: string) {
  return useQuery({
    queryKey: ['freight-invoices', supplierId],
    queryFn: async () => {
      let query = supabase
        .from('purchase_order_invoices')
        .select(`
          *,
          supplier:suppliers(id, name, code)
        `)
        .eq('invoice_type', 'freight')
        .order('invoice_date', { ascending: false });

      // Optionally filter by supplier if you want matching supplier
      // if (supplierId) {
      //   query = query.eq('supplier_id', supplierId);
      // }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: true,
  });
}

// Delete invoice
export function useDeleteInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceId: string) => {
      // First delete line items
      const { error: lineError } = await supabase
        .from('invoice_line_items')
        .delete()
        .eq('invoice_id', invoiceId);
      if (lineError) throw lineError;

      // Delete additional costs
      const { error: costsError } = await supabase
        .from('invoice_additional_costs')
        .delete()
        .eq('invoice_id', invoiceId);
      if (costsError) throw costsError;

      // Delete freight links
      const { error: linksError } = await supabase
        .from('invoice_freight_links')
        .delete()
        .or(`material_invoice_id.eq.${invoiceId},freight_invoice_id.eq.${invoiceId}`);
      if (linksError) throw linksError;

      // Delete landed cost allocations
      const { error: landedError } = await supabase
        .from('landed_cost_allocations')
        .delete()
        .eq('invoice_id', invoiceId);
      if (landedError) throw landedError;

      // Finally delete the invoice
      const { error } = await supabase
        .from('purchase_order_invoices')
        .delete()
        .eq('id', invoiceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['po-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoiced-quantities'] });
      toast.success('Invoice deleted');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete invoice', {
        description: error.message,
      });
    },
  });
}

// Cost types for additional costs dropdown
export const COST_TYPES = [
  { value: 'freight', label: 'Freight/Shipping' },
  { value: 'duty', label: 'Customs Duty' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'handling', label: 'Handling Fees' },
  { value: 'brokerage', label: 'Customs Brokerage' },
  { value: 'storage', label: 'Storage' },
  { value: 'inspection', label: 'Inspection Fees' },
  { value: 'other', label: 'Other' },
];

// Allocation methods
export const ALLOCATION_METHODS = [
  { value: 'proportional', label: 'Proportional (by value)' },
  { value: 'quantity', label: 'By Quantity' },
  { value: 'specific', label: 'Specific Item' },
];
