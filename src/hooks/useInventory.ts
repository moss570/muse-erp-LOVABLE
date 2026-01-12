import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Types
export interface InventoryLotView {
  receiving_lot_id: string;
  internal_lot_number: string;
  supplier_lot_number: string | null;
  material_id: string;
  material_name: string;
  material_code: string;
  expiry_date: string | null;
  location_id: string;
  location_name: string;
  current_quantity: number;
  container_status: string;
  original_quantity: number;
  unit_code: string;
  unit_name: string;
  expiry_status: 'no_expiry' | 'expired' | 'expiring_soon' | 'good';
}

export interface InventoryTransaction {
  id: string;
  transaction_type: string;
  material_id: string | null;
  product_id: string | null;
  receiving_lot_id: string | null;
  production_lot_id: string | null;
  from_location_id: string | null;
  to_location_id: string | null;
  quantity: number;
  unit_id: string | null;
  reference_type: string | null;
  reference_id: string | null;
  reason_code: string | null;
  notes: string | null;
  performed_by: string | null;
  created_at: string;
}

export interface InventoryMovement {
  id: string;
  movement_type: string;
  status: string;
  source_location_id: string;
  destination_location_id: string;
  requested_by: string | null;
  requested_at: string;
  completed_by: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  source_location?: { id: string; name: string };
  destination_location?: { id: string; name: string };
  items?: InventoryMovementItem[];
}

export interface InventoryMovementItem {
  id: string;
  movement_id: string;
  material_id: string | null;
  receiving_lot_id: string | null;
  quantity_requested: number;
  quantity_moved: number | null;
  unit_id: string;
  scanned_verified: boolean;
}

export interface DisassemblyRecord {
  id: string;
  parent_receiving_lot_id: string;
  material_id: string;
  location_id: string;
  original_purchase_unit_id: string;
  original_quantity: number;
  converted_unit_id: string;
  converted_quantity: number;
  conversion_factor: number;
  remaining_quantity: number;
  container_status: string;
  opened_at: string;
  opened_by: string | null;
  label_printed: boolean;
  notes: string | null;
}

export interface CreateTransactionData {
  transaction_type: string;
  material_id?: string;
  product_id?: string;
  receiving_lot_id?: string;
  production_lot_id?: string;
  from_location_id?: string;
  to_location_id?: string;
  quantity: number;
  unit_id?: string;
  reference_type?: string;
  reference_id?: string;
  reason_code?: string;
  notes?: string;
}

export interface CreateMovementData {
  movement_type: string;
  source_location_id: string;
  destination_location_id: string;
  notes?: string;
  items: {
    material_id?: string;
    receiving_lot_id?: string;
    quantity_requested: number;
    unit_id: string;
  }[];
}

export interface CreateDisassemblyData {
  parent_receiving_lot_id: string;
  material_id: string;
  location_id: string;
  original_purchase_unit_id: string;
  original_quantity: number;
  converted_unit_id: string;
  converted_quantity: number;
  conversion_factor: number;
  notes?: string;
}

export interface CreateAdjustmentData {
  receiving_lot_id?: string;
  production_lot_id?: string;
  disassembly_record_id?: string;
  location_id: string;
  adjustment_type: 'increase' | 'decrease' | 'write_off';
  reason_code: string;
  quantity_before: number;
  quantity_adjusted: number;
  quantity_after: number;
  unit_id: string;
  notes?: string;
  requires_approval?: boolean;
}

