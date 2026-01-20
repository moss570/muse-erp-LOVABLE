import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

const CycleCountSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ['cycle-count-settings'],
    queryFn: async () => {
      const { data } = await supabase
        .from('cycle_count_settings')
        .select('*')
        .order('category');
      return data;
    }
  });

  const [localSettings, setLocalSettings] = useState<any[]>([]);
  
  useEffect(() => { 
    if (settings) setLocalSettings(settings); 
  }, [settings]);

  const updateSetting = (id: string, field: string, value: any) => {
    setLocalSettings(prev => prev.map(s => 
      s.id === id ? { ...s, [field]: value, _dirty: true } : s
    ));
  };

  const saveMutation = useMutation({
    mutationFn: async (setting: any) => {
      const { _dirty, ...data } = setting;
      await supabase.from('cycle_count_settings').update(data).eq('id', setting.id);
    },
    onSuccess: () => {
      toast({ title: "Saved" });
      queryClient.invalidateQueries({ queryKey: ['cycle-count-settings'] });
    }
  });

  const handleBlur = (setting: any) => { 
    if (setting._dirty) saveMutation.mutate(setting); 
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cycle Count Settings</CardTitle>
        <CardDescription>
          Configure count frequency and variance thresholds by category. Changes auto-save on blur.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Frequency (Days)</TableHead>
              <TableHead>Auto-Approve %</TableHead>
              <TableHead>Supervisor %</TableHead>
              <TableHead>Manager %</TableHead>
              <TableHead>Manager $ Threshold</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {localSettings?.map((setting) => (
              <TableRow key={setting.id}>
                <TableCell className="font-medium">
                  {setting.category || 'Default (All)'}
                </TableCell>
                <TableCell>
                  <Input 
                    type="number" 
                    className="w-20" 
                    value={setting.frequency_days || ''} 
                    onChange={(e) => updateSetting(setting.id, 'frequency_days', Number(e.target.value))}
                    onBlur={() => handleBlur(setting)} 
                  />
                </TableCell>
                <TableCell>
                  <Input 
                    type="number" 
                    className="w-20" 
                    value={setting.variance_auto_approve_percent || ''} 
                    onChange={(e) => updateSetting(setting.id, 'variance_auto_approve_percent', Number(e.target.value))}
                    onBlur={() => handleBlur(setting)} 
                  />
                </TableCell>
                <TableCell>
                  <Input 
                    type="number" 
                    className="w-20" 
                    value={setting.variance_supervisor_review_percent || ''} 
                    onChange={(e) => updateSetting(setting.id, 'variance_supervisor_review_percent', Number(e.target.value))}
                    onBlur={() => handleBlur(setting)} 
                  />
                </TableCell>
                <TableCell>
                  <Input 
                    type="number" 
                    className="w-20" 
                    value={setting.variance_manager_approval_percent || ''} 
                    onChange={(e) => updateSetting(setting.id, 'variance_manager_approval_percent', Number(e.target.value))}
                    onBlur={() => handleBlur(setting)} 
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">$</span>
                    <Input 
                      type="number" 
                      className="w-24" 
                      value={setting.value_manager_approval_threshold || ''} 
                      onChange={(e) => updateSetting(setting.id, 'value_manager_approval_threshold', Number(e.target.value))}
                      onBlur={() => handleBlur(setting)} 
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {(!localSettings || localSettings.length === 0) && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No cycle count settings configured yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium mb-2">How Variance Thresholds Work</p>
            <ul className="text-sm space-y-1">
              <li>• <strong>Auto-Approve:</strong> Variances ≤ this % are automatically approved</li>
              <li>• <strong>Supervisor:</strong> Variances {'>'} auto-approve but ≤ this % require supervisor review</li>
              <li>• <strong>Manager:</strong> Variances {'>'} supervisor % OR exceeding $ threshold require manager approval</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default CycleCountSettings;
