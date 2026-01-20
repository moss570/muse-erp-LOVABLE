import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Bell, 
  AlertTriangle, 
  TrendingDown, 
  Clock, 
  Package,
  CheckCircle,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";

const InventoryAlerts = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");

  // Fetch alerts
  const { data: alerts, isLoading } = useQuery({
    queryKey: ['inventory-alerts', typeFilter, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('inventory_alerts')
        .select(`
          *,
          material:materials(id, name, code),
          receiving_lot:receiving_lots(internal_lot_number),
          acknowledged_by_user:profiles!acknowledged_by(full_name)
        `)
        .order('created_at', { ascending: false });

      if (typeFilter !== 'all') {
        query = query.eq('alert_type', typeFilter);
      }
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  // Generate alerts (check current inventory against thresholds)
  const generateAlertsMutation = useMutation({
    mutationFn: async () => {
      // Fetch materials with par levels
      const { data: materials } = await supabase
        .from('materials')
        .select(`
          id, name, code, par_level, reorder_point, max_stock_level
        `)
        .or('par_level.not.is.null,reorder_point.not.is.null');

      // Get inventory for each material
      const newAlerts = [];

      for (const material of materials || []) {
        const { data: inventory } = await supabase
          .from('receiving_lots')
          .select('quantity_received')
          .eq('material_id', material.id)
          .gt('quantity_received', 0);

        const currentStock = inventory?.reduce((sum, l) => sum + (l.quantity_received || 0), 0) || 0;

        // Below reorder point (critical)
        if (material.reorder_point && currentStock <= material.reorder_point) {
          newAlerts.push({
            alert_type: 'at_reorder',
            material_id: material.id,
            severity: 'critical',
            title: `${material.name} at reorder point`,
            message: `Current stock (${currentStock}) is at or below reorder point (${material.reorder_point})`,
            current_value: currentStock,
            threshold_value: material.reorder_point
          });
        }
        // Below par level (warning)
        else if (material.par_level && currentStock < material.par_level) {
          newAlerts.push({
            alert_type: 'below_par',
            material_id: material.id,
            severity: 'warning',
            title: `${material.name} below par level`,
            message: `Current stock (${currentStock}) is below par level (${material.par_level})`,
            current_value: currentStock,
            threshold_value: material.par_level
          });
        }
        // Above max (info)
        else if (material.max_stock_level && currentStock > material.max_stock_level) {
          newAlerts.push({
            alert_type: 'above_max',
            material_id: material.id,
            severity: 'info',
            title: `${material.name} above max stock`,
            message: `Current stock (${currentStock}) exceeds max level (${material.max_stock_level})`,
            current_value: currentStock,
            threshold_value: material.max_stock_level
          });
        }
      }

      // Insert new alerts (avoid duplicates)
      let createdCount = 0;
      for (const alert of newAlerts) {
        const { data: existing } = await supabase
          .from('inventory_alerts')
          .select('id')
          .eq('alert_type', alert.alert_type)
          .eq('material_id', alert.material_id)
          .eq('status', 'active')
          .maybeSingle();

        if (!existing) {
          await supabase.from('inventory_alerts').insert(alert);
          createdCount++;
        }
      }

      return createdCount;
    },
    onSuccess: (count) => {
      toast({
        title: "Alerts Generated",
        description: `${count} new alerts created.`
      });
      queryClient.invalidateQueries({ queryKey: ['inventory-alerts'] });
    }
  });

  // Acknowledge alert
  const acknowledgeMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      await supabase
        .from('inventory_alerts')
        .update({
          status: 'acknowledged',
          acknowledged_by: userId,
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', alertId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-alerts'] });
    }
  });

  // Dismiss alert
  const dismissMutation = useMutation({
    mutationFn: async (alertId: string) => {
      await supabase
        .from('inventory_alerts')
        .update({ status: 'dismissed' })
        .eq('id', alertId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-alerts'] });
    }
  });

  const getSeverityBadge = (severity: string) => {
    if (severity === 'critical') {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          {severity}
        </Badge>
      );
    }
    if (severity === 'warning') {
      return (
        <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-600">
          <Clock className="h-3 w-3" />
          {severity}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1">
        <Package className="h-3 w-3" />
        {severity}
      </Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, typeof Bell> = {
      below_par: TrendingDown,
      at_reorder: AlertTriangle,
      above_max: Package,
      expiring_soon: Clock,
      expired: AlertTriangle,
      open_container_aging: Package,
      open_container_expired: AlertTriangle
    };
    const Icon = icons[type] || Bell;
    return <Icon className="h-4 w-4" />;
  };

  // Summary counts
  const critical = alerts?.filter(a => a.severity === 'critical' && a.status === 'active').length || 0;
  const warnings = alerts?.filter(a => a.severity === 'warning' && a.status === 'active').length || 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Inventory Alerts</h1>
        </div>
        <Button onClick={() => generateAlertsMutation.mutate()} disabled={generateAlertsMutation.isPending}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Alerts
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <div>
                <p className="text-3xl font-bold text-destructive">{critical}</p>
                <p className="text-muted-foreground">Critical Alerts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Clock className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-3xl font-bold text-amber-600">{warnings}</p>
                <p className="text-muted-foreground">Warnings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-3xl font-bold">{alerts?.length || 0}</p>
            <p className="text-muted-foreground">Total Alerts</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="below_par">Below Par Level</SelectItem>
                <SelectItem value="at_reorder">At Reorder Point</SelectItem>
                <SelectItem value="above_max">Above Max Stock</SelectItem>
                <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="open_container_aging">Open Container Aging</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Alerts Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Severity</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Material</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Values</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alerts?.map((alert) => (
              <TableRow key={alert.id}>
                <TableCell>{getSeverityBadge(alert.severity)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getTypeIcon(alert.alert_type)}
                    <span className="capitalize">{alert.alert_type.replace(/_/g, ' ')}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="font-medium">{alert.material?.name}</p>
                  <p className="text-sm text-muted-foreground">{alert.material?.code}</p>
                </TableCell>
                <TableCell className="max-w-xs truncate">{alert.message}</TableCell>
                <TableCell>
                  <span className="text-sm">
                    {alert.current_value} / {alert.threshold_value}
                  </span>
                </TableCell>
                <TableCell>
                  {format(new Date(alert.created_at), 'MMM d, h:mm a')}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {alert.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {alert.status === 'active' && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => acknowledgeMutation.mutate(alert.id)}
                          title="Acknowledge"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => dismissMutation.mutate(alert.id)}
                          title="Dismiss"
                        >
                          ×
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {(!alerts || alerts.length === 0) && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No alerts found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default InventoryAlerts;
