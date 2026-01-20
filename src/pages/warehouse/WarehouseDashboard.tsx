import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Warehouse, 
  Package, 
  ArrowRightLeft, 
  ClipboardList,
  CheckCircle
} from "lucide-react";
import { startOfDay, endOfDay, differenceInHours } from "date-fns";
import { useNavigate } from "react-router-dom";
import PutawayStatusWidget from "@/components/warehouse/PutawayStatusWidget";
import PendingIssuesWidget from "@/components/warehouse/PendingIssuesWidget";
import CycleCountWidget from "@/components/warehouse/CycleCountWidget";
import InventoryAlertsWidget from "@/components/warehouse/InventoryAlertsWidget";

const WarehouseDashboard = () => {
  const navigate = useNavigate();

  // Fetch today's activity summary
  const { data: todayActivity } = useQuery({
    queryKey: ['warehouse-today-activity'],
    queryFn: async () => {
      const today = new Date();
      const start = startOfDay(today).toISOString();
      const end = endOfDay(today).toISOString();

      // Putaways completed today
      const { data: putaways } = await supabase
        .from('putaway_tasks')
        .select('id')
        .eq('status', 'completed')
        .gte('completed_at', start)
        .lte('completed_at', end);

      // Issues fulfilled today
      const { data: issues } = await supabase
        .from('production_issue_requests')
        .select('id')
        .eq('status', 'completed')
        .gte('fulfilled_at', start)
        .lte('fulfilled_at', end);

      // Transfers today
      const { data: transfers } = await supabase
        .from('inventory_transactions')
        .select('id')
        .eq('transaction_type', 'transfer')
        .gte('created_at', start)
        .lte('created_at', end);

      return {
        putaways: putaways?.length || 0,
        issues: issues?.length || 0,
        transfers: transfers?.length || 0,
        counts: 0
      };
    }
  });

  // Fetch receiving dock status
  const { data: dockStatus } = useQuery({
    queryKey: ['receiving-dock-status'],
    queryFn: async () => {
      // Items awaiting putaway (QA approved but not yet put away)
      const { data } = await supabase
        .from('receiving_lots')
        .select(`
          id,
          internal_lot_number,
          current_quantity,
          received_date,
          unit:units_of_measure!receiving_lots_unit_id_fkey(code),
          material:materials(name)
        `)
        .eq('putaway_complete', false)
        .neq('hold_status', 'on_hold');

      // Find oldest item
      const oldestDate = data?.length 
        ? data.reduce((oldest, lot) => {
            const date = new Date(lot.received_date);
            return date < oldest ? date : oldest;
          }, new Date())
        : null;

      return {
        count: data?.length || 0,
        oldestDate
      };
    }
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Warehouse className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-bold">Warehouse Dashboard</h1>
      </div>

      {/* Today's Activity Summary */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{todayActivity?.putaways || 0}</p>
                <p className="text-sm text-muted-foreground">Putaways Completed</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{todayActivity?.issues || 0}</p>
                <p className="text-sm text-muted-foreground">Issues Fulfilled</p>
              </div>
              <ArrowRightLeft className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{todayActivity?.transfers || 0}</p>
                <p className="text-sm text-muted-foreground">Transfers</p>
              </div>
              <ArrowRightLeft className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{todayActivity?.counts || 0}</p>
                <p className="text-sm text-muted-foreground">Counts Completed</p>
              </div>
              <ClipboardList className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Widgets Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Putaway Status */}
          <PutawayStatusWidget />

          {/* Pending Issue Requests */}
          <PendingIssuesWidget />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Cycle Counts Due */}
          <CycleCountWidget />

          {/* Inventory Alerts */}
          <InventoryAlertsWidget />
        </div>
      </div>

      {/* Receiving Dock Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Receiving Dock Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Items Awaiting Putaway</p>
              <p className="text-2xl font-bold">{dockStatus?.count || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Oldest Item</p>
              <p className="text-2xl font-bold">
                {dockStatus?.oldestDate 
                  ? `${differenceInHours(new Date(), dockStatus.oldestDate)}h ago`
                  : '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button onClick={() => navigate('/warehouse/putaway')}>
              <Package className="h-4 w-4 mr-2" />
              Start Putaway
            </Button>
            <Button variant="outline" onClick={() => navigate('/warehouse/issue-to-production')}>
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              View Issue Requests
            </Button>
            <Button variant="outline" onClick={() => navigate('/warehouse/cycle-counts')}>
              <ClipboardList className="h-4 w-4 mr-2" />
              Cycle Counts
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WarehouseDashboard;
