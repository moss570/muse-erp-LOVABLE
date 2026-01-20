import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowRightLeft, Plus, ArrowRight, Package } from "lucide-react";
import { format } from "date-fns";
import { useInventory, InventoryMovement } from "@/hooks/useInventory";
import { TransferDialog } from "@/components/inventory/TransferDialog";

const Transfers = () => {
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("transfer");
  const [showTransferDialog, setShowTransferDialog] = useState(false);

  const { useMovements } = useInventory();
  const { data: movements, isLoading } = useMovements(statusFilter === "all" ? undefined : statusFilter);

  // Filter by movement type
  const filteredMovements = movements?.filter(m => 
    typeFilter === "all" || m.movement_type === typeFilter
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "secondary", label: "Pending" },
      in_progress: { variant: "default", label: "In Progress" },
      completed: { variant: "outline", label: "Completed" },
      cancelled: { variant: "destructive", label: "Cancelled" }
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      transfer: { variant: "default", label: "Transfer" },
      issue_to_production: { variant: "secondary", label: "Issue to Production" }
    };
    const config = variants[type] || { variant: "outline" as const, label: type };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const pendingCount = movements?.filter(m => m.status === "pending").length || 0;
  const inProgressCount = movements?.filter(m => m.status === "in_progress").length || 0;
  const completedCount = movements?.filter(m => m.status === "completed").length || 0;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <ArrowRightLeft className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Transfers</h1>
        </div>
        <Button onClick={() => setShowTransferDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Transfer
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-yellow-600">{pendingCount}</div>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-blue-600">{inProgressCount}</div>
            <p className="text-sm text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-green-600">{completedCount}</div>
            <p className="text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
                <SelectItem value="issue_to_production">Issue to Production</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>From → To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredMovements?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Package className="h-8 w-8 text-muted-foreground/50" />
                      <span>No transfers found</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredMovements?.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>{getTypeBadge(movement.movement_type)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{movement.source_location?.name || "—"}</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{movement.destination_location?.name || "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(movement.status)}</TableCell>
                    <TableCell>
                      {movement.requested_at 
                        ? format(new Date(movement.requested_at), "MMM d, yyyy h:mm a")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {movement.completed_at 
                        ? format(new Date(movement.completed_at), "MMM d, yyyy h:mm a")
                        : "—"}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {movement.notes || "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <TransferDialog 
        open={showTransferDialog} 
        onOpenChange={setShowTransferDialog}
      />
    </div>
  );
};

export default Transfers;