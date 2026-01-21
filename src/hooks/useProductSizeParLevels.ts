import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ProductSizeParLevel {
  id: string;
  product_size_id: string;
  location_id: string;
  inventory_type: "CASE" | "PALLET";
  par_level: number;
  reorder_point: number | null;
  max_stock: number | null;
  created_at: string;
  updated_at: string;
  location?: {
    id: string;
    name: string;
    location_code: string;
    location_type: string;
  };
}

export interface ParLevelInput {
  location_id: string;
  par_level: number;
  reorder_point?: number | null;
  max_stock?: number | null;
}

export function useProductSizeParLevels(productSizeId: string | null) {
  const queryClient = useQueryClient();

  const { data: parLevels = [], isLoading, error } = useQuery({
    queryKey: ["product-size-par-levels", productSizeId],
    queryFn: async () => {
      if (!productSizeId) return [];
      
      const { data, error } = await supabase
        .from("product_size_par_levels")
        .select(`
          *,
          location:locations(id, name, location_code, location_type)
        `)
        .eq("product_size_id", productSizeId)
        .order("inventory_type");

      if (error) throw error;
      return data as ProductSizeParLevel[];
    },
    enabled: !!productSizeId,
  });

  const caseParLevels = parLevels.filter((p) => p.inventory_type === "CASE");
  const palletParLevels = parLevels.filter((p) => p.inventory_type === "PALLET");

  const upsertParLevel = useMutation({
    mutationFn: async ({
      productSizeId,
      inventoryType,
      locationId,
      parLevel,
      reorderPoint,
      maxStock,
    }: {
      productSizeId: string;
      inventoryType: "CASE" | "PALLET";
      locationId: string;
      parLevel: number;
      reorderPoint?: number | null;
      maxStock?: number | null;
    }) => {
      const { data, error } = await supabase
        .from("product_size_par_levels")
        .upsert(
          {
            product_size_id: productSizeId,
            location_id: locationId,
            inventory_type: inventoryType,
            par_level: parLevel,
            reorder_point: reorderPoint ?? null,
            max_stock: maxStock ?? null,
          },
          {
            onConflict: "product_size_id,location_id,inventory_type",
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-size-par-levels", productSizeId] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to save par level: ${error.message}`);
    },
  });

  const deleteParLevel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("product_size_par_levels")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-size-par-levels", productSizeId] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete par level: ${error.message}`);
    },
  });

  const saveAllParLevels = async (
    sizeId: string,
    caseInputs: ParLevelInput[],
    palletInputs: ParLevelInput[]
  ) => {
    // Get current par levels for comparison
    const { data: currentLevels, error: fetchError } = await supabase
      .from("product_size_par_levels")
      .select("id, location_id, inventory_type")
      .eq("product_size_id", sizeId);

    if (fetchError) throw fetchError;

    const currentCases = currentLevels?.filter((l) => l.inventory_type === "CASE") || [];
    const currentPallets = currentLevels?.filter((l) => l.inventory_type === "PALLET") || [];

    // Determine which to delete
    const caseLocationIds = new Set(caseInputs.map((c) => c.location_id));
    const palletLocationIds = new Set(palletInputs.map((p) => p.location_id));

    const casesToDelete = currentCases.filter((c) => !caseLocationIds.has(c.location_id));
    const palletsToDelete = currentPallets.filter((p) => !palletLocationIds.has(p.location_id));

    // Delete removed items
    for (const item of [...casesToDelete, ...palletsToDelete]) {
      await supabase.from("product_size_par_levels").delete().eq("id", item.id);
    }

    // Upsert all current inputs
    const upserts = [
      ...caseInputs.map((c) => ({
        product_size_id: sizeId,
        location_id: c.location_id,
        inventory_type: "CASE" as const,
        par_level: c.par_level,
        reorder_point: c.reorder_point ?? null,
        max_stock: c.max_stock ?? null,
      })),
      ...palletInputs.map((p) => ({
        product_size_id: sizeId,
        location_id: p.location_id,
        inventory_type: "PALLET" as const,
        par_level: p.par_level,
        reorder_point: p.reorder_point ?? null,
        max_stock: p.max_stock ?? null,
      })),
    ];

    if (upserts.length > 0) {
      const { error } = await supabase
        .from("product_size_par_levels")
        .upsert(upserts, { onConflict: "product_size_id,location_id,inventory_type" });

      if (error) throw error;
    }

    queryClient.invalidateQueries({ queryKey: ["product-size-par-levels", sizeId] });
  };

  return {
    parLevels,
    caseParLevels,
    palletParLevels,
    isLoading,
    error,
    upsertParLevel,
    deleteParLevel,
    saveAllParLevels,
  };
}

// Hook to fetch locations filtered by type for par level dropdowns
export function useParLevelLocations() {
  // Locations for CASE par levels: 3PL or Freezer
  const { data: caseLocations = [], isLoading: loadingCase } = useQuery({
    queryKey: ["locations-for-case-par"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("id, name, location_code, location_type")
        .in("location_type", ["3pl", "freezer"])
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  // Locations for PALLET par levels: 3PL only
  const { data: palletLocations = [], isLoading: loadingPallet } = useQuery({
    queryKey: ["locations-for-pallet-par"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("id, name, location_code, location_type")
        .eq("location_type", "3pl")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  return {
    caseLocations,
    palletLocations,
    isLoading: loadingCase || loadingPallet,
  };
}
