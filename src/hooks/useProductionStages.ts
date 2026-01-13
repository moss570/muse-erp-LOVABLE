import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ProductionStage = "base" | "flavoring" | "finished";

export interface ApprovedParentLot {
  id: string;
  lot_number: string;
  production_date: string;
  quantity_available: number;
  product: {
    id: string;
    name: string;
    sku: string;
  } | null;
  production_stage: string;
}

// Fetch products that can be produced at a given stage
export function useProductsByStage(stage: ProductionStage) {
  return useQuery({
    queryKey: ["products-by-stage", stage],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("id, name, sku, is_active, approval_status, requires_base_stage, base_product_id")
        .eq("is_active", true)
        .eq("approval_status", "Approved");

      if (stage === "base") {
        // Base stage: products that ARE base products (other products reference them)
        // or products marked as requiring base stage
        query = query.eq("requires_base_stage", true);
      } else if (stage === "flavoring") {
        // Flavoring stage: products that have a base_product_id (they're made from a base)
        query = query.not("base_product_id", "is", null);
      }
      // For 'finished' stage, show all approved products (default behavior)

      const { data, error } = await query.order("name");
      if (error) throw error;
      return data;
    },
  });
}

// Fetch approved base lots available for flavoring
export function useApprovedBaseLots(baseProductId: string | null) {
  return useQuery({
    queryKey: ["approved-base-lots", baseProductId],
    queryFn: async () => {
      if (!baseProductId) return [];

      const { data, error } = await supabase
        .from("production_lots")
        .select(`
          id,
          lot_number,
          production_date,
          quantity_available,
          production_stage,
          product:products!production_lots_product_id_fkey(id, name, sku)
        `)
        .eq("product_id", baseProductId)
        .eq("production_stage", "base")
        .eq("approval_status", "Approved")
        .gt("quantity_available", 0)
        .order("production_date", { ascending: true });

      if (error) throw error;
      return data as ApprovedParentLot[];
    },
    enabled: !!baseProductId,
  });
}

// Fetch approved flavored lots available for tubbing/finishing
export function useApprovedFlavoredLots(flavoredProductId: string | null) {
  return useQuery({
    queryKey: ["approved-flavored-lots", flavoredProductId],
    queryFn: async () => {
      if (!flavoredProductId) return [];

      const { data, error } = await supabase
        .from("production_lots")
        .select(`
          id,
          lot_number,
          production_date,
          quantity_available,
          production_stage,
          product:products!production_lots_product_id_fkey(id, name, sku)
        `)
        .eq("product_id", flavoredProductId)
        .eq("production_stage", "flavoring")
        .eq("approval_status", "Approved")
        .gt("quantity_available", 0)
        .order("production_date", { ascending: true });

      if (error) throw error;
      return data as ApprovedParentLot[];
    },
    enabled: !!flavoredProductId,
  });
}

// Get child lots for a parent lot (for traceability)
export function useChildLots(parentLotId: string | null) {
  return useQuery({
    queryKey: ["child-lots", parentLotId],
    queryFn: async () => {
      if (!parentLotId) return [];

      const { data, error } = await supabase
        .from("production_lots")
        .select(`
          id,
          lot_number,
          production_date,
          quantity_produced,
          quantity_consumed_from_parent,
          production_stage,
          approval_status,
          product:products!production_lots_product_id_fkey(id, name, sku)
        `)
        .eq("parent_production_lot_id", parentLotId)
        .order("production_date");

      if (error) throw error;
      return data;
    },
    enabled: !!parentLotId,
  });
}
