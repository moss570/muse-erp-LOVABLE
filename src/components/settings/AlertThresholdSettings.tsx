import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Bell, AlertTriangle, Clock, Package, TrendingDown } from "lucide-react";

const AlertThresholdSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: alertSettings } = useQuery({
    queryKey: ['alert-settings'],
    queryFn: async () => {
      const { data } = await supabase
        .from('alert_settings')
        .select('*')
        .order('alert_type');
      return data;
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: any }) => {
      await supabase
        .from('alert_settings')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('id', id);
    },
    onSuccess: () => {
      toast({ title: "Saved" });
      queryClient.invalidateQueries({ queryKey: ['alert-settings'] });
    }
  });

  const getAlertIcon = (alertType: string) => {
    const icons: Record<string, any> = {
      below_par: TrendingDown,
      at_reorder: AlertTriangle,
      above_max: Package,
      expiring_soon: Clock,
      expired: AlertTriangle,
      open_container_aging: Package,
      open_container_expired: AlertTriangle,
      putaway_overdue: Clock,
      cycle_count_overdue: Clock
    };
    const Icon = icons[alertType] || Bell;
    return <Icon className="h-4 w-4" />;
  };

  const formatAlertType = (alertType: string) => {
    return alertType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alert Thresholds</CardTitle>
        <CardDescription>
          Configure which alerts are enabled and their trigger thresholds.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Alert Type</TableHead>
              <TableHead>Enabled</TableHead>
              <TableHead>Days Before</TableHead>
              <TableHead>Channels</TableHead>
              <TableHead>Notify Roles</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alertSettings?.map((setting) => (
              <TableRow key={setting.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getAlertIcon(setting.alert_type)}
                    <span>{formatAlertType(setting.alert_type)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={setting.is_enabled}
                    onCheckedChange={(checked) => 
                      updateMutation.mutate({ id: setting.id, field: 'is_enabled', value: checked })
                    }
                  />
                </TableCell>
                <TableCell>
                  {setting.days_before_expiry !== null ? (
                    <Input
                      type="number"
                      className="w-20"
                      value={setting.days_before_expiry}
                      onChange={(e) => 
                        updateMutation.mutate({ 
                          id: setting.id, 
                          field: 'days_before_expiry', 
                          value: Number(e.target.value) 
                        })
                      }
                    />
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {setting.notification_channels?.map((channel: string) => (
                      <Badge key={channel} variant="outline" className="text-xs">
                        {channel}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {setting.notify_roles?.map((role: string) => (
                      <Badge key={role} variant="secondary" className="text-xs">
                        {role.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {(!alertSettings || alertSettings.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No alert settings configured.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default AlertThresholdSettings;
