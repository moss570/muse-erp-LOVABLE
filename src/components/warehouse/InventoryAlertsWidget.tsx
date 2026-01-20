import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingDown, Clock, Package } from "lucide-react";
import { differenceInDays } from "date-fns";

const InventoryAlertsWidget = () => {
  // Below Par Level
  const { data: belowPar } = useQuery({
    queryKey: ['inventory-below-par'],
    queryFn: async () => {
      const { data } = await supabase
        .from('materials')
        .select(`
          id, name, code, par_level
        `)
        .not('par_level', 'is', null)
        .gt('par_level', 0);

      // For now, return empty - would need to aggregate inventory
      return [];
    }
  });

  // Expiring Soon (within 7 days)
  const { data: expiringSoon } = useQuery({
    queryKey: ['inventory-expiring-soon'],
    queryFn: async () => {
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const { data } = await supabase
        .from('receiving_lots')
        .select(`
          id, internal_lot_number, expiry_date, current_quantity,
          material:materials(name),
          unit:units_of_measure!receiving_lots_unit_id_fkey(code)
        `)
        .lte('expiry_date', sevenDaysFromNow.toISOString())
        .gt('current_quantity', 0)
        .eq('hold_status', 'none')
        .order('expiry_date', { ascending: true });

      return data || [];
    }
  });

  // Open Containers approaching open expiry
  const { data: openContainers } = useQuery({
    queryKey: ['open-containers-aging'],
    queryFn: async () => {
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      const { data } = await supabase
        .from('receiving_lots')
        .select(`
          id, internal_lot_number, open_expiry_date, current_quantity,
          material:materials(name),
          unit:units_of_measure!receiving_lots_unit_id_fkey(code)
        `)
        .eq('container_status', 'opened')
        .not('open_expiry_date', 'is', null)
        .lte('open_expiry_date', threeDaysFromNow.toISOString())
        .gt('current_quantity', 0);

      return data || [];
    }
  });

  const totalAlerts = (belowPar?.length || 0) + (expiringSoon?.length || 0) + (openContainers?.length || 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Inventory Alerts
          </div>
          <Badge variant={totalAlerts > 0 ? "destructive" : "secondary"}>
            {totalAlerts}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Below Par */}
        {belowPar && belowPar.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-orange-600">
              <TrendingDown className="h-4 w-4" />
              Below Par Level ({belowPar.length})
            </div>
            {belowPar.slice(0, 3).map((m: any) => (
              <div key={m.id} className="text-sm p-2 bg-orange-50 rounded">
                {m.name}
              </div>
            ))}
            {belowPar.length > 3 && (
              <p className="text-sm text-muted-foreground">+{belowPar.length - 3} more</p>
            )}
          </div>
        )}

        {/* Expiring Soon */}
        {expiringSoon && expiringSoon.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-destructive">
              <Clock className="h-4 w-4" />
              Expiring Soon ({expiringSoon.length})
            </div>
            {expiringSoon.slice(0, 3).map((lot: any) => {
              const daysLeft = differenceInDays(new Date(lot.expiry_date), new Date());
              return (
                <div key={lot.id} className="flex items-center justify-between text-sm p-2 bg-destructive/10 rounded">
                  <span>{lot.material?.name}</span>
                  <Badge variant="destructive" className="text-xs">
                    {daysLeft}d
                  </Badge>
                </div>
              );
            })}
          </div>
        )}

        {/* Open Containers Aging */}
        {openContainers && openContainers.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-yellow-600">
              <Package className="h-4 w-4" />
              Open Containers ({openContainers.length})
            </div>
            {openContainers.slice(0, 3).map((lot: any) => (
              <div key={lot.id} className="text-sm p-2 bg-yellow-50 rounded">
                {lot.material?.name} - {lot.internal_lot_number}
              </div>
            ))}
          </div>
        )}

        {totalAlerts === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            No alerts
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InventoryAlertsWidget;