export function useInventory() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch inventory by lot and location (FEFO sorted)
  const useInventoryByLot = (filters?: {
    locationId?: string;
    materialId?: string;
    expiryStatus?: string;
    containerStatus?: string;
  }) => {
    return useQuery({
      queryKey: ['inventory-by-lot', filters],
      queryFn: async () => {
        // Use the view for real-time inventory
        const { data, error } = await supabase
          .from('inventory_by_lot_location')
          .select('*')
          .order('expiry_date', { ascending: true, nullsFirst: false });

        if (error) throw error;

        let filtered = data as InventoryLotView[];

        // Apply filters
        if (filters?.locationId) {
          filtered = filtered.filter(lot => lot.location_id === filters.locationId);
        }
        if (filters?.materialId) {
          filtered = filtered.filter(lot => lot.material_id === filters.materialId);
        }
        if (filters?.expiryStatus) {
          filtered = filtered.filter(lot => lot.expiry_status === filters.expiryStatus);
        }
        if (filters?.containerStatus) {
          filtered = filtered.filter(lot => lot.container_status === filters.containerStatus);
        }

        return filtered;
      },
    });
  };

  // Fetch FEFO suggestions for a material
  const useFEFOSuggestions = (materialId: string, requiredQuantity: number) => {
    return useQuery({
      queryKey: ['fefo-suggestions', materialId, requiredQuantity],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('inventory_by_lot_location')
          .select('*')
          .eq('material_id', materialId)
          .gt('current_quantity', 0)
          .order('expiry_date', { ascending: true, nullsFirst: false });

        if (error) throw error;

        const lots = data as InventoryLotView[];
        const suggestions: { lot: InventoryLotView; suggestedQuantity: number }[] = [];
        let remaining = requiredQuantity;

        for (const lot of lots) {
          if (remaining <= 0) break;
          const qty = Math.min(lot.current_quantity, remaining);
          suggestions.push({ lot, suggestedQuantity: qty });
          remaining -= qty;
        }

        return {
          suggestions,
          fulfilled: remaining <= 0,
          shortfall: Math.max(0, remaining),
        };
      },
      enabled: !!materialId && requiredQuantity > 0,
    });
  };

  // Fetch inventory transactions
  const useTransactions = (filters?: {
    receiving_lot_id?: string;
    material_id?: string;
    transaction_type?: string;
    limit?: number;
  }) => {
    return useQuery({
      queryKey: ['inventory-transactions', filters],
      queryFn: async () => {
        let query = supabase
          .from('inventory_transactions')
          .select('*')
          .order('created_at', { ascending: false });

        if (filters?.receiving_lot_id) {
          query = query.eq('receiving_lot_id', filters.receiving_lot_id);
        }
        if (filters?.material_id) {
          query = query.eq('material_id', filters.material_id);
        }
        if (filters?.transaction_type) {
          query = query.eq('transaction_type', filters.transaction_type);
        }
        if (filters?.limit) {
          query = query.limit(filters.limit);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as InventoryTransaction[];
      },
    });
  };

  // Fetch inventory movements
  const useMovements = (status?: string) => {
    return useQuery({
      queryKey: ['inventory-movements', status],
      queryFn: async () => {
        let query = supabase
          .from('inventory_movements')
          .select(`
            *,
            source_location:locations!inventory_movements_source_location_id_fkey(id, name),
            destination_location:locations!inventory_movements_destination_location_id_fkey(id, name)
          `)
          .order('created_at', { ascending: false });

        if (status) {
          query = query.eq('status', status);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as InventoryMovement[];
      },
    });
  };

  // Fetch disassembly records
  const useDisassemblyRecords = (parentLotId?: string) => {
    return useQuery({
      queryKey: ['disassembly-records', parentLotId],
      queryFn: async () => {
        let query = supabase
          .from('disassembly_records')
          .select('*')
          .order('created_at', { ascending: false });

        if (parentLotId) {
          query = query.eq('parent_receiving_lot_id', parentLotId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as DisassemblyRecord[];
      },
    });
  };

  // Create inventory transaction
  const createTransaction = useMutation({
    mutationFn: async (data: CreateTransactionData) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data: result, error } = await supabase
        .from('inventory_transactions')
        .insert({
          ...data,
          performed_by: user?.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-by-lot'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['material-inventory'] });
      toast({ title: 'Transaction recorded successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Create inventory movement (transfer/issue to production)
  const createMovement = useMutation({
    mutationFn: async (data: CreateMovementData) => {
      const { data: user } = await supabase.auth.getUser();

      // Create movement header
      const { data: movement, error: movementError } = await supabase
        .from('inventory_movements')
        .insert({
          movement_type: data.movement_type,
          source_location_id: data.source_location_id,
          destination_location_id: data.destination_location_id,
          notes: data.notes,
          requested_by: user?.user?.id,
          status: 'pending',
        })
        .select()
        .single();

      if (movementError) throw movementError;

      // Create movement items
      const items = data.items.map(item => ({
        movement_id: movement.id,
        material_id: item.material_id,
        receiving_lot_id: item.receiving_lot_id,
        quantity_requested: item.quantity_requested,
        unit_id: item.unit_id,
      }));

      const { error: itemsError } = await supabase
        .from('inventory_movement_items')
        .insert(items);

      if (itemsError) throw itemsError;

      return movement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
      toast({ title: 'Movement created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Complete inventory movement
  const completeMovement = useMutation({
    mutationFn: async ({ movementId, items }: { 
      movementId: string; 
      items: { id: string; quantity_moved: number; scanned_verified: boolean }[] 
    }) => {
      const { data: user } = await supabase.auth.getUser();

      // Update movement items
      for (const item of items) {
        const { error } = await supabase
          .from('inventory_movement_items')
          .update({
            quantity_moved: item.quantity_moved,
            scanned_verified: item.scanned_verified,
            scanned_at: item.scanned_verified ? new Date().toISOString() : null,
            scanned_by: item.scanned_verified ? user?.user?.id : null,
          })
          .eq('id', item.id);

        if (error) throw error;
      }

      // Get movement details to create transactions
      const { data: movement, error: movementError } = await supabase
        .from('inventory_movements')
        .select(`
          *,
          items:inventory_movement_items(*)
        `)
        .eq('id', movementId)
        .single();

      if (movementError) throw movementError;

      // Create inventory transactions for each item
      for (const item of movement.items) {
        if (item.quantity_moved && item.quantity_moved > 0) {
          await supabase.from('inventory_transactions').insert({
            transaction_type: 'transfer',
            material_id: item.material_id,
            receiving_lot_id: item.receiving_lot_id,
            from_location_id: movement.source_location_id,
            to_location_id: movement.destination_location_id,
            quantity: item.quantity_moved,
            unit_id: item.unit_id,
            reference_type: 'movement',
            reference_id: movementId,
            performed_by: user?.user?.id,
          });
        }
      }

      // Update movement status
      const { error: updateError } = await supabase
        .from('inventory_movements')
        .update({
          status: 'completed',
          completed_by: user?.user?.id,
          completed_at: new Date().toISOString(),
        })
        .eq('id', movementId);

      if (updateError) throw updateError;

      return movement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-by-lot'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['material-inventory'] });
      toast({ title: 'Movement completed successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Create disassembly record (open container)
  const createDisassembly = useMutation({
    mutationFn: async (data: CreateDisassemblyData) => {
      const { data: user } = await supabase.auth.getUser();

      // Create disassembly record
      const { data: disassembly, error } = await supabase
        .from('disassembly_records')
        .insert({
          parent_receiving_lot_id: data.parent_receiving_lot_id,
          material_id: data.material_id,
          location_id: data.location_id,
          original_purchase_unit_id: data.original_purchase_unit_id,
          original_quantity: data.original_quantity,
          converted_unit_id: data.converted_unit_id,
          converted_quantity: data.converted_quantity,
          conversion_factor: data.conversion_factor,
          remaining_quantity: data.converted_quantity,
          container_status: 'open',
          opened_by: user?.user?.id,
          notes: data.notes,
        })
        .select()
        .single();

      if (error) throw error;

      // Update the parent receiving lot container status
      await supabase
        .from('receiving_lots')
        .update({ container_status: 'opened' })
        .eq('id', data.parent_receiving_lot_id);

      // Create inventory transaction for disassembly
      await supabase.from('inventory_transactions').insert({
        transaction_type: 'disassembly',
        material_id: data.material_id,
        receiving_lot_id: data.parent_receiving_lot_id,
        to_location_id: data.location_id,
        quantity: data.original_quantity,
        unit_id: data.converted_unit_id,
        reference_type: 'disassembly',
        reference_id: disassembly.id,
        performed_by: user?.user?.id,
        notes: `Opened container: ${data.original_quantity} converted to ${data.converted_quantity}`,
      });

      return disassembly;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disassembly-records'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-by-lot'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['material-inventory'] });
      toast({ title: 'Container opened successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Create inventory adjustment
  const createAdjustment = useMutation({
    mutationFn: async (data: CreateAdjustmentData) => {
      const { data: user } = await supabase.auth.getUser();

      const { data: adjustment, error } = await supabase
        .from('inventory_adjustments')
        .insert({
          ...data,
          adjusted_by: user?.user?.id,
          approval_status: data.requires_approval ? 'pending' : 'approved',
          approved_by: data.requires_approval ? null : user?.user?.id,
          approved_at: data.requires_approval ? null : new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // If auto-approved, create inventory transaction
      if (!data.requires_approval) {
        const transactionQty = data.adjustment_type === 'increase' 
          ? data.quantity_adjusted 
          : -data.quantity_adjusted;

        await supabase.from('inventory_transactions').insert({
          transaction_type: 'adjustment',
          receiving_lot_id: data.receiving_lot_id,
          production_lot_id: data.production_lot_id,
          to_location_id: data.location_id,
          quantity: transactionQty,
          unit_id: data.unit_id,
          reason_code: data.reason_code,
          reference_type: 'adjustment',
          reference_id: adjustment.id,
          performed_by: user?.user?.id,
          notes: data.notes,
        });
      }

      return adjustment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-by-lot'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['material-inventory'] });
      toast({ title: 'Adjustment recorded successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return {
    useInventoryByLot,
    useFEFOSuggestions,
    useTransactions,
    useMovements,
    useDisassemblyRecords,
    createTransaction,
    createMovement,
    completeMovement,
    createDisassembly,
    createAdjustment,
  };
}
