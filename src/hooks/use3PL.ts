import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PickRequest {
  id: string;
  request_number: string;
  request_date: string;
  location_id: string;
  customer_id: string | null;
  status: string;
  priority: string | null;
  requested_by: string | null;
  assigned_to: string | null;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  location?: { name: string };
  customer?: { name: string };
  items?: PickRequestItem[];
}

export interface PickRequestItem {
  id: string;
  pick_request_id: string;
  product_id: string;
  quantity_requested: number;
  quantity_picked: number;
  unit_type: string;
  status: string;
  product?: { name: string; sku: string };
}

export function use3PLLocations() {
  return useQuery({
    queryKey: ['3pl-locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, is_3pl, address_line1, city, state')
        .eq('is_3pl', true)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data;
    },
  });
}

export function use3PLInventory(locationId: string | null) {
  return useQuery({
    queryKey: ['3pl-inventory', locationId],
    queryFn: async () => {
      if (!locationId) return [];

      // Get pallets at this location with their cases
      const { data: pallets, error: palletsError } = await supabase
        .from('pallets')
        .select(`
          id,
          pallet_number,
          build_date,
          status,
          location_id,
          pallet_cases (
            id,
            case_label_id,
            quantity,
            removed_at,
            production_lot:production_lots (
              id,
              lot_number,
              product:products (id, name, sku, upc_code),
              expiry_date
            )
          )
        `)
        .eq('location_id', locationId)
        .is('shipped_at', null)
        .order('build_date', { ascending: false });

      if (palletsError) throw palletsError;
      return pallets;
    },
    enabled: !!locationId,
  });
}

export function usePickRequests(locationId?: string) {
  return useQuery({
    queryKey: ['pick-requests', locationId],
    queryFn: async () => {
      let query = supabase
        .from('pick_requests')
        .select(`
          id,
          request_number,
          request_date,
          location_id,
          customer_id,
          status,
          priority,
          requested_by,
          assigned_to,
          started_at,
          completed_at,
          notes,
          created_at,
          location:locations(name),
          customer:customers(name)
        `)
        .order('created_at', { ascending: false });

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data as PickRequest[];
    },
  });
}

export function usePickRequestItems(pickRequestId: string | null) {
  return useQuery({
    queryKey: ['pick-request-items', pickRequestId],
    queryFn: async () => {
      if (!pickRequestId) return [];

      const { data, error } = await supabase
        .from('pick_request_items')
        .select(`
          id,
          pick_request_id,
          product_id,
          quantity_requested,
          quantity_picked,
          unit_type,
          status,
          product:products(name, sku)
        `)
        .eq('pick_request_id', pickRequestId);

      if (error) throw error;
      return data as PickRequestItem[];
    },
    enabled: !!pickRequestId,
  });
}

export function useCreatePickRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      locationId,
      customerId,
      priority,
      notes,
      items,
    }: {
      locationId: string;
      customerId?: string;
      priority?: string;
      notes?: string;
      items: { productId: string; quantity: number; unitType?: string }[];
    }) => {
      // Generate request number
      const { data: requestNumber, error: numError } = await supabase
        .rpc('generate_pick_request_number');

      if (numError) throw numError;

      // Create pick request
      const { data: pickRequest, error: requestError } = await supabase
        .from('pick_requests')
        .insert({
          request_number: requestNumber,
          location_id: locationId,
          customer_id: customerId || null,
          priority: priority || 'normal',
          notes,
          requested_by: user?.id,
          status: 'pending',
        })
        .select()
        .single();

      if (requestError) throw requestError;

      // Create pick request items
      const itemInserts = items.map((item) => ({
        pick_request_id: pickRequest.id,
        product_id: item.productId,
        quantity_requested: item.quantity,
        unit_type: item.unitType || 'case',
        status: 'pending',
      }));

      const { error: itemsError } = await supabase
        .from('pick_request_items')
        .insert(itemInserts);

      if (itemsError) throw itemsError;

      return pickRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pick-requests'] });
      toast.success('Pick request created');
    },
    onError: (error: Error) => {
      toast.error('Failed to create pick request', {
        description: error.message,
      });
    },
  });
}

export function useRecordPick() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      pickRequestItemId,
      palletId,
      palletCaseId,
      productionLotId,
      quantityPicked,
      scanVerified,
    }: {
      pickRequestItemId: string;
      palletId?: string;
      palletCaseId?: string;
      productionLotId?: string;
      quantityPicked: number;
      scanVerified?: boolean;
    }) => {
      // Record the pick
      const { data: pick, error: pickError } = await supabase
        .from('pick_request_picks')
        .insert({
          pick_request_item_id: pickRequestItemId,
          pallet_id: palletId || null,
          pallet_case_id: palletCaseId || null,
          production_lot_id: productionLotId || null,
          quantity_picked: quantityPicked,
          picked_by: user?.id,
          scan_verified: scanVerified || false,
        })
        .select()
        .single();

      if (pickError) throw pickError;

      // Update the pick request item quantity
      const { data: currentItem } = await supabase
        .from('pick_request_items')
        .select('quantity_picked, quantity_requested')
        .eq('id', pickRequestItemId)
        .single();

      if (currentItem) {
        const newPickedQty = (currentItem.quantity_picked || 0) + quantityPicked;
        const newStatus = newPickedQty >= currentItem.quantity_requested ? 'completed' : 'in_progress';

        await supabase
          .from('pick_request_items')
          .update({
            quantity_picked: newPickedQty,
            status: newStatus,
          })
          .eq('id', pickRequestItemId);
      }

      // Mark case as removed if picking a case
      if (palletCaseId) {
        await supabase
          .from('pallet_cases')
          .update({ removed_at: new Date().toISOString() })
          .eq('id', palletCaseId);
      }

      return pick;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pick-request-items'] });
      queryClient.invalidateQueries({ queryKey: ['3pl-inventory'] });
      toast.success('Pick recorded');
    },
    onError: (error: Error) => {
      toast.error('Failed to record pick', {
        description: error.message,
      });
    },
  });
}

export function useCompletePickRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (pickRequestId: string) => {
      const { data, error } = await supabase
        .from('pick_requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: user?.id,
        })
        .eq('id', pickRequestId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pick-requests'] });
      toast.success('Pick request completed');
    },
    onError: (error: Error) => {
      toast.error('Failed to complete pick request', {
        description: error.message,
      });
    },
  });
}