import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ProductQARequirement {
  id: string;
  product_id: string;
  parameter_name: string;
  target_value: string | null;
  min_value: number | null;
  max_value: number | null;
  uom: string | null;
  required_at_stage: string | null;
  is_critical: boolean;
  test_method: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface ProductQARequirementInput {
  product_id: string;
  parameter_name: string;
  target_value?: string | null;
  min_value?: number | null;
  max_value?: number | null;
  uom?: string | null;
  required_at_stage?: string | null;
  is_critical?: boolean;
  test_method?: string | null;
  sort_order?: number;
}

export function useProductQARequirements(productId: string | null) {
  const queryClient = useQueryClient();

  const { data: requirements = [], isLoading, error } = useQuery({
    queryKey: ["product-qa-requirements", productId],
    queryFn: async () => {
      if (!productId) return [];
      
      const { data, error } = await supabase
        .from("product_qa_requirements")
        .select("*")
        .eq("product_id", productId)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as ProductQARequirement[];
    },
    enabled: !!productId,
  });

  const createRequirement = useMutation({
    mutationFn: async (requirement: ProductQARequirementInput) => {
      const { data, error } = await supabase
        .from("product_qa_requirements")
        .insert(requirement)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-qa-requirements", productId] });
      toast.success("QA requirement added");
    },
    onError: (error: Error) => {
      toast.error(`Failed to add QA requirement: ${error.message}`);
    },
  });

  const updateRequirement = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProductQARequirementInput> & { id: string }) => {
      const { data, error } = await supabase
        .from("product_qa_requirements")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-qa-requirements", productId] });
      toast.success("QA requirement updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update QA requirement: ${error.message}`);
    },
  });

  const deleteRequirement = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("product_qa_requirements")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-qa-requirements", productId] });
      toast.success("QA requirement removed");
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove QA requirement: ${error.message}`);
    },
  });

  const bulkCreateRequirements = useMutation({
    mutationFn: async (requirements: ProductQARequirementInput[]) => {
      const { data, error } = await supabase
        .from("product_qa_requirements")
        .insert(requirements)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-qa-requirements", productId] });
      toast.success("QA requirements added from category defaults");
    },
    onError: (error: Error) => {
      toast.error(`Failed to add QA requirements: ${error.message}`);
    },
  });

  return {
    requirements,
    criticalRequirements: requirements.filter((r) => r.is_critical),
    isLoading,
    error,
    createRequirement,
    updateRequirement,
    deleteRequirement,
    bulkCreateRequirements,
  };
}
