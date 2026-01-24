import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, PlayCircle, StopCircle, Package, Factory, Loader2, Plus, Pencil, Trash2, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { WorkOrderFormDialog, WorkOrder } from "@/components/manufacturing/WorkOrderFormDialog";
import { ShopFloorPriorityDashboard } from "@/components/manufacturing/ShopFloorPriorityDashboard";
import { useUnfulfilledSalesOrders } from "@/hooks/useUnfulfilledSalesOrders";
import { DeleteWorkOrderDialog } from "@/components/manufacturing/DeleteWorkOrderDialog";
import { useAuth } from "@/contexts/AuthContext";

interface ScheduleInfo {
  id: string;
  schedule_date: string;
  schedule_status: string;
}

interface WorkOrderDisplay {
  id: string;
  wo_number: string;
  wo_status: string;
  wo_type: string;
  product_id: string | null;
  recipe_id: string | null;
  production_line_id: string | null;
  target_quantity: number;
  target_uom: string;
  priority: string;
  scheduled_date: string | null;
  due_date: string | null;
  special_instructions: string | null;
  target_stage_code: string | null;
  product_size_id: string | null;
  input_lot_id: string | null;
  actual_total_cost: number | null;
  product?: { id: string; name: string; sku: string } | null;
  production_line?: { id: string; line_name: string } | null;
  schedule?: ScheduleInfo[] | null;
}

interface ClockEntry {
  id: string;
  work_order_id: string;
  clock_in: string;
  clock_out: string | null;
  hours_worked: number;
  hourly_rate: number;
  labor_cost: number;
}

