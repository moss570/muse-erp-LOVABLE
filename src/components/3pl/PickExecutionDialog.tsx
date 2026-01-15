import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  Package,
  Loader2,
  QrCode,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { usePickRequestItems, useRecordPick, useCompletePickRequest } from "@/hooks/use3PL";
import { toast } from "sonner";

interface PickExecutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pickRequestId: string;
}

export function PickExecutionDialog({
  open,
  onOpenChange,
  pickRequestId,
}: PickExecutionDialogProps) {
  const [currentItemIndex, setCurrentItemIndex] = useState(0);

  const { data: pickRequest } = useQuery({
    queryKey: ["pick-request", pickRequestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pick_requests")
        .select(`
          *,
          location:locations(name),
          customer:customers(name)
        `)
        .eq("id", pickRequestId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!pickRequestId && open,
  });

  const { data: items = [], isLoading: itemsLoading } = usePickRequestItems(pickRequestId);
  const recordPick = useRecordPick();
  const completeRequest = useCompletePickRequest();

  // Get suggested cases for current item (FEFO)
  const currentItem = items[currentItemIndex];
  const { data: suggestedCases = [] } = useQuery({
    queryKey: ["suggested-cases", currentItem?.product_id, pickRequest?.location_id],
    queryFn: async () => {
      if (!currentItem || !pickRequest) return [];

      const { data, error } = await supabase
        .from("pallet_cases")
        .select(`
          id,
          case_label_id,
          quantity,
          pallet:pallets!inner(id, pallet_number, location_id),
          production_lot:production_lots!inner(
            id,
            lot_number,
            expiry_date,
            product_id
          )
        `)
        .eq("pallet.location_id", pickRequest.location_id)
        .eq("production_lot.product_id", currentItem.product_id)
        .is("removed_at", null)
        .order("production_lot.expiry_date", { ascending: true })
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: !!currentItem && !!pickRequest && open,
  });

  const handlePickCase = async (palletCase: any) => {
    if (!currentItem) return;

    await recordPick.mutateAsync({
      pickRequestItemId: currentItem.id,
      palletId: palletCase.pallet?.id,
      palletCaseId: palletCase.id,
      productionLotId: palletCase.production_lot?.id,
      quantityPicked: palletCase.quantity || 1,
      scanVerified: true,
    });

    // Check if item is complete
    const newPickedQty = (currentItem.quantity_picked || 0) + (palletCase.quantity || 1);
    if (newPickedQty >= currentItem.quantity_requested) {
      // Move to next item
      if (currentItemIndex < items.length - 1) {
        setCurrentItemIndex(currentItemIndex + 1);
        toast.success("Item complete, moving to next");
      } else {
        toast.success("All items picked!");
      }
    }
  };

  const handleComplete = async () => {
    await completeRequest.mutateAsync(pickRequestId);
  };

  const allItemsComplete = items.every(
    (item) => item.quantity_picked >= item.quantity_requested
  );

  const totalProgress = items.length > 0
    ? (items.reduce((sum, item) => sum + Math.min(item.quantity_picked, item.quantity_requested), 0) /
      items.reduce((sum, item) => sum + item.quantity_requested, 0)) * 100
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Pick Execution - {pickRequest?.request_number}
          </DialogTitle>
          <DialogDescription>
            {pickRequest?.customer?.name
              ? `For ${pickRequest.customer.name}`
              : "Internal transfer"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Overall Progress</span>
              <span className="font-medium">{Math.round(totalProgress)}%</span>
            </div>
            <Progress value={totalProgress} />
          </div>

          {/* Item Status */}
          <div className="flex flex-wrap gap-2">
            {items.map((item, index) => (
              <Button
                key={item.id}
                variant={index === currentItemIndex ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentItemIndex(index)}
                className="gap-1"
              >
                {item.quantity_picked >= item.quantity_requested ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <span className="text-xs">
                    {item.quantity_picked}/{item.quantity_requested}
                  </span>
                )}
                {item.product?.name?.slice(0, 15)}
              </Button>
            ))}
          </div>

          {/* Current Item */}
          {currentItem && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {currentItem.product?.name}
                  </CardTitle>
                  <Badge>
                    {currentItem.quantity_picked} / {currentItem.quantity_requested} {currentItem.unit_type}s
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {itemsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground mb-3">
                      Suggested cases (FEFO order):
                    </p>
                    {suggestedCases.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        No available cases found
                      </div>
                    ) : (
                      suggestedCases.map((palletCase: any) => (
                        <div
                          key={palletCase.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <QrCode className="h-4 w-4 text-muted-foreground" />
                              <span className="font-mono text-sm">
                                {palletCase.production_lot?.lot_number}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>Pallet: {palletCase.pallet?.pallet_number}</span>
                              {palletCase.production_lot?.expiry_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Exp: {format(new Date(palletCase.production_lot.expiry_date), "MMM d, yyyy")}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handlePickCase(palletCase)}
                            disabled={recordPick.isPending}
                          >
                            {recordPick.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Pick
                              </>
                            )}
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Footer */}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {allItemsComplete && (
              <>
                <Button
                  onClick={handleComplete}
                  disabled={completeRequest.isPending}
                >
                  {completeRequest.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Complete
                </Button>
                <Button
                  onClick={async () => {
                    await handleComplete();
                    onOpenChange(false);
                  }}
                  disabled={completeRequest.isPending}
                >
                  {completeRequest.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Complete & Close
                </Button>
              </>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}