import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";

const InventoryPreferences = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: dbPreferences } = useQuery({
    queryKey: ['inventory-preferences'],
    queryFn: async () => {
      const { data } = await supabase
        .from('inventory_preferences')
        .select('*');
      return data;
    }
  });

  const getPreference = (key: string, defaultValue: any) => {
    const pref = dbPreferences?.find(p => p.preference_key === key);
    if (!pref) return defaultValue;
    if (pref.preference_type === 'boolean') return pref.preference_value === 'true';
    if (pref.preference_type === 'integer' || pref.preference_type === 'decimal') return Number(pref.preference_value);
    return pref.preference_value;
  };

  const [preferences, setPreferences] = useState({
    defaultExpiryWarningDays: 7,
    openShelfLifeDefault: 30,
    putawayDeadlineHours: 24,
    inventoryAdjustmentApprovalThreshold: 300,
    requireSecondCountForVariance: true,
    enableBarcodeScanning: true,
    defaultTemperatureUnit: 'fahrenheit',
    lotNumberFormat: 'YY-JJJ-MMBB',
    enableAutoHoldForMissingCOA: true,
    enableAutoHoldForTempExcursion: true
  });

  useEffect(() => {
    if (dbPreferences) {
      setPreferences({
        defaultExpiryWarningDays: getPreference('default_expiry_warning_days', 7),
        openShelfLifeDefault: getPreference('open_shelf_life_default', 30),
        putawayDeadlineHours: getPreference('putaway_deadline_hours', 24),
        inventoryAdjustmentApprovalThreshold: getPreference('adjustment_approval_threshold', 300),
        requireSecondCountForVariance: getPreference('require_second_count', true),
        enableBarcodeScanning: getPreference('enable_barcode_scanning', true),
        defaultTemperatureUnit: getPreference('temperature_unit', 'fahrenheit'),
        lotNumberFormat: getPreference('lot_number_format', 'YY-JJJ-MMBB'),
        enableAutoHoldForMissingCOA: getPreference('auto_hold_missing_coa', true),
        enableAutoHoldForTempExcursion: getPreference('auto_hold_temp_excursion', true)
      });
    }
  }, [dbPreferences]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates = [
        { key: 'default_expiry_warning_days', value: String(preferences.defaultExpiryWarningDays), type: 'integer' },
        { key: 'open_shelf_life_default', value: String(preferences.openShelfLifeDefault), type: 'integer' },
        { key: 'putaway_deadline_hours', value: String(preferences.putawayDeadlineHours), type: 'integer' },
        { key: 'adjustment_approval_threshold', value: String(preferences.inventoryAdjustmentApprovalThreshold), type: 'decimal' },
        { key: 'require_second_count', value: String(preferences.requireSecondCountForVariance), type: 'boolean' },
        { key: 'enable_barcode_scanning', value: String(preferences.enableBarcodeScanning), type: 'boolean' },
        { key: 'temperature_unit', value: preferences.defaultTemperatureUnit, type: 'string' },
        { key: 'lot_number_format', value: preferences.lotNumberFormat, type: 'string' },
        { key: 'auto_hold_missing_coa', value: String(preferences.enableAutoHoldForMissingCOA), type: 'boolean' },
        { key: 'auto_hold_temp_excursion', value: String(preferences.enableAutoHoldForTempExcursion), type: 'boolean' }
      ];

      for (const update of updates) {
        await supabase
          .from('inventory_preferences')
          .upsert({ 
            preference_key: update.key, 
            preference_value: update.value,
            preference_type: update.type,
            updated_at: new Date().toISOString()
          }, { onConflict: 'preference_key' });
      }
    },
    onSuccess: () => { 
      toast({ title: "Saved", description: "Preferences updated." }); 
      queryClient.invalidateQueries({ queryKey: ['inventory-preferences'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>General Preferences</CardTitle>
        <CardDescription>Configure default behaviors and thresholds.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="font-medium">Expiry & Shelf Life</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Expiry Warning Days</Label>
              <Input 
                type="number" 
                value={preferences.defaultExpiryWarningDays} 
                onChange={(e) => setPreferences({ ...preferences, defaultExpiryWarningDays: Number(e.target.value) })} 
              />
              <p className="text-xs text-muted-foreground mt-1">Days before expiry to trigger warning alerts</p>
            </div>
            <div>
              <Label>Default Open Shelf Life (days)</Label>
              <Input 
                type="number" 
                value={preferences.openShelfLifeDefault} 
                onChange={(e) => setPreferences({ ...preferences, openShelfLifeDefault: Number(e.target.value) })} 
              />
              <p className="text-xs text-muted-foreground mt-1">Default shelf life for opened containers</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-medium">Operations</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Putaway Deadline (hours)</Label>
              <Input 
                type="number" 
                value={preferences.putawayDeadlineHours} 
                onChange={(e) => setPreferences({ ...preferences, putawayDeadlineHours: Number(e.target.value) })} 
              />
              <p className="text-xs text-muted-foreground mt-1">Hours to complete putaway after receiving</p>
            </div>
            <div>
              <Label>Adjustment Approval Threshold ($)</Label>
              <Input 
                type="number" 
                value={preferences.inventoryAdjustmentApprovalThreshold} 
                onChange={(e) => setPreferences({ ...preferences, inventoryAdjustmentApprovalThreshold: Number(e.target.value) })} 
              />
              <p className="text-xs text-muted-foreground mt-1">Dollar value requiring manager approval</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-medium">Receiving</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Temperature Unit</Label>
              <Select 
                value={preferences.defaultTemperatureUnit} 
                onValueChange={(v) => setPreferences({ ...preferences, defaultTemperatureUnit: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fahrenheit">Fahrenheit (°F)</SelectItem>
                  <SelectItem value="celsius">Celsius (°C)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Lot Number Format</Label>
              <Input 
                value={preferences.lotNumberFormat} 
                onChange={(e) => setPreferences({ ...preferences, lotNumberFormat: e.target.value })} 
              />
              <p className="text-xs text-muted-foreground mt-1">YY=Year, JJJ=Julian, MM=Material, BB=Batch</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-medium">Auto-Hold Triggers</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Auto-Hold for Missing COA</p>
                <p className="text-sm text-muted-foreground">Hold when COA required but not received</p>
              </div>
              <Switch 
                checked={preferences.enableAutoHoldForMissingCOA} 
                onCheckedChange={(c) => setPreferences({ ...preferences, enableAutoHoldForMissingCOA: c })} 
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Auto-Hold for Temp Excursion</p>
                <p className="text-sm text-muted-foreground">Hold when temp exceeds threshold</p>
              </div>
              <Switch 
                checked={preferences.enableAutoHoldForTempExcursion} 
                onCheckedChange={(c) => setPreferences({ ...preferences, enableAutoHoldForTempExcursion: c })} 
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-medium">Features</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Enable Barcode Scanning</Label>
              <Switch 
                checked={preferences.enableBarcodeScanning} 
                onCheckedChange={(c) => setPreferences({ ...preferences, enableBarcodeScanning: c })} 
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Require Second Count for Variances</Label>
              <Switch 
                checked={preferences.requireSecondCountForVariance} 
                onCheckedChange={(c) => setPreferences({ ...preferences, requireSecondCountForVariance: c })} 
              />
            </div>
          </div>
        </div>

        <div className="pt-4">
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Save Preferences
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default InventoryPreferences;
