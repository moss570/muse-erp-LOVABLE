import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Warehouse,
  Package,
  Truck,
  ClipboardList,
  MapPin,
  Calendar,
  Loader2,
  Plus,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import {
  use3PLLocations,
  use3PLInventory,
  usePickRequests,
} from "@/hooks/use3PL";
import { PickRequestDialog } from "@/components/3pl/PickRequestDialog";
import { PickExecutionDialog } from "@/components/3pl/PickExecutionDialog";

export default function ThreePLDashboard() {
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [showPickRequestDialog, setShowPickRequestDialog] = useState(false);
  const [selectedPickRequestId, setSelectedPickRequestId] = useState<string | null>(null);

  const { data: locations = [], isLoading: locationsLoading } = use3PLLocations();
  const { data: inventory = [], isLoading: inventoryLoading } = use3PLInventory(selectedLocationId);
  const { data: pickRequests = [], isLoading: pickRequestsLoading } = usePickRequests(selectedLocationId || undefined);

  // Calculate inventory summary
  const inventorySummary = inventory.reduce((acc, pallet) => {
    const cases = pallet.pallet_cases?.filter((c: any) => !c.removed_at) || [];
    cases.forEach((palletCase: any) => {
      const productId = palletCase.production_lot?.product?.id;
      const productName = palletCase.production_lot?.product?.name || 'Unknown';
      if (productId) {
        if (!acc[productId]) {
          acc[productId] = { name: productName, cases: 0, pallets: new Set() };
        }
        acc[productId].cases += palletCase.quantity || 1;
        acc[productId].pallets.add(pallet.id);
      }
    });
    return acc;
  }, {} as Record<string, { name: string; cases: number; pallets: Set<string> }>);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      in_progress: "default",
      completed: "outline",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const getPriorityBadge = (priority: string | null) => {
    if (!priority || priority === 'normal') return null;
    const colors: Record<string, string> = {
      low: "bg-gray-100 text-gray-700",
      high: "bg-orange-100 text-orange-700",
      urgent: "bg-red-100 text-red-700",
    };
    return (
      <Badge variant="outline" className={colors[priority]}>
        {priority}
      </Badge>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Warehouse className="h-8 w-8" />
              3PL Dashboard
            </h1>
            <p className="text-muted-foreground">
              Manage inventory at third-party logistics locations
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Select
              value={selectedLocationId || ""}
              onValueChange={(v) => setSelectedLocationId(v || null)}
            >
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Select 3PL Location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {loc.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedLocationId && (
              <Button onClick={() => setShowPickRequestDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Pick Request
              </Button>
            )}
          </div>
        </div>

        {!selectedLocationId ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Warehouse className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a 3PL location to view inventory and pick requests</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="inventory" className="space-y-4">
            <TabsList>
              <TabsTrigger value="inventory" className="gap-2">
                <Package className="h-4 w-4" />
                Inventory
              </TabsTrigger>
              <TabsTrigger value="picks" className="gap-2">
                <ClipboardList className="h-4 w-4" />
                Pick Requests
              </TabsTrigger>
              <TabsTrigger value="pallets" className="gap-2">
                <Truck className="h-4 w-4" />
                Pallets
              </TabsTrigger>
            </TabsList>

            {/* Inventory Tab */}
            <TabsContent value="inventory" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Pallets
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{inventory.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Cases
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {Object.values(inventorySummary).reduce((sum, p) => sum + p.cases, 0)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Products
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {Object.keys(inventorySummary).length}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Inventory by Product</CardTitle>
                </CardHeader>
                <CardContent>
                  {inventoryLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : Object.keys(inventorySummary).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No inventory at this location
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Cases</TableHead>
                          <TableHead className="text-right">Pallets</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(inventorySummary).map(([productId, data]) => (
                          <TableRow key={productId}>
                            <TableCell className="font-medium">{data.name}</TableCell>
                            <TableCell className="text-right">{data.cases}</TableCell>
                            <TableCell className="text-right">{data.pallets.size}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Pick Requests Tab */}
            <TabsContent value="picks" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Pick Requests</CardTitle>
                  <CardDescription>Active and recent pick requests for this location</CardDescription>
                </CardHeader>
                <CardContent>
                  {pickRequestsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : pickRequests.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No pick requests for this location
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Request #</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pickRequests.map((request) => (
                          <TableRow key={request.id}>
                            <TableCell className="font-mono">{request.request_number}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                {format(new Date(request.request_date), "MMM d, yyyy")}
                              </div>
                            </TableCell>
                            <TableCell>{request.customer?.name || "—"}</TableCell>
                            <TableCell>{getStatusBadge(request.status)}</TableCell>
                            <TableCell>{getPriorityBadge(request.priority)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedPickRequestId(request.id)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                {request.status === 'pending' || request.status === 'in_progress'
                                  ? 'Execute'
                                  : 'View'}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Pallets Tab */}
            <TabsContent value="pallets" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Pallets at Location</CardTitle>
                </CardHeader>
                <CardContent>
                  {inventoryLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : inventory.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No pallets at this location
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {inventory.map((pallet: any) => {
                        const activeCases = pallet.pallet_cases?.filter((c: any) => !c.removed_at) || [];
                        return (
                          <Card key={pallet.id} className="border">
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-base font-mono">
                                  {pallet.pallet_number}
                                </CardTitle>
                                <Badge variant="outline">
                                  {activeCases.length} cases
                                </Badge>
                              </div>
                              <CardDescription>
                                Built {format(new Date(pallet.build_date), "MMM d, yyyy")}
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="grid gap-2">
                                {activeCases.slice(0, 5).map((palletCase: any) => (
                                  <div
                                    key={palletCase.id}
                                    className="flex items-center justify-between p-2 bg-muted rounded text-sm"
                                  >
                                    <span>{palletCase.production_lot?.product?.name}</span>
                                    <span className="font-mono text-xs">
                                      {palletCase.production_lot?.lot_number}
                                    </span>
                                  </div>
                                ))}
                                {activeCases.length > 5 && (
                                  <div className="text-sm text-muted-foreground text-center">
                                    +{activeCases.length - 5} more cases
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Pick Request Dialog */}
      <PickRequestDialog
        open={showPickRequestDialog}
        onOpenChange={setShowPickRequestDialog}
        locationId={selectedLocationId || ""}
      />

      {/* Pick Execution Dialog */}
      <PickExecutionDialog
        open={!!selectedPickRequestId}
        onOpenChange={(open) => !open && setSelectedPickRequestId(null)}
        pickRequestId={selectedPickRequestId || ""}
      />
    </AppLayout>
  );
}