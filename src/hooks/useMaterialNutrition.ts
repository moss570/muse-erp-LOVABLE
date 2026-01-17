import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MaterialNutrition {
  id: string;
  material_id: string;
  serving_size_g: number | null;
  serving_size_description: string | null;
  servings_per_container: number | null;
  // Macronutrients
  calories: number | null;
  total_fat_g: number | null;
  saturated_fat_g: number | null;
  trans_fat_g: number | null;
  polyunsaturated_fat_g: number | null;
  monounsaturated_fat_g: number | null;
  cholesterol_mg: number | null;
  sodium_mg: number | null;
  total_carbohydrate_g: number | null;
  dietary_fiber_g: number | null;
  total_sugars_g: number | null;
  added_sugars_g: number | null;
  sugar_alcohol_g: number | null;
  protein_g: number | null;
  // Mandatory Micronutrients
  vitamin_d_mcg: number | null;
  calcium_mg: number | null;
  iron_mg: number | null;
  potassium_mg: number | null;
  // Optional Micronutrients
  vitamin_a_mcg: number | null;
  vitamin_c_mg: number | null;
  vitamin_e_mg: number | null;
  thiamin_mg: number | null;
  riboflavin_mg: number | null;
  niacin_mg: number | null;
  vitamin_b6_mg: number | null;
  folate_mcg_dfe: number | null;
  vitamin_b12_mcg: number | null;
  phosphorus_mg: number | null;
  magnesium_mg: number | null;
  zinc_mg: number | null;
  selenium_mcg: number | null;
  // Audit
  data_source: string | null;
  source_document_id: string | null;
  usda_fdc_id: string | null;
  extraction_confidence: number | null;
  last_verified_at: string | null;
  verified_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type MaterialNutritionInput = Omit<MaterialNutrition, 'id' | 'created_at' | 'updated_at'>;

export function useMaterialNutrition(materialId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['material-nutrition', materialId],
    queryFn: async () => {
      if (!materialId) return null;
      const { data, error } = await supabase
        .from('material_nutrition')
        .select('*')
        .eq('material_id', materialId)
        .maybeSingle();
      if (error) throw error;
      return data as MaterialNutrition | null;
    },
    enabled: !!materialId,
  });

  const upsertMutation = useMutation({
    mutationFn: async (input: Partial<MaterialNutritionInput> & { material_id: string }) => {
      // Check if record exists
      const { data: existing } = await supabase
        .from('material_nutrition')
        .select('id')
        .eq('material_id', input.material_id)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('material_nutrition')
          .update(input)
          .eq('material_id', input.material_id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('material_nutrition')
          .insert(input)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-nutrition', materialId] });
      toast({
        title: 'Nutrition data saved',
        description: 'Nutritional information has been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error saving nutrition data',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!materialId) throw new Error('No material ID');
      const { error } = await supabase
        .from('material_nutrition')
        .delete()
        .eq('material_id', materialId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-nutrition', materialId] });
      toast({
        title: 'Nutrition data deleted',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error deleting nutrition data',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    nutrition: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    upsert: upsertMutation.mutate,
    upsertAsync: upsertMutation.mutateAsync,
    isUpserting: upsertMutation.isPending,
    delete: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
}
