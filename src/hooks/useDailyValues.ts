import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DailyValue {
  id: string;
  nutrient_code: string;
  nutrient_name: string;
  daily_value: number;
  unit: string;
  is_mandatory: boolean;
  display_order: number | null;
  created_at: string;
}

export function useDailyValues() {
  return useQuery({
    queryKey: ['nutrition-daily-values'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nutrition_daily_values')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data as DailyValue[];
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour - these rarely change
  });
}

// Helper to calculate %DV
export function calculatePercentDV(
  value: number | null | undefined,
  nutrientCode: string,
  dailyValues: DailyValue[] | undefined
): number | null {
  if (value === null || value === undefined || !dailyValues) return null;
  
  const dv = dailyValues.find(d => d.nutrient_code === nutrientCode);
  if (!dv || dv.daily_value === 0) return null;
  
  return Math.round((value / dv.daily_value) * 100);
}

// Map of nutrient field names to daily value codes
export const NUTRIENT_TO_DV_CODE: Record<string, string> = {
  total_fat_g: 'total_fat',
  saturated_fat_g: 'saturated_fat',
  cholesterol_mg: 'cholesterol',
  sodium_mg: 'sodium',
  total_carbohydrate_g: 'total_carbohydrate',
  dietary_fiber_g: 'dietary_fiber',
  added_sugars_g: 'added_sugars',
  protein_g: 'protein',
  vitamin_d_mcg: 'vitamin_d',
  calcium_mg: 'calcium',
  iron_mg: 'iron',
  potassium_mg: 'potassium',
  vitamin_a_mcg: 'vitamin_a',
  vitamin_c_mg: 'vitamin_c',
  vitamin_e_mg: 'vitamin_e',
  thiamin_mg: 'thiamin',
  riboflavin_mg: 'riboflavin',
  niacin_mg: 'niacin',
  vitamin_b6_mg: 'vitamin_b6',
  folate_mcg_dfe: 'folate',
  vitamin_b12_mcg: 'vitamin_b12',
  phosphorus_mg: 'phosphorus',
  magnesium_mg: 'magnesium',
  zinc_mg: 'zinc',
  selenium_mcg: 'selenium',
};
