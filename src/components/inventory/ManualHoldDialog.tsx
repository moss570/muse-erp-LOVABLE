import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Loader2 } from "lucide-react";

interface ManualHoldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const ManualHoldDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: ManualHoldDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [receivingLotId, setReceivingLotId] = useState("");
  const [reasonCodeId, setReasonCodeId] = useState("");
  const [priority, setPriority] = useState("medium");
  const [description, setDescription] = useState("");

  // Fetch available receiving lots (not already on hold)
  const { data: receivingLots, isLoading: lotsLoading } = useQuery({
    queryKey: ["receiving-lots-available"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("receiving_lots")
        .select(
          `
          id,
          internal_lot_number,
          supplier_lot_number,
          hold_status,
          material:materials(id, name, code),
          supplier:suppliers(id, name)
        `
        )
        .or("hold_status.is.null,hold_status.eq.none,hold_status.eq.released")
        .order("received_date", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch hold reason codes
  const { data: reasonCodes } = useQuery({
    queryKey: ["hold-reason-codes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hold_reason_codes")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const createHoldMutation = useMutation({
    mutationFn: async () => {
      const user = (await supabase.auth.getUser()).data.user;

      // Create the hold entry
      const { error: holdError } = await supabase
        .from("inventory_holds")
        .insert({
          receiving_lot_id: receivingLotId,
          hold_reason_code_id: reasonCodeId,
          hold_reason_description: description || null,
          hold_placed_by: user?.id,
          auto_hold: false,
          status: "pending",
          priority: priority,
        });

      if (holdError) throw holdError;

      // Update the receiving lot status
      const { error: lotError } = await supabase
        .from("receiving_lots")
        .update({
          hold_status: "on_hold",
        })
        .eq("id", receivingLotId);

      if (lotError) throw lotError;

      return true;
    },
    onSuccess: () => {
      toast({
        title: "Hold Created",
        description: "The lot has been placed on hold.",
      });
      queryClient.invalidateQueries({ queryKey: ["hold-log"] });
      queryClient.invalidateQueries({ queryKey: ["hold-log-summary"] });
      resetForm();
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setReceivingLotId("");
    setReasonCodeId("");
    setPriority("medium");
    setDescription("");
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const isValid = receivingLotId && reasonCodeId;

  const selectedLot = receivingLots?.find((l) => l.id === receivingLotId);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Place Lot on Hold
          </DialogTitle>
          <DialogDescription>
            Manually place a receiving lot on hold for investigation or review.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Receiving Lot Selection */}
          <div className="space-y-2">
            <Label htmlFor="lot">Receiving Lot *</Label>
            <Select value={receivingLotId} onValueChange={setReceivingLotId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a lot..." />
              </SelectTrigger>
              <SelectContent>
                {lotsLoading ? (
                  <div className="p-2 text-sm text-muted-foreground">
                    Loading...
                  </div>
                ) : !receivingLots?.length ? (
                  <div className="p-2 text-sm text-muted-foreground">
                    No available lots
                  </div>
                ) : (
                  receivingLots.map((lot) => (
                    <SelectItem key={lot.id} value={lot.id}>
                      <div className="flex flex-col">
                        <span className="font-mono">
                          {lot.internal_lot_number}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {lot.material?.name}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            {selectedLot && (
              <div className="text-sm p-2 bg-muted rounded-md">
                <p>
                  <strong>Material:</strong> {selectedLot.material?.name}
                </p>
                <p>
                  <strong>Supplier:</strong> {selectedLot.supplier?.name}
                </p>
                <p>
                  <strong>Supplier Lot:</strong>{" "}
                  {selectedLot.supplier_lot_number || "-"}
                </p>
              </div>
            )}
          </div>

          {/* Hold Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Hold Reason *</Label>
            <Select value={reasonCodeId} onValueChange={setReasonCodeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason..." />
              </SelectTrigger>
              <SelectContent>
                {reasonCodes?.map((reason) => (
                  <SelectItem key={reason.id} value={reason.id}>
                    <div className="flex flex-col">
                      <span>{reason.name}</span>
                      {reason.supplier_points > 0 && (
                        <span className="text-xs text-destructive">
                          +{reason.supplier_points} supplier points
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Additional Notes</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter any additional details about this hold..."
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={() => createHoldMutation.mutate()}
            disabled={!isValid || createHoldMutation.isPending}
            variant="destructive"
          >
            {createHoldMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 mr-2" />
                Place on Hold
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