export default function ShopFloor() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isManager, isAdmin } = useAuth();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeClock, setActiveClock] = useState<ClockEntry | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrderDisplay | null>(null);
  const [workOrderToDelete, setWorkOrderToDelete] = useState<WorkOrderDisplay | null>(null);
  
  // Per-visit acknowledgment state (resets every time user visits this page)
  const [hasAcknowledgedThisVisit, setHasAcknowledgedThisVisit] = useState(false);

  // Check unfulfilled orders status
  const { data: unfulfilledData } = useUnfulfilledSalesOrders();
  const hasUnfulfilled = (unfulfilledData?.items?.length || 0) > 0;
  // Work order creation is locked until user acknowledges THIS VISIT
  const canCreateWorkOrder = !hasUnfulfilled || hasAcknowledgedThisVisit;
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUser(data.user);
    });
  }, []);

  // Check if user is clocked in
  const { data: clockStatus } = useQuery({
    queryKey: ["clock-status", currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return null;

      const { data, error } = await supabase
        .from("work_order_labor")
        .select("*")
        .eq("employee_id", currentUser.id)
        .is("clock_out", null)
        .order("clock_in", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!currentUser,
    refetchInterval: 30000,
  });

  useEffect(() => {
    setActiveClock(clockStatus as ClockEntry | null);
  }, [clockStatus]);

  // Get active work orders with schedule info
  const { data: activeWorkOrders = [], isLoading: loadingWOs } = useQuery({
    queryKey: ["active-work-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_orders")
        .select(`
          *,
          product:products!work_orders_product_id_fkey(id, name, sku),
          production_line:production_lines(id, line_name),
          schedule:production_schedule!production_schedule_work_order_id_fkey(
            id, schedule_date, schedule_status
          )
        `)
        .in("wo_status", ["Released", "In Progress", "Created"])
        .order("priority", { ascending: false });

      if (error) throw error;
      return data as unknown as WorkOrderDisplay[];
    },
    refetchInterval: 60000,
  });

  // Clock in mutation
  const clockInMutation = useMutation({
    mutationFn: async (workOrderId: string) => {
      const { data: userData } = await supabase.auth.getUser();
      const hourlyRate = 18.0; // TODO: Get from employee record

      const { data, error } = await supabase
        .from("work_order_labor")
        .insert({
          work_order_id: workOrderId,
          employee_id: userData?.user?.id,
          labor_date: new Date().toISOString().split("T")[0],
          clock_in: new Date().toISOString(),
          hourly_rate: hourlyRate,
          hours_worked: 0,
          labor_cost: 0,
          created_by: userData?.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setActiveClock(data as ClockEntry);
      queryClient.invalidateQueries({ queryKey: ["clock-status"] });
      toast.success("Clocked in successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to clock in", { description: error.message });
    },
  });

  // Clock out mutation
  const clockOutMutation = useMutation({
    mutationFn: async () => {
      if (!activeClock) throw new Error("Not clocked in");

      const clockIn = new Date(activeClock.clock_in);
      const clockOut = new Date();
      const hoursWorked = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
      const laborCost = hoursWorked * activeClock.hourly_rate;

      const { error } = await supabase
        .from("work_order_labor")
        .update({
          clock_out: clockOut.toISOString(),
          hours_worked: hoursWorked,
          labor_cost: laborCost,
        })
        .eq("id", activeClock.id);

      if (error) throw error;

      // Recalculate work order costs
      await supabase.rpc("calculate_actual_wo_costs", {
        p_work_order_id: activeClock.work_order_id,
      });

      return { hoursWorked, laborCost };
    },
    onSuccess: (data) => {
      setActiveClock(null);
      queryClient.invalidateQueries({ queryKey: ["clock-status"] });
      queryClient.invalidateQueries({ queryKey: ["active-work-orders"] });
      toast.success("Clocked out successfully", {
        description: `${data.hoursWorked.toFixed(2)} hours • $${data.laborCost.toFixed(2)}`,
      });
    },
    onError: (error: any) => {
      toast.error("Failed to clock out", { description: error.message });
    },
  });

  const handleClockIn = (workOrderId: string) => {
    if (activeClock) {
      toast.error("Already clocked in", { description: "Please clock out first" });
      return;
    }
    clockInMutation.mutate(workOrderId);
  };

  const handleClockOut = () => {
    clockOutMutation.mutate();
  };

  const handleEditWorkOrder = (wo: WorkOrderDisplay) => {
    setSelectedWorkOrder(wo);
    setIsEditDialogOpen(true);
  };

  const handleDeleteWorkOrder = (wo: WorkOrderDisplay) => {
    setWorkOrderToDelete(wo);
    setIsDeleteDialogOpen(true);
  };

  const canDeleteWorkOrders = isManager || isAdmin;

  // Helper to get schedule info for a work order
  const getScheduleBadge = (wo: WorkOrderDisplay) => {
    const activeSchedule = wo.schedule?.find(s => s.schedule_status !== "Cancelled");
    if (activeSchedule) {
      return (
        <Badge className="gap-1 bg-primary text-primary-foreground">
          <Calendar className="h-3 w-3" />
          Scheduled: {format(new Date(activeSchedule.schedule_date), "MMM d")}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1 text-muted-foreground">
        <Calendar className="h-3 w-3" />
        Not Scheduled
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    if (priority === "Rush") return <Badge variant="destructive">Rush</Badge>;
    if (priority === "High") return <Badge variant="default">High</Badge>;
    if (priority === "Standard") return <Badge variant="secondary">Normal</Badge>;
    return <Badge variant="outline">Low</Badge>;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "In Progress":
        return <Badge>In Progress</Badge>;
      case "Released":
        return <Badge variant="secondary">Released</Badge>;
      case "Created":
        return <Badge variant="outline">Created</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Factory className="h-8 w-8" />
            Shop Floor
          </h1>
          <p className="text-muted-foreground">Mobile production interface</p>
        </div>
        {/* Only show Create WO button if no unfulfilled orders OR already acknowledged */}
        {canCreateWorkOrder && (
          <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Work Order
          </Button>
        )}
      </div>

      {/* Priority Dashboard - Unfulfilled Orders */}
      <ShopFloorPriorityDashboard 
        onCreateWorkOrder={() => setIsCreateDialogOpen(true)} 
        hasAcknowledgedThisVisit={hasAcknowledgedThisVisit}
        onAcknowledged={() => setHasAcknowledgedThisVisit(true)}
      />

      {/* Clock Status Card */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Time Clock
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeClock ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Clocked in at</p>
                <p className="text-2xl font-bold">
                  {format(new Date(activeClock.clock_in), "h:mm a")}
                </p>
                <Badge className="mt-1 bg-primary">WORKING</Badge>
              </div>
              <Button
                size="lg"
                variant="destructive"
                onClick={handleClockOut}
                disabled={clockOutMutation.isPending}
                className="gap-2"
              >
                <StopCircle className="h-5 w-5" />
                Clock Out
              </Button>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-2">Not clocked in</p>
              <p className="text-sm text-muted-foreground">
                Select a work order below to clock in
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Work Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Active Work Orders</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadingWOs ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : activeWorkOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No active work orders</p>
            </div>
          ) : (
            <div className="divide-y">
              {activeWorkOrders.map((wo) => (
                <div key={wo.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono font-bold">{wo.wo_number}</span>
                        {getPriorityBadge(wo.priority)}
                        {getStatusBadge(wo.wo_status)}
                        {getScheduleBadge(wo)}
                      </div>
                      <p className="font-medium">{wo.product?.name || "—"}</p>
                      <p className="text-sm text-muted-foreground">
                        {wo.production_line?.line_name || "No line assigned"}
                        {wo.target_stage_code && (
                          <span className="ml-2">• Stage: {wo.target_stage_code}</span>
                        )}
                      </p>
                      <div className="flex gap-4 mt-2 text-sm">
                        <span>
                          <strong>Target:</strong> {wo.target_quantity} {wo.target_uom}
                        </span>
                        {wo.due_date && (
                          <span>
                            <strong>Due:</strong> {format(new Date(wo.due_date), "MMM d")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {/* Edit button - always visible for non-completed orders */}
                      {wo.wo_status !== "Completed" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditWorkOrder(wo)}
                          className="gap-1"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </Button>
                      )}
                      {/* Delete button - only visible to managers/admins */}
                      {canDeleteWorkOrders && wo.wo_status !== "Completed" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteWorkOrder(wo)}
                          className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      )}
                      {!activeClock && (
                        <Button
                          size="sm"
                          onClick={() => handleClockIn(wo.id)}
                          disabled={clockInMutation.isPending}
                          className="gap-1"
                        >
                          <PlayCircle className="h-4 w-4" />
                          Clock In
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/manufacturing/shop-floor/${wo.id}`)}
                        className="gap-1"
                      >
                        <Package className="h-4 w-4" />
                        Execute
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Work Order Dialog */}
      <WorkOrderFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        canEdit={isManager || isAdmin}
      />

      {/* Edit Work Order Dialog */}
      <WorkOrderFormDialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) setSelectedWorkOrder(null);
        }}
        workOrder={selectedWorkOrder as WorkOrder | null}
        canEdit={isManager || isAdmin}
      />

      {/* Delete Work Order Dialog */}
      <DeleteWorkOrderDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open);
          if (!open) setWorkOrderToDelete(null);
        }}
        workOrder={workOrderToDelete}
      />
    </div>
  );
}
