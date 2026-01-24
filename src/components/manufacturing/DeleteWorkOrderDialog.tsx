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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Ban, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
  const queryClient = useQueryClient();

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
    mutationFn: async (workOrderId: string) => {
      const { data, error } = await supabase.rpc("delete_work_order_safe", {
        p_work_order_id: workOrderId,
      });
      
      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; message?: string };
      if (!result.success) {
        throw new Error(result.error || "Failed to delete work order");
      }
      
      return result;
    },
    onSuccess: (result) => {
      toast.success(result.message || "Work order deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["active-work-orders"] });
      queryClient.invalidateQueries({ queryKey: ["work-orders"] });
      setConfirmText("");
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
  const canDelete = !isScheduled && !hasLabor;
  const isConfirmValid = confirmText === "DELETE";

  const handleDelete = () => {
    if (workOrder && canDelete && isConfirmValid) {
      deleteMutation.mutate(workOrder.id);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setConfirmText("");
    }
    onOpenChange(newOpen);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="sm:max-w-[425px]">
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
