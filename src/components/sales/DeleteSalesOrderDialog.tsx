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
import { AlertTriangle, Ban, Loader2, Package, Truck } from "lucide-react";
import { toast } from "sonner";

interface DeleteSalesOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: {
    id: string;
    order_number: string;
    status: string;
    customer?: { name: string } | null;
  } | null;
  onDeleted?: () => void;
}

export function DeleteSalesOrderDialog({
  open,
  onOpenChange,
  order,
  onDeleted,
}: DeleteSalesOrderDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const queryClient = useQueryClient();

  // Check if picking has started (any items picked)
  const { data: pickingInfo, isLoading: isLoadingPicking } = useQuery({
    queryKey: ["sales-order-picking-check", order?.id],
    queryFn: async () => {
      if (!order?.id) return null;

      const { data, error } = await supabase
        .from("sales_order_items")
        .select("id, quantity_picked")
        .eq("sales_order_id", order.id)
        .gt("quantity_picked", 0)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: open && !!order?.id,
  });

  // Check if shipping has started (any items shipped)
  const { data: shippingInfo, isLoading: isLoadingShipping } = useQuery({
    queryKey: ["sales-order-shipping-check", order?.id],
    queryFn: async () => {
      if (!order?.id) return null;

      const { data, error } = await supabase
        .from("sales_order_items")
        .select("id, quantity_shipped")
        .eq("sales_order_id", order.id)
        .gt("quantity_shipped", 0)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: open && !!order?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: async (orderId: string) => {
      // First delete order items
      const { error: itemsError } = await supabase
        .from("sales_order_items")
        .delete()
        .eq("sales_order_id", orderId);

      if (itemsError) throw itemsError;

      // Then delete the order
      const { error } = await supabase
        .from("sales_orders")
        .delete()
        .eq("id", orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Order ${order?.order_number} deleted successfully`);
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      resetState();
      onOpenChange(false);
      onDeleted?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete order");
    },
  });

  const isLoading = isLoadingPicking || isLoadingShipping;
  const hasPickingStarted = !!pickingInfo;
  const hasShippingStarted = !!shippingInfo;
  const hasBlockers = hasPickingStarted || hasShippingStarted;
  const canDelete = !hasBlockers;
  const isConfirmValid = confirmText === "DELETE";

  const resetState = () => {
    setConfirmText("");
  };

  const handleDelete = () => {
    if (order && canDelete && isConfirmValid) {
      deleteMutation.mutate(order.id);
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
            Delete Sales Order
          </AlertDialogTitle>
          <AlertDialogDescription>
            You are about to permanently delete order{" "}
            <span className="font-semibold text-foreground">
              {order?.order_number}
            </span>
            {order?.customer?.name && (
              <span className="text-muted-foreground">
                {" "}
                ({order.customer.name})
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
            {hasPickingStarted && (
              <Alert variant="destructive">
                <Package className="h-4 w-4" />
                <AlertTitle>Cannot Delete - Picking Started</AlertTitle>
                <AlertDescription>
                  Items have been picked for this order. Orders with picked
                  items cannot be deleted.
                </AlertDescription>
              </Alert>
            )}

            {hasShippingStarted && (
              <Alert variant="destructive">
                <Truck className="h-4 w-4" />
                <AlertTitle>Cannot Delete - Shipping Started</AlertTitle>
                <AlertDescription>
                  Items have been shipped for this order. Orders with shipped
                  items cannot be deleted.
                </AlertDescription>
              </Alert>
            )}

            {/* Show status info if blocked */}
            {hasBlockers && (
              <p className="text-sm text-muted-foreground">
                To delete this order, all picking and shipping activity must be
                reversed first.
              </p>
            )}

            {/* Confirmation input - only show if deletable */}
            {canDelete && (
              <div className="space-y-2">
                <Label htmlFor="confirm-delete" className="text-sm font-medium">
                  Type <span className="font-mono font-bold">DELETE</span> to
                  confirm:
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
                "Delete Order"
              )}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
