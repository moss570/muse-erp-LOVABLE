import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ManufacturingPreferences {
  trackTimeByProduction: boolean;
  requireStagePhotoEvidence: boolean;
}

export function useManufacturingPreferences() {
  return useQuery({
    queryKey: ['manufacturing-preferences'],
    queryFn: async (): Promise<ManufacturingPreferences> => {
      const { data, error } = await supabase
        .from('inventory_preferences')
        .select('preference_key, preference_value')
        .in('preference_key', ['track_time_by_production', 'require_stage_photo_evidence']);

      if (error) {
        console.error('Error fetching manufacturing preferences:', error);
        throw error;
      }

      const getValue = (key: string): string | null => {
        const pref = data?.find(p => p.preference_key === key);
        return pref?.preference_value ?? null;
      };

      return {
        trackTimeByProduction: getValue('track_time_by_production') === 'true',
        requireStagePhotoEvidence: getValue('require_stage_photo_evidence') === 'true',
      };
    },
  });
}
