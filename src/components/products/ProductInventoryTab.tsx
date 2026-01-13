import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, MapPin, Calendar } from "lucide-react";
import { format, differenceInDays } from "date-fns";

interface ProductInventoryTabProps {
  productId: string;
}

interface ProductionLot {
  id: string;
  lot_number: string;
  quantity_produced: number;
  status: string;
  approval_status: string;
  expiry_date: string | null;
  production_date: string;
  machine: {
    id: string;
    name: string;
  } | null;
}

export function ProductInventoryTab({ productId }: ProductInventoryTabProps) {
  // Fetch production lots for this product
  const { data: lots = [], isLoading } = useQuery({
    queryKey: ["product-inventory", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_lots")
        .select(`
          id,
          lot_number,
          quantity_produced,
          status,
          approval_status,
          expiry_date,
          production_date,
          machine:machines(id, name)
        `)
        .eq("product_id", productId)
        .order("production_date", { ascending: false });

      if (error) throw error;
      return data as unknown as ProductionLot[];
    },
  });

  // Calculate totals
  const totalQuantity = lots.reduce((sum, lot) => sum + (lot.quantity_produced || 0), 0);
  const approvedLots = lots.filter((l) => l.approval_status === "Approved");
  const approvedQuantity = approvedLots.reduce((sum, lot) => sum + (lot.quantity_produced || 0), 0);

  // Group by machine (since production_lots doesn't have location)
  const byMachine = lots.reduce((acc, lot) => {
    const machineName = lot.machine?.name || "Unassigned";
    if (!acc[machineName]) {
      acc[machineName] = { quantity: 0, lots: 0 };
    }
    acc[machineName].quantity += lot.quantity_produced || 0;
    acc[machineName].lots += 1;
    return acc;
  }, {} as Record<string, { quantity: number; lots: number }>);

  const getExpirationBadge = (expirationDate: string | null) => {
    if (!expirationDate) return null;
    const daysUntilExpiry = differenceInDays(new Date(expirationDate), new Date());
    
    if (daysUntilExpiry < 0) {
      return <Badge variant="destructive">Expired</Badge>;
    } else if (daysUntilExpiry <= 30) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Expiring Soon</Badge>;
    }
    return null;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default">Completed</Badge>;
      case "in_progress":
        return <Badge variant="secondary">In Progress</Badge>;
      case "planned":
        return <Badge variant="outline">Planned</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getApprovalBadge = (status: string) => {
    switch (status) {
      case "Approved":
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case "Pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "Rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "On Hold":
        return <Badge variant="outline">On Hold</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Inventory
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{totalQuantity.toLocaleString()}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {lots.length} production lots
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Available (Approved)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-green-500" />
              <span className="text-2xl font-bold text-green-600">
                {approvedQuantity.toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {approvedLots.length} approved lots
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Machines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">
                {Object.keys(byMachine).length}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              production machines
            </p>
          </CardContent>
        </Card>
      </div>

      {/* By Machine */}
      <Card>
        <CardHeader>
          <CardTitle>Production by Machine</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(byMachine).map(([machine, data]) => (
              <div
                key={machine}
                className="flex items-center justify-between p-3 bg-muted rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{machine}</span>
                </div>
                <div className="text-right">
                  <span className="font-semibold">{data.quantity.toLocaleString()}</span>
                  <span className="text-sm text-muted-foreground ml-2">
                    ({data.lots} lots)
                  </span>
                </div>
              </div>
            ))}
            {Object.keys(byMachine).length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                No inventory records found
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lot Details */}
      <Card>
        <CardHeader>
          <CardTitle>Production Lot Details</CardTitle>
          <CardDescription>
            All production lots for this product
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lot Number</TableHead>
                <TableHead>Production Date</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Machine</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Approval</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lots.map((lot) => (
                <TableRow key={lot.id}>
                  <TableCell className="font-mono font-medium">
                    {lot.lot_number}
                  </TableCell>
                  <TableCell>
                    {format(new Date(lot.production_date), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {lot.expiry_date
                        ? format(new Date(lot.expiry_date), "MMM d, yyyy")
                        : "-"}
                      {getExpirationBadge(lot.expiry_date)}
                    </div>
                  </TableCell>
                  <TableCell>{lot.machine?.name || "-"}</TableCell>
                  <TableCell className="text-right font-medium">
                    {lot.quantity_produced?.toLocaleString()}
                  </TableCell>
                  <TableCell>{getStatusBadge(lot.status)}</TableCell>
                  <TableCell>{getApprovalBadge(lot.approval_status)}</TableCell>
                </TableRow>
              ))}
              {lots.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No production lots found for this product
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
