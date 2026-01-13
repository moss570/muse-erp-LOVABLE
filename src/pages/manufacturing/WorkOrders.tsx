import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ClipboardList,
  Plus,
  Search,
  MoreHorizontal,
  Play,
  Beaker,
  Palette,
  Snowflake,
  Package,
  Calendar,
  Loader2,
  Eye,
  Edit,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { useWorkOrders, useDeleteWorkOrder, useStartWorkOrder, type WorkOrderType, type WorkOrderStatus } from "@/hooks/useWorkOrders";
import { WorkOrderFormDialog } from "@/components/manufacturing/WorkOrderFormDialog";
import { useNavigate } from "react-router-dom";

const typeConfig: Record<WorkOrderType, { label: string; icon: React.ReactNode; color: string }> = {
  base: { label: "Base Manufacturing", icon: <Beaker className="h-4 w-4" />, color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  flavoring: { label: "Flavoring", icon: <Palette className="h-4 w-4" />, color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
  freezing: { label: "Freezing", icon: <Snowflake className="h-4 w-4" />, color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300" },
  case_pack: { label: "Case Pack", icon: <Package className="h-4 w-4" />, color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
};

const statusConfig: Record<WorkOrderStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Draft", variant: "outline" },
  scheduled: { label: "Scheduled", variant: "secondary" },
  in_progress: { label: "In Progress", variant: "default" },
  pending_qa: { label: "Pending QA", variant: "secondary" },
  completed: { label: "Completed", variant: "default" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

export default function WorkOrders() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<WorkOrderType | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWorkOrder, setEditingWorkOrder] = useState<any>(null);
  const [defaultType, setDefaultType] = useState<WorkOrderType>("base");
  
  const navigate = useNavigate();
  const { data: workOrders = [], isLoading } = useWorkOrders(selectedType === "all" ? undefined : selectedType);
  const deleteWorkOrder = useDeleteWorkOrder();
  const startWorkOrder = useStartWorkOrder();

  const filteredOrders = workOrders.filter(
    (wo) =>
      wo.work_order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wo.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wo.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = (type: WorkOrderType) => {
    setDefaultType(type);
    setEditingWorkOrder(null);
    setDialogOpen(true);
  };

  const handleEdit = (workOrder: any) => {
    setEditingWorkOrder(workOrder);
    setDialogOpen(true);
  };

  const handleExecute = (workOrder: any) => {
    // Navigate to appropriate execution page based on type
    if (workOrder.work_order_type === "base") {
      navigate(`/manufacturing/base-production?wo=${workOrder.id}`);
    } else {
      navigate(`/manufacturing/finishing?wo=${workOrder.id}`);
    }
  };

  const handleStart = (workOrder: any) => {
    if (workOrder.status === "draft" || workOrder.status === "scheduled") {
      startWorkOrder.mutate(workOrder.id);
    }
  };

  const getPriorityBadge = (priority: number) => {
    if (priority <= 2) return <Badge variant="destructive">High</Badge>;
    if (priority <= 5) return <Badge variant="secondary">Medium</Badge>;
    return <Badge variant="outline">Low</Badge>;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <ClipboardList className="h-8 w-8" />
              Production Work Orders
            </h1>
            <p className="text-muted-foreground">
              Schedule and manage production work orders across all stages
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Work Order
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleCreate("base")}>
                <Beaker className="h-4 w-4 mr-2" />
                Base Manufacturing
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCreate("flavoring")}>
                <Palette className="h-4 w-4 mr-2" />
                Flavoring
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCreate("freezing")}>
                <Snowflake className="h-4 w-4 mr-2" />
                Freezing
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCreate("case_pack")}>
                <Package className="h-4 w-4 mr-2" />
                Case Pack
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by WO number, product, or customer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Tabs value={selectedType} onValueChange={(v) => setSelectedType(v as WorkOrderType | "all")}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="base" className="gap-1">
                    <Beaker className="h-3 w-3" /> Base
                  </TabsTrigger>
                  <TabsTrigger value="flavoring" className="gap-1">
                    <Palette className="h-3 w-3" /> Flavoring
                  </TabsTrigger>
                  <TabsTrigger value="freezing" className="gap-1">
                    <Snowflake className="h-3 w-3" /> Freezing
                  </TabsTrigger>
                  <TabsTrigger value="case_pack" className="gap-1">
                    <Package className="h-3 w-3" /> Case Pack
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {/* Work Orders Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No work orders found</p>
                <p className="text-sm">Create a new work order to get started</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>WO Number</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Target Qty</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((wo) => {
                    const typeInfo = typeConfig[wo.work_order_type];
                    const statusInfo = statusConfig[wo.status];
                    
                    return (
                      <TableRow key={wo.id}>
                        <TableCell className="font-mono font-medium">
                          {wo.work_order_number}
                        </TableCell>
                        <TableCell>
                          <Badge className={`gap-1 ${typeInfo.color}`}>
                            {typeInfo.icon}
                            {typeInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{wo.product?.name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{wo.product?.sku}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {wo.target_quantity} {wo.unit?.code || "units"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(wo.scheduled_date), "MMM d, yyyy")}
                          </div>
                          {wo.deadline && (
                            <div className="text-xs text-muted-foreground">
                              Due: {format(new Date(wo.deadline), "MMM d")}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{getPriorityBadge(wo.priority)}</TableCell>
                        <TableCell>
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        </TableCell>
                        <TableCell>
                          {wo.customer?.name || "—"}
                          {wo.sales_order_reference && (
                            <div className="text-xs text-muted-foreground">
                              SO: {wo.sales_order_reference}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(wo)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              {(wo.status === "draft" || wo.status === "scheduled") && (
                                <DropdownMenuItem onClick={() => handleStart(wo)}>
                                  <Play className="h-4 w-4 mr-2" />
                                  Start Work Order
                                </DropdownMenuItem>
                              )}
                              {wo.status === "in_progress" && (
                                <DropdownMenuItem onClick={() => handleExecute(wo)}>
                                  <Play className="h-4 w-4 mr-2" />
                                  Execute Production
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => deleteWorkOrder.mutate(wo.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <WorkOrderFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        workOrder={editingWorkOrder}
        defaultType={defaultType}
      />
    </AppLayout>
  );
}
