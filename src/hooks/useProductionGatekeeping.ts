import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UnapprovedMaterial {
  material_id: string;
  material_name: string;
  material_code: string;
  approval_status: string | null;
}

interface RecipeGatekeepingResult {
  canProduce: boolean;
  unapprovedMaterials: UnapprovedMaterial[];
  isLoading: boolean;
}

/**
 * Hook to check if all materials in a recipe are approved for production
 */
export function useRecipeGatekeeping(recipeId: string | undefined): RecipeGatekeepingResult {
  const { data, isLoading } = useQuery({
    queryKey: ['recipe-gatekeeping', recipeId],
    queryFn: async () => {
      if (!recipeId) return { canProduce: false, unapprovedMaterials: [] };

      // Fetch recipe items with their materials
      const { data: recipeItems, error } = await supabase
        .from('product_recipe_items')
        .select(`
          material_id,
          material:materials (
            id,
            name,
            code,
            approval_status
          )
        `)
        .eq('recipe_id', recipeId);

      if (error) throw error;

      // Find materials that are not approved
      const unapprovedMaterials: UnapprovedMaterial[] = [];
      
      for (const item of recipeItems || []) {
        const material = item.material as any;
        if (material && material.approval_status !== 'Approved') {
          unapprovedMaterials.push({
            material_id: material.id,
            material_name: material.name,
            material_code: material.code,
            approval_status: material.approval_status,
          });
        }
      }

      return {
        canProduce: unapprovedMaterials.length === 0,
        unapprovedMaterials,
      };
    },
    enabled: !!recipeId,
  });

  return {
    canProduce: data?.canProduce ?? false,
    unapprovedMaterials: data?.unapprovedMaterials ?? [],
    isLoading,
  };
}

/**
 * Hook to check if a production lot is approved for shipment
 */
export function useProductionLotShipmentCheck(lotId: string | undefined) {
  return useQuery({
    queryKey: ['production-lot-shipment-check', lotId],
    queryFn: async () => {
      if (!lotId) return { canShip: false, status: null };

      const { data, error } = await supabase
        .from('production_lots')
        .select('id, lot_number, approval_status')
        .eq('id', lotId)
        .single();

      if (error) throw error;

      return {
        canShip: data?.approval_status === 'Approved',
        status: data?.approval_status,
        lotNumber: data?.lot_number,
      };
    },
    enabled: !!lotId,
  });
}

/**
 * Hook to check if a receiving lot is approved for production use
 */
export function useReceivingLotApprovalCheck(lotId: string | undefined) {
  return useQuery({
    queryKey: ['receiving-lot-approval-check', lotId],
    queryFn: async () => {
      if (!lotId) return { canUse: false, status: null };

      // Get receiving lot and its session's approval status
      const { data: lot, error } = await supabase
        .from('receiving_lots')
        .select(`
          id,
          internal_lot_number,
          material:materials (
            id,
            name,
            approval_status
          )
        `)
        .eq('id', lotId)
        .single();

      if (error) throw error;

      const materialApproved = (lot?.material as any)?.approval_status === 'Approved';

      return {
        canUse: materialApproved,
        materialApproved,
        lotNumber: lot?.internal_lot_number,
        materialName: (lot?.material as any)?.name,
      };
    },
    enabled: !!lotId,
  });
}

/**
 * Hook to get all unapproved materials that would block production
 */
export function useUnapprovedMaterialsForProduction() {
  return useQuery({
    queryKey: ['unapproved-materials-blocking-production'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('materials')
        .select('id, name, code, approval_status, category')
        .eq('is_active', true)
        .or('approval_status.is.null,approval_status.neq.Approved')
        .order('name');

      if (error) throw error;

      return data.map(m => ({
        id: m.id,
        name: m.name,
        code: m.code,
        status: m.approval_status || 'Draft',
        category: m.category,
      }));
    },
  });
}

/**
 * Hook to get production lots that are not approved for shipment
 */
export function useUnapprovedProductionLots(dateFilter?: string) {
  return useQuery({
    queryKey: ['unapproved-production-lots', dateFilter],
    queryFn: async () => {
      let query = supabase
        .from('production_lots')
        .select(`
          id,
          lot_number,
          production_date,
          approval_status,
          status,
          product:products (name, sku)
        `)
        .or('approval_status.is.null,approval_status.neq.Approved')
        .order('production_date', { ascending: false });

      if (dateFilter) {
        query = query.eq('production_date', dateFilter);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;

      return data.map(lot => ({
        id: lot.id,
        lotNumber: lot.lot_number,
        productionDate: lot.production_date,
        approvalStatus: lot.approval_status || 'Draft',
        status: lot.status,
        productName: (lot.product as any)?.name,
        productSku: (lot.product as any)?.sku,
      }));
    },
  });
}
