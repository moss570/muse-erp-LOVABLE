import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface ReceivingSession {
  id: string;
  receiving_number: string;
  purchase_order_id: string;
  received_date: string;
  status: string;
  location_id: string | null;
  received_by: string | null;
  carrier_name: string | null;
  truck_number: string | null;
  trailer_number: string | null;
  driver_name: string | null;
  seal_number: string | null;
  seal_intact: boolean | null;
  inspection_passed: boolean | null;
  inspection_notes: string | null;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  purchase_order?: {
    po_number: string;
    supplier: {
      id: string;
      name: string;
      code: string;
    };
  };
  location?: {
    name: string;
    location_code: string;
  };
  received_by_profile?: {
    first_name: string;
    last_name: string;
  };
}

export interface ReceivingItem {
  id: string;
  receiving_session_id: string;
  po_item_id: string;
  quantity_received: number;
  quantity_in_base_unit: number;
  unit_id: string;
  internal_lot_number: string;
  supplier_lot_number: string | null;
  manufacture_date: string | null;
  expiry_date: string | null;
  temperature_reading: number | null;
  temperature_unit: string | null;
  temperature_in_range: boolean | null;
  inspection_status: string | null;
  rejection_reason: string | null;
  notes: string | null;
  receiving_lot_id: string | null;
  po_item?: {
    material: {
      id: string;
      name: string;
      code: string;
      receiving_temperature_min: number | null;
      receiving_temperature_max: number | null;
    };
    unit: {
      id: string;
      code: string;
      name: string;
    };
    quantity_ordered: number;
    quantity_received: number;
  };
  unit?: {
    id: string;
    code: string;
    name: string;
  };
}

export interface CreateReceivingSessionData {
  purchase_order_id: string;
  received_date?: string;
  location_id?: string;
  carrier_name?: string;
  truck_number?: string;
  trailer_number?: string;
  driver_name?: string;
  seal_number?: string;
  seal_intact?: boolean;
  truck_temperature_type?: string;
  truck_temperature_setting?: number;
  inspection_pest_free?: boolean;
  inspection_debris_free?: boolean;
  notes?: string;
}

export interface CreateReceivingItemData {
  receiving_session_id: string;
  po_item_id: string;
  quantity_received: number;
  quantity_in_base_unit: number;
  unit_id: string;
  supplier_lot_number?: string;
  manufacture_date?: string;
  expiry_date?: string;
  temperature_reading?: number;
  temperature_unit?: string;
  temperature_in_range?: boolean;
  inspection_status?: string;
  rejection_reason?: string;
  notes?: string;
}

