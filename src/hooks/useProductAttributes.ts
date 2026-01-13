import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ProductAttribute {
  id: string;
  product_id: string;
  attribute_type: string;
  attribute_value: string;
  display_order: number;
  created_at: string;
}

export type AttributeType = 'allergen' | 'claim' | 'certification' | 'dietary';

export const ATTRIBUTE_TYPES: { value: AttributeType; label: string }[] = [
  { value: 'allergen', label: 'Allergen' },
  { value: 'claim', label: 'Product Claim' },
  { value: 'certification', label: 'Certification' },
  { value: 'dietary', label: 'Dietary' },
];

export const COMMON_ALLERGENS = [
  'Milk', 'Eggs', 'Fish', 'Shellfish', 'Tree Nuts', 
  'Peanuts', 'Wheat', 'Soybeans', 'Sesame'
];

export const COMMON_CLAIMS = [
  'Organic', 'Non-GMO', 'Gluten-Free', 'Kosher', 'Halal',
  'Vegan', 'Vegetarian', 'No Artificial Colors', 'No Artificial Flavors',
  'All Natural', 'Low Fat', 'Fat Free', 'Sugar Free', 'No Added Sugar'
];

interface ProductAttributeInput {
  product_id: string;
  attribute_type: string;
  attribute_value: string;
  display_order?: number;
}

export function useProductAttributes(productId: string | null) {
  const queryClient = useQueryClient();

  const { data: attributes = [], isLoading, error } = useQuery({
    queryKey: ["product-attributes", productId],
    queryFn: async () => {
      if (!productId) return [];
      
      const { data, error } = await supabase
        .from("product_attributes")
        .select("*")
        .eq("product_id", productId)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as ProductAttribute[];
    },
    enabled: !!productId,
  });

  const createAttribute = useMutation({
    mutationFn: async (attribute: ProductAttributeInput) => {
      const { data, error } = await supabase
        .from("product_attributes")
        .insert(attribute)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-attributes", productId] });
      toast.success("Attribute added");
    },
    onError: (error: Error) => {
      toast.error(`Failed to add attribute: ${error.message}`);
    },
  });

  const deleteAttribute = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("product_attributes")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-attributes", productId] });
      toast.success("Attribute removed");
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove attribute: ${error.message}`);
    },
  });

  const allergens = attributes.filter((a) => a.attribute_type === 'allergen');
  const claims = attributes.filter((a) => a.attribute_type === 'claim');
  const certifications = attributes.filter((a) => a.attribute_type === 'certification');
  const dietary = attributes.filter((a) => a.attribute_type === 'dietary');

  return {
    attributes,
    allergens,
    claims,
    certifications,
    dietary,
    isLoading,
    error,
    createAttribute,
    deleteAttribute,
  };
}
