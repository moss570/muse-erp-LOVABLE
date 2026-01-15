import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ContainerSize {
  id: string;
  name: string;
  volume_gallons: number;
  sku_code: string;
  target_weight_kg: number | null;
  min_weight_kg: number | null;
  max_weight_kg: number | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContainerSizeInput {
  name: string;
  volume_gallons: number;
  sku_code: string;
  target_weight_kg?: number | null;
  min_weight_kg?: number | null;
  max_weight_kg?: number | null;
  sort_order?: number;
  is_active?: boolean;
}

export function useContainerSizes() {
  const queryClient = useQueryClient();

  const { data: containerSizes = [], isLoading, error } = useQuery({
    queryKey: ["container-sizes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("container_sizes")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as ContainerSize[];
    },
  });

  const createContainerSize = useMutation({
    mutationFn: async (containerSize: ContainerSizeInput) => {
      const { data, error } = await supabase
        .from("container_sizes")
        .insert(containerSize)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["container-sizes"] });
      toast.success("Container size created");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create container size: ${error.message}`);
    },
  });

  const updateContainerSize = useMutation({
    mutationFn: async ({ id, ...updates }: ContainerSizeInput & { id: string }) => {
      const { data, error } = await supabase
        .from("container_sizes")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["container-sizes"] });
      toast.success("Container size updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update container size: ${error.message}`);
    },
  });

  const deleteContainerSize = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("container_sizes")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["container-sizes"] });
      toast.success("Container size deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete container size: ${error.message}`);
    },
  });

  return {
    containerSizes,
    activeContainerSizes: containerSizes.filter((c) => c.is_active),
    isLoading,
    error,
    createContainerSize,
    updateContainerSize,
    deleteContainerSize,
  };
}
