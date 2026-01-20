import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Package, Building, Calendar, User, AlertTriangle, CheckCircle, XCircle, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface HoldEntry {
  id: string;
  receiving_lot_id: string;
  hold_reason_code_id: string;
  hold_reason_description: string | null;
  hold_placed_at: string;
  hold_placed_by: string | null;
  auto_hold: boolean;
  status: string;
  priority: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  resolution_type: string | null;
  supplier_point_assessed: boolean;
  supplier_point_reason: string | null;
  capa_id: string | null;
  receiving_lot: {
    id: string;
    internal_lot_number: string;
    supplier_lot_number: string | null;
    quantity_received: number;
    material: { id: string; name: string; code: string } | null;
    supplier: { id: string; name: string } | null;
    unit: { id: string; code: string; name: string } | null;
  } | null;
  reason: { id: string; code: string; name: string; supplier_points: number } | null;
}

interface HoldDetailDialogProps {
  hold: HoldEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
}

export function HoldDetailDialog({ hold, open, onOpenChange, onRefresh }: HoldDetailDialogProps) {
  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "destructive" | "warning" | "success" | "secondary" | "default"; label: string }> = {
      pending: { variant: "destructive", label: "Pending" },
      under_review: { variant: "warning", label: "Under Review" },
      released: { variant: "success", label: "Released" },
      rejected: { variant: "secondary", label: "Rejected" },
      disposed: { variant: "secondary", label: "Disposed" },
      returned: { variant: "secondary", label: "Returned" }
    };
    const config = variants[status] || { variant: "default", label: status };
    return <Badge variant={config.variant as any} className="text-sm">{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      critical: 'bg-red-500 text-white',
      high: 'bg-orange-500 text-white',
      medium: 'bg-yellow-500 text-white',
      low: 'bg-blue-500 text-white'
    };
    return (
      <Badge className={cn(colors[priority] || 'bg-gray-500 text-white')}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Hold Details
            </DialogTitle>
            <div className="flex gap-2">
              {getStatusBadge(hold.status)}
              {getPriorityBadge(hold.priority)}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Lot Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                Lot Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Internal Lot #</p>
                <p className="font-mono font-medium">{hold.receiving_lot?.internal_lot_number}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Supplier Lot #</p>
                <p className="font-mono">{hold.receiving_lot?.supplier_lot_number || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Material</p>
                <p className="font-medium">{hold.receiving_lot?.material?.name}</p>
                <p className="text-xs text-muted-foreground">{hold.receiving_lot?.material?.code}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Quantity</p>
                <p className="font-medium">
                  {hold.receiving_lot?.quantity_received} {hold.receiving_lot?.unit?.code}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Supplier Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building className="h-4 w-4" />
                Supplier Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Supplier</p>
                <p className="font-medium">{hold.receiving_lot?.supplier?.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Points Assessed</p>
                {hold.supplier_point_assessed ? (
                  <Badge variant="outline" className="text-destructive">
                    +{hold.reason?.supplier_points} points
                  </Badge>
                ) : (
                  <p className="text-muted-foreground">Not assessed</p>
                )}
              </div>
              {hold.supplier_point_reason && (
                <div className="col-span-2">
                  <p className="text-muted-foreground">Point Assessment Reason</p>
                  <p>{hold.supplier_point_reason}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Hold Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Hold Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground">Reason</p>
                  <p className="font-medium">{hold.reason?.name}</p>
                  <p className="text-xs text-muted-foreground">{hold.reason?.code}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Hold Type</p>
                  <Badge variant={hold.auto_hold ? "secondary" : "outline"}>
                    {hold.auto_hold ? "Automatic" : "Manual"}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Hold Date</p>
                  <p>{format(new Date(hold.hold_placed_at), 'PPP p')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Placed By</p>
                  <p>{hold.hold_placed_by ? 'User' : 'System'}</p>
                </div>
              </div>
              {hold.hold_reason_description && (
                <div>
                  <p className="text-muted-foreground">Description</p>
                  <p className="bg-muted p-3 rounded-md mt-1">{hold.hold_reason_description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resolution Information (if resolved) */}
          {hold.resolved_at && (
            <Card className={cn(
              hold.status === 'released' ? 'border-green-500' : 'border-destructive'
            )}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  {hold.status === 'released' ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  Resolution
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground">Resolution Type</p>
                    <p className="font-medium capitalize">{hold.resolution_type?.replace(/_/g, ' ')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Resolved Date</p>
                    <p>{format(new Date(hold.resolved_at), 'PPP p')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Resolved By</p>
                    <p>{hold.resolved_by ? 'User' : 'Unknown'}</p>
                  </div>
                </div>
                {hold.resolution_notes && (
                  <div>
                    <p className="text-muted-foreground">Resolution Notes</p>
                    <p className="bg-muted p-3 rounded-md mt-1">{hold.resolution_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* CAPA Link */}
          {hold.capa_id && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Linked CAPA
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm">
                  View CAPA #{hold.capa_id.slice(0, 8)}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-end mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
