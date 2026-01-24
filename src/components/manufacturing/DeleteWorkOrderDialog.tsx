import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Ban, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermission";

interface WorkOrder {
  id: string;
  wo_number: string;
  product?: { name: string } | null;
}

interface DeleteWorkOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrder: WorkOrder | null;
  onDeleted?: () => void;
}

export function DeleteWorkOrderDialog({
  open,
  onOpenChange,
  workOrder,
  onDeleted,
}: DeleteWorkOrderDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const [adminOverride, setAdminOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const queryClient = useQueryClient();
  const { isAdmin } = usePermissions();

  // Check if work order is scheduled
  const { data: scheduleInfo, isLoading: isLoadingSchedule } = useQuery({
    queryKey: ["work-order-schedule-check", workOrder?.id],
    queryFn: async () => {
      if (!workOrder?.id) return null;
      
      const { data, error } = await supabase
        .from("production_schedule")
        .select("id, schedule_date, schedule_status")
        .eq("work_order_id", workOrder.id)
        .neq("schedule_status", "Cancelled")
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: open && !!workOrder?.id,
  });

  // Check if labor hours have been logged
  const { data: laborInfo, isLoading: isLoadingLabor } = useQuery({
    queryKey: ["work-order-labor-check", workOrder?.id],
    queryFn: async () => {
      if (!workOrder?.id) return null;
      
      const { data, error } = await supabase
        .from("work_order_labor")
        .select("id, hours_worked")
        .eq("work_order_id", workOrder.id)
        .gt("hours_worked", 0)
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: open && !!workOrder?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ workOrderId, useOverride, reason }: { 
      workOrderId: string; 
      useOverride: boolean; 
      reason?: string;
    }) => {
      const { data, error } = await supabase.rpc("delete_work_order_safe", {
        p_work_order_id: workOrderId,
        p_admin_override: useOverride,
        p_override_reason: reason || null,
      });
      
      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; message?: string; admin_override?: boolean };
      if (!result.success) {
        throw new Error(result.error || "Failed to delete work order");
      }
      
      return result;
    },
    onSuccess: (result) => {
      toast.success(result.message || "Work order deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["active-work-orders"] });
      queryClient.invalidateQueries({ queryKey: ["work-orders"] });
      resetState();
      onOpenChange(false);
      onDeleted?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete work order");
    },
  });

  const isLoading = isLoadingSchedule || isLoadingLabor;
  const isScheduled = !!scheduleInfo;
  const hasLabor = !!laborInfo;
  const hasBlockers = isScheduled || hasLabor;
  
  // Can delete normally if no blockers, or can use admin override
  const canDeleteNormally = !hasBlockers;
  const canUseAdminOverride = isAdmin && hasBlockers && adminOverride && overrideReason.trim().length >= 10;
  const canDelete = canDeleteNormally || canUseAdminOverride;
  const isConfirmValid = confirmText === "DELETE";

  const resetState = () => {
    setConfirmText("");
    setAdminOverride(false);
    setOverrideReason("");
  };

  const handleDelete = () => {
    if (workOrder && canDelete && isConfirmValid) {
      deleteMutation.mutate({
        workOrderId: workOrder.id,
        useOverride: hasBlockers && adminOverride,
        reason: overrideReason,
      });
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetState();
    }
    onOpenChange(newOpen);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="sm:max-w-[500px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Work Order
          </AlertDialogTitle>
          <AlertDialogDescription>
            You are about to permanently delete work order{" "}
            <span className="font-semibold text-foreground">
              {workOrder?.wo_number}
            </span>
            {workOrder?.product?.name && (
              <span className="text-muted-foreground">
                {" "}({workOrder.product.name})
              </span>
            )}
            . This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Blocking conditions */}
            {isScheduled && (
              <Alert variant="destructive">
                <Ban className="h-4 w-4" />
                <AlertTitle>Cannot Delete - Scheduled</AlertTitle>
                <AlertDescription>
                  This work order has been scheduled for production. Remove it from
                  the Production Scheduler before deleting.
                </AlertDescription>
              </Alert>
            )}

            {hasLabor && (
              <Alert variant="destructive">
                <Ban className="h-4 w-4" />
                <AlertTitle>Cannot Delete - Labor Logged</AlertTitle>
                <AlertDescription>
                  Labor hours have been logged against this work order. Work orders
                  with logged labor cannot be deleted.
                </AlertDescription>
              </Alert>
            )}

            {/* Admin Override Option */}
            {isAdmin && hasBlockers && (
              <div className="border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-500" />
                  <span className="font-medium text-amber-800 dark:text-amber-300">
                    Admin Override Available
                  </span>
                </div>
                
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="admin-override"
                    checked={adminOverride}
                    onCheckedChange={(checked) => setAdminOverride(checked === true)}
                    className="mt-1"
                  />
                  <div className="space-y-1">
                    <Label htmlFor="admin-override" className="font-medium cursor-pointer">
                      I understand and want to bypass safety checks
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      This action will be logged for audit purposes
                    </p>
                  </div>
                </div>

                {adminOverride && (
                  <div className="space-y-2">
                    <Label htmlFor="override-reason" className="text-sm font-medium">
                      Justification <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="override-reason"
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder="Explain why this override is necessary (minimum 10 characters)..."
                      className="min-h-[80px]"
                    />
                    {overrideReason.length > 0 && overrideReason.trim().length < 10 && (
                      <p className="text-xs text-destructive">
                        Please provide a more detailed justification
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Confirmation input - only show if deletable */}
            {canDelete && (
              <div className="space-y-2">
                <Label htmlFor="confirm-delete" className="text-sm font-medium">
                  Type <span className="font-mono font-bold">DELETE</span> to confirm:
                </Label>
                <Input
                  id="confirm-delete"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type DELETE here"
                  className="font-mono"
                  autoComplete="off"
                />
              </div>
            )}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>
            Cancel
          </AlertDialogCancel>
          {canDelete && (
            <AlertDialogAction
              onClick={handleDelete}
              disabled={!isConfirmValid || deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : hasBlockers && adminOverride ? (
                <>
                  <ShieldAlert className="mr-2 h-4 w-4" />
                  Override & Delete
                </>
              ) : (
                "Delete Work Order"
              )}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
