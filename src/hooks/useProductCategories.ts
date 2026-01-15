import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export interface QAParameter {
  name: string;
  uom: string;
  required_at: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  code: string;
  description: string | null;
  qa_parameters: QAParameter[];
  spec_sheet_sections: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProductCategoryInput {
  name: string;
  code: string;
  sku_prefix?: string | null;
  description?: string | null;
  qa_parameters?: Json;
  spec_sheet_sections?: Json;
  is_active?: boolean;
  sort_order?: number;
}

export function useProductCategories() {
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading, error } = useQuery({
    queryKey: ["product-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_categories")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      
      // Transform the data to match our interface
      return (data || []).map((item) => ({
        ...item,
        qa_parameters: (Array.isArray(item.qa_parameters) ? item.qa_parameters : []) as unknown as QAParameter[],
        spec_sheet_sections: (Array.isArray(item.spec_sheet_sections) ? item.spec_sheet_sections : []) as unknown as string[],
      })) as ProductCategory[];
    },
  });

  const createCategory = useMutation({
    mutationFn: async (category: ProductCategoryInput) => {
      const { data, error } = await supabase
        .from("product_categories")
        .insert({
          ...category,
          qa_parameters: category.qa_parameters || [],
          spec_sheet_sections: category.spec_sheet_sections || [],
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      toast.success("Product category created");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create category: ${error.message}`);
    },
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, ...updates }: ProductCategoryInput & { id: string }) => {
      const { data, error } = await supabase
        .from("product_categories")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      toast.success("Product category updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update category: ${error.message}`);
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("product_categories")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      toast.success("Product category deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete category: ${error.message}`);
    },
  });

  return {
    categories,
    activeCategories: categories.filter((c) => c.is_active),
    isLoading,
    error,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}