export function useReceiving() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all receiving sessions with filters
  const useSessions = (filters?: { status?: string; supplierId?: string; search?: string }) => {
    return useQuery({
      queryKey: ['receiving-sessions', filters],
      queryFn: async () => {
        let query = supabase
          .from('po_receiving_sessions')
          .select(`
            *,
            purchase_order:purchase_orders(
              po_number,
              supplier:suppliers(id, name, code)
            ),
            location:locations(name, location_code),
            received_by_profile:profiles!po_receiving_sessions_received_by_fkey(first_name, last_name)
          `)
          .order('received_date', { ascending: false });

        if (filters?.status) {
          query = query.eq('status', filters.status);
        }

        if (filters?.search) {
          query = query.or(`receiving_number.ilike.%${filters.search}%`);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as ReceivingSession[];
      },
    });
  };

  // Fetch single session with items
  const useSession = (sessionId: string | undefined) => {
    return useQuery({
      queryKey: ['receiving-session', sessionId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('po_receiving_sessions')
          .select(`
            *,
            purchase_order:purchase_orders(
              id,
              po_number,
              supplier:suppliers(id, name, code)
            ),
            location:locations(id, name, location_code),
            received_by_profile:profiles!po_receiving_sessions_received_by_fkey(first_name, last_name)
          `)
          .eq('id', sessionId)
          .single();
        if (error) throw error;
        return data as ReceivingSession;
      },
      enabled: !!sessionId,
    });
  };

  // Fetch receiving items for a session
  const useSessionItems = (sessionId: string | undefined) => {
    return useQuery({
      queryKey: ['receiving-items', sessionId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('po_receiving_items')
          .select(`
            *,
            po_item:purchase_order_items(
              material:materials(id, name, code, receiving_temperature_min, receiving_temperature_max),
              unit:units_of_measure(id, code, name),
              quantity_ordered,
              quantity_received
            ),
            unit:units_of_measure(id, code, name)
          `)
          .eq('receiving_session_id', sessionId)
          .order('created_at');
        if (error) throw error;
        return data as ReceivingItem[];
      },
      enabled: !!sessionId,
    });
  };

  // Create receiving session
  const createSession = useMutation({
    mutationFn: async (data: CreateReceivingSessionData) => {
      // Generate receiving number
      const { data: receivingNumber, error: numError } = await supabase
        .rpc('generate_receiving_number', { p_received_date: data.received_date || new Date().toISOString().split('T')[0] });
      if (numError) throw numError;

      const { data: session, error } = await supabase
        .from('po_receiving_sessions')
        .insert({
          ...data,
          receiving_number: receivingNumber,
          received_by: user?.id,
          status: 'in_progress',
        })
        .select()
        .single();
      if (error) throw error;
      return session;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receiving-sessions'] });
      toast({ title: 'Receiving session started' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Add receiving item
  const addItem = useMutation({
    mutationFn: async (data: CreateReceivingItemData) => {
      // Generate internal lot number
      const { data: lotNumber, error: lotError } = await supabase
        .rpc('generate_receiving_lot_number', { p_received_date: new Date().toISOString().split('T')[0] });
      if (lotError) throw lotError;

      const { data: item, error } = await supabase
        .from('po_receiving_items')
        .insert({
          ...data,
          internal_lot_number: lotNumber,
        })
        .select()
        .single();
      if (error) throw error;

      // Note: quantity_received on purchase_order_items is maintained by a DB trigger
      // (based on sum(po_receiving_items.quantity_received)). Do not update it here.
      return item;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['receiving-items', variables.receiving_session_id] });
      queryClient.invalidateQueries({ queryKey: ['po-items'] });
      // Invalidate all po-items-for-receiving queries (regardless of poId)
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey[0] === 'po-items-for-receiving'
      });
      toast({ title: 'Item received' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Update receiving item
  const updateItem = useMutation({
    mutationFn: async ({ id, sessionId, ...data }: { id: string; sessionId: string } & Partial<ReceivingItem>) => {
      const { data: item, error } = await supabase
        .from('po_receiving_items')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { item, sessionId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['receiving-items', result.sessionId] });
      toast({ title: 'Item updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Delete receiving item
  const deleteItem = useMutation({
    mutationFn: async ({ id, sessionId }: { id: string; sessionId: string }) => {
      // Delete the receiving item
      const { error } = await supabase
        .from('po_receiving_items')
        .delete()
        .eq('id', id);
      if (error) throw error;

      // Note: purchase_order_items.quantity_received is maintained by a DB trigger
      // so removing a receiving item will automatically recalc totals.

      return { sessionId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['receiving-items', result.sessionId] });
      // Invalidate all po-items-for-receiving queries (regardless of poId)
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey[0] === 'po-items-for-receiving'
      });
      toast({ title: 'Item removed' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Complete receiving session
  const completeSession = useMutation({
    mutationFn: async ({ sessionId, inspectionPassed, inspectionNotes }: { sessionId: string; inspectionPassed: boolean; inspectionNotes?: string }) => {
      // First, create receiving lots for each item
      const { data: items, error: itemsError } = await supabase
        .from('po_receiving_items')
        .select(`
          *,
          po_item:purchase_order_items(
            material_id,
            unit_id
          )
        `)
        .eq('receiving_session_id', sessionId);
      if (itemsError) throw itemsError;

      // Get session to get location_id
      const { data: session, error: sessionError } = await supabase
        .from('po_receiving_sessions')
        .select('location_id, purchase_order_id, received_date')
        .eq('id', sessionId)
        .single();
      if (sessionError) throw sessionError;

      // Get PO to get supplier_id
      const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .select('supplier_id')
        .eq('id', session.purchase_order_id)
        .single();
      if (poError) throw poError;

      // Create receiving lots for each approved item
      for (const item of items) {
        if (item.inspection_status !== 'rejected') {
          const { data: lot, error: lotError } = await supabase
            .from('receiving_lots')
            .insert({
              internal_lot_number: item.internal_lot_number,
              material_id: item.po_item.material_id,
              supplier_id: po.supplier_id,
              supplier_lot_number: item.supplier_lot_number,
              received_date: session.received_date,
              expiry_date: item.expiry_date,
              quantity_received: item.quantity_received,
              quantity_in_base_unit: item.quantity_in_base_unit,
              unit_id: item.unit_id,
              location_id: session.location_id,
              status: item.inspection_status === 'hold' ? 'hold' : 'available',
              notes: item.notes,
            })
            .select()
            .single();
          if (lotError) throw lotError;

          // Link receiving item to lot
          await supabase
            .from('po_receiving_items')
            .update({ receiving_lot_id: lot.id })
            .eq('id', item.id);
        }
      }

      // Update session status
      const { error: updateError } = await supabase
        .from('po_receiving_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          inspection_passed: inspectionPassed,
          inspection_notes: inspectionNotes,
        })
        .eq('id', sessionId);
      if (updateError) throw updateError;

      // Check if PO is fully received and update status
      const { data: poItems, error: poItemsError } = await supabase
        .from('purchase_order_items')
        .select('quantity_ordered, quantity_received')
        .eq('purchase_order_id', session.purchase_order_id);
      if (poItemsError) throw poItemsError;

      const allFullyReceived = poItems.every(item => item.quantity_received >= item.quantity_ordered);
      const anyReceived = poItems.some(item => item.quantity_received > 0);

      const newStatus = allFullyReceived ? 'received' : (anyReceived ? 'partially_received' : undefined);
      if (newStatus) {
        await supabase
          .from('purchase_orders')
          .update({ status: newStatus })
          .eq('id', session.purchase_order_id);
      }

      return { sessionId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receiving-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['receiving-items'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['receiving-lots'] });
      toast({ title: 'Receiving completed', description: 'Inventory has been updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Cancel receiving session
  const cancelSession = useMutation({
    mutationFn: async (sessionId: string) => {
      // Delete all items first
      const { error: deleteError } = await supabase
        .from('po_receiving_items')
        .delete()
        .eq('receiving_session_id', sessionId);
      if (deleteError) throw deleteError;

      // Delete session
      const { error } = await supabase
        .from('po_receiving_sessions')
        .delete()
        .eq('id', sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receiving-sessions'] });
      toast({ title: 'Receiving session cancelled' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return {
    useSessions,
    useSession,
    useSessionItems,
    createSession,
    addItem,
    updateItem,
    deleteItem,
    completeSession,
    cancelSession,
  };
}
