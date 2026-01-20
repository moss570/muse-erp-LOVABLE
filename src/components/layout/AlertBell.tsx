import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Bell, AlertTriangle, TrendingDown } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AlertBell = () => {
  const navigate = useNavigate();

  const { data: activeAlerts } = useQuery({
    queryKey: ['active-alerts-count'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_alerts')
        .select(`
          id, alert_type, severity, title, message, created_at,
          material:materials(name)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    refetchInterval: 60000 // Refresh every minute
  });

  const criticalCount = activeAlerts?.filter(a => a.severity === 'critical').length || 0;
  const totalCount = activeAlerts?.length || 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {totalCount > 0 && (
            <Badge
              variant={criticalCount > 0 ? "destructive" : "secondary"}
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {totalCount > 9 ? '9+' : totalCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Inventory Alerts</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/inventory/alerts')}
            >
              View All
            </Button>
          </div>

          {activeAlerts?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No active alerts
            </p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {activeAlerts?.map(alert => (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                  onClick={() => navigate('/inventory/alerts')}
                >
                  <div className="mt-0.5">
                    {alert.severity === 'critical' ? (
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-amber-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{alert.material?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{alert.title}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default AlertBell;
