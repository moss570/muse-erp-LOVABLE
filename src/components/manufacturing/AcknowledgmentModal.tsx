import { useState } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, Loader2 } from "lucide-react";
import { UnfulfilledItem, useCreateAcknowledgment } from "@/hooks/useUnfulfilledSalesOrders";
import { PriorityBadge } from "./PriorityBadge";
import { toast } from "sonner";

interface AcknowledgmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: UnfulfilledItem[];
  onAcknowledged: (acknowledgmentId: string) => void;
}

export function AcknowledgmentModal({
  open,
  onOpenChange,
  items,
  onAcknowledged,
}: AcknowledgmentModalProps) {
  const [isChecked, setIsChecked] = useState(false);
  const [notes, setNotes] = useState("");
  const createAcknowledgment = useCreateAcknowledgment();

  // Get top 5 critical items
  const topItems = items.slice(0, 5);
  const totalSOs = new Set(items.flatMap((i) => i.sales_order_numbers)).size;

  const handleAcknowledge = async () => {
    try {
      const result = await createAcknowledgment.mutateAsync({
        items,
        notes: notes.trim() || undefined,
      });
      toast.success("Unfulfilled orders acknowledged");
      setIsChecked(false);
      setNotes("");
      onOpenChange(false);
      onAcknowledged(result.id);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error("Failed to acknowledge", { description: message });
    }
  };

  const handleClose = () => {
    setIsChecked(false);
    setNotes("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-5 w-5" />
            Acknowledge Unfulfilled Sales Orders
          </DialogTitle>
          <DialogDescription>
            You currently have <strong>{items.length} items</strong> on backorder affecting{" "}
            <strong>{totalSOs} sales orders</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Critical Items Summary */}
          <div>
            <Label className="text-sm font-medium">Critical Items Summary:</Label>
            <div className="mt-2 border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[50px]">Prio</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Shortage</TableHead>
                    <TableHead>Due Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topItems.map((item, index) => (
                    <TableRow key={item.product_size_id}>
                      <TableCell>
                        <PriorityBadge level={item.priority_level} rank={index + 1} />
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {item.product_code}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {item.shortage_quantity} CS
                      </TableCell>
                      <TableCell>
                        {item.earliest_due_date
                          ? format(new Date(item.earliest_due_date), "MMM d, yyyy")
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {items.length > 5 && (
              <p className="text-xs text-muted-foreground mt-1">
                ...and {items.length - 5} more items
              </p>
            )}
          </div>

          {/* Acknowledgment Checkbox */}
          <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg border">
            <Checkbox
              id="acknowledge"
              checked={isChecked}
              onCheckedChange={(checked) => setIsChecked(checked === true)}
            />
            <Label htmlFor="acknowledge" className="text-sm leading-relaxed cursor-pointer">
              I acknowledge these unfulfilled orders and understand the production priorities
            </Label>
          </div>

          {/* Optional Note */}
          <div className="space-y-2">
            <Label htmlFor="notes">Optional Note:</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this acknowledgment..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAcknowledge}
            disabled={!isChecked || createAcknowledgment.isPending}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {createAcknowledgment.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Acknowledge & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
