import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Factory, Clock, Camera } from "lucide-react";
import { toast } from "sonner";

interface PreferenceState {
  trackTimeByProduction: boolean;
  requireStagePhotoEvidence: boolean;
}

const ManufacturingPreferences = () => {
  const queryClient = useQueryClient();
  const [preferences, setPreferences] = useState<PreferenceState>({
    trackTimeByProduction: false,
    requireStagePhotoEvidence: false,
  });

  const { data: fetchedPreferences, isLoading } = useQuery({
    queryKey: ['manufacturing-preferences-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_preferences')
        .select('*')
        .in('preference_key', ['track_time_by_production', 'require_stage_photo_evidence']);

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (fetchedPreferences) {
      const getValue = (key: string): string | null => {
        const pref = fetchedPreferences.find(p => p.preference_key === key);
        return pref?.preference_value ?? null;
      };

      setPreferences({
        trackTimeByProduction: getValue('track_time_by_production') === 'true',
        requireStagePhotoEvidence: getValue('require_stage_photo_evidence') === 'true',
      });
    }
  }, [fetchedPreferences]);

  const saveMutation = useMutation({
    mutationFn: async (prefs: PreferenceState) => {
      const updates = [
        {
          preference_key: 'track_time_by_production',
          preference_value: String(prefs.trackTimeByProduction),
          preference_type: 'boolean',
          description: 'Enable labor time tracking on Work Orders in Shop Floor',
        },
        {
          preference_key: 'require_stage_photo_evidence',
          preference_value: String(prefs.requireStagePhotoEvidence),
          preference_type: 'boolean',
          description: 'Require photo evidence when completing production stages on Shop Floor',
        },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('inventory_preferences')
          .upsert(update, { onConflict: 'preference_key' });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Manufacturing preferences saved');
      queryClient.invalidateQueries({ queryKey: ['manufacturing-preferences'] });
      queryClient.invalidateQueries({ queryKey: ['manufacturing-preferences-settings'] });
    },
    onError: (error) => {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Factory className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Manufacturing Preferences</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Labor Tracking
          </CardTitle>
          <CardDescription>
            Configure how labor time is tracked during production
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between space-x-4 rounded-lg border p-4">
            <div className="space-y-1">
              <Label htmlFor="track-time" className="font-medium">
                Track Time by Production (Work Orders)
              </Label>
              <p className="text-sm text-muted-foreground">
                When enabled, employees can clock in/out against specific Work Orders on the Shop Floor 
                to track labor costs per production run. This adds a Time Clock card and Clock In buttons 
                to Work Order items.
              </p>
            </div>
            <Switch
              id="track-time"
              checked={preferences.trackTimeByProduction}
              onCheckedChange={(checked) => 
                setPreferences(prev => ({ ...prev, trackTimeByProduction: checked }))
              }
            />
          </div>

          <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4">
            <p className="font-medium text-foreground mb-1">Note:</p>
            <p>
              This setting only affects the Work Order labor tracking feature on the Shop Floor. 
              The general Employee Time Clock (for shift in/out and breaks) remains available separately.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Stage Documentation
          </CardTitle>
          <CardDescription>
            Configure documentation requirements for production stages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between space-x-4 rounded-lg border p-4">
            <div className="space-y-1">
              <Label htmlFor="require-photo" className="font-medium">
                Require Photo Evidence for Stage Completion
              </Label>
              <p className="text-sm text-muted-foreground">
                When enabled, operators must upload at least one photo as evidence before 
                completing any production stage on the Shop Floor. This helps with quality 
                control and traceability.
              </p>
            </div>
            <Switch
              id="require-photo"
              checked={preferences.requireStagePhotoEvidence}
              onCheckedChange={(checked) => 
                setPreferences(prev => ({ ...prev, requireStagePhotoEvidence: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={() => saveMutation.mutate(preferences)}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Preferences
        </Button>
      </div>
    </div>
  );
};

export default ManufacturingPreferences;
