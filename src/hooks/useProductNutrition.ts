import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { calculateProductNutrition, CalculatedNutrition, CalculationOptions } from '@/lib/nutritionCalculator';

export interface ProductNutrition {
  id: string;
  product_id: string;
  recipe_id: string | null;
  serving_size_g: number | null;
  serving_size_description: string | null;
  servings_per_container: number | null;
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
  protein_g: number | null;
  vitamin_d_mcg: number | null;
  calcium_mg: number | null;
  iron_mg: number | null;
  potassium_mg: number | null;
  vitamin_a_mcg: number | null;
  vitamin_c_mg: number | null;
  yield_loss_percent: number | null;
  overrun_percent: number | null;
  calculation_date: string | null;
  calculated_by: string | null;
  is_verified: boolean | null;
  created_at: string;
  updated_at: string;
}

export type ProductNutritionInput = Partial<Omit<ProductNutrition, 'id' | 'created_at' | 'updated_at'>>;

export function useProductNutrition(productId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch saved product nutrition
  const query = useQuery({
    queryKey: ['product-nutrition', productId],
    queryFn: async () => {
      if (!productId) return null;
      const { data, error } = await supabase
        .from('product_nutrition')
        .select('*')
        .eq('product_id', productId)
        .maybeSingle();
      if (error) throw error;
      return data as ProductNutrition | null;
    },
    enabled: !!productId,
  });

  // Save/update product nutrition
  const upsertMutation = useMutation({
    mutationFn: async (input: ProductNutritionInput & { product_id: string }) => {
      const { data: existing } = await supabase
        .from('product_nutrition')
        .select('id')
        .eq('product_id', input.product_id)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('product_nutrition')
          .update({
            ...input,
            calculation_date: new Date().toISOString(),
          })
          .eq('product_id', input.product_id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('product_nutrition')
          .insert({
            ...input,
            calculation_date: new Date().toISOString(),
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-nutrition', productId] });
      toast({
        title: 'Nutrition data saved',
        description: 'Product nutrition has been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error saving nutrition',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Calculate nutrition from recipe
  const calculateMutation = useMutation({
    mutationFn: async (options?: CalculationOptions) => {
      if (!productId) throw new Error('No product ID');
      return calculateProductNutrition(productId, options);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error calculating nutrition',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Calculate and save in one step
  const calculateAndSave = async (options?: CalculationOptions) => {
    if (!productId) return;
    
    const result = await calculateMutation.mutateAsync(options);
    
    // Save the per-serving values
    await upsertMutation.mutateAsync({
      product_id: productId,
      serving_size_g: result.serving_size_g,
      serving_size_description: result.serving_size_description,
      calories: result.per_serving.calories,
      total_fat_g: result.per_serving.total_fat_g,
      saturated_fat_g: result.per_serving.saturated_fat_g,
      trans_fat_g: result.per_serving.trans_fat_g,
      polyunsaturated_fat_g: result.per_serving.polyunsaturated_fat_g,
      monounsaturated_fat_g: result.per_serving.monounsaturated_fat_g,
      cholesterol_mg: result.per_serving.cholesterol_mg,
      sodium_mg: result.per_serving.sodium_mg,
      total_carbohydrate_g: result.per_serving.total_carbohydrate_g,
      dietary_fiber_g: result.per_serving.dietary_fiber_g,
      total_sugars_g: result.per_serving.total_sugars_g,
      added_sugars_g: result.per_serving.added_sugars_g,
      protein_g: result.per_serving.protein_g,
      vitamin_d_mcg: result.per_serving.vitamin_d_mcg,
      calcium_mg: result.per_serving.calcium_mg,
      iron_mg: result.per_serving.iron_mg,
      potassium_mg: result.per_serving.potassium_mg,
      vitamin_a_mcg: result.per_serving.vitamin_a_mcg,
      vitamin_c_mg: result.per_serving.vitamin_c_mg,
      yield_loss_percent: options?.yieldLossPercent ?? 5,
      overrun_percent: options?.overrunPercent ?? 50,
    });
    
    return result;
  };

  return {
    nutrition: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    upsert: upsertMutation.mutate,
    upsertAsync: upsertMutation.mutateAsync,
    isUpserting: upsertMutation.isPending,
    calculate: calculateMutation.mutate,
    calculateAsync: calculateMutation.mutateAsync,
    isCalculating: calculateMutation.isPending,
    calculatedResult: calculateMutation.data as CalculatedNutrition | undefined,
    calculateAndSave,
  };
}
