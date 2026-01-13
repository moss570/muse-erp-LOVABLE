import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ProductSize {
  id: string;
  product_id: string;
  size_name: string;
  size_value: number;
  size_unit_id: string | null;
  upc_code: string | null;
  case_upc_code: string | null;
  units_per_case: number;
  case_weight_kg: number | null;
  case_cube_m3: number | null;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  size_unit?: {
    id: string;
    name: string;
    code: string;
  } | null;
}

interface ProductSizeInput {
  product_id: string;
  size_name: string;
  size_value: number;
  size_unit_id?: string | null;
  upc_code?: string | null;
  case_upc_code?: string | null;
  units_per_case?: number;
  case_weight_kg?: number | null;
  case_cube_m3?: number | null;
  is_default?: boolean;
  is_active?: boolean;
  sort_order?: number;
}

export function useProductSizes(productId: string | null) {
  const queryClient = useQueryClient();

  const { data: sizes = [], isLoading, error } = useQuery({
    queryKey: ["product-sizes", productId],
    queryFn: async () => {
      if (!productId) return [];
      
      const { data, error } = await supabase
        .from("product_sizes")
        .select(`
          *,
          size_unit:units_of_measure(id, name, code)
        `)
        .eq("product_id", productId)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as ProductSize[];
    },
    enabled: !!productId,
  });

  const createSize = useMutation({
    mutationFn: async (size: ProductSizeInput) => {
      const { data, error } = await supabase
        .from("product_sizes")
        .insert(size)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-sizes", productId] });
      toast.success("Product size created");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create size: ${error.message}`);
    },
  });

  const updateSize = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProductSizeInput> & { id: string }) => {
      const { data, error } = await supabase
        .from("product_sizes")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-sizes", productId] });
      toast.success("Product size updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update size: ${error.message}`);
    },
  });

  const deleteSize = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("product_sizes")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-sizes", productId] });
      toast.success("Product size deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete size: ${error.message}`);
    },
  });

  return {
    sizes,
    activeSizes: sizes.filter((s) => s.is_active),
    isLoading,
    error,
    createSize,
    updateSize,
    deleteSize,
  };
}
