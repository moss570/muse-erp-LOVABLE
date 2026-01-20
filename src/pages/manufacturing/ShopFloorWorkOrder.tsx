import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Scan, Package, CheckCircle, AlertTriangle, Loader2, DollarSign, Clock } from "lucide-react";
import { toast } from "sonner";

interface WorkOrderDetail {
  id: string;
  wo_number: string;
  wo_status: string;
  target_quantity: number;
  target_uom: string;
  actual_total_cost: number | null;
  product?: { id: string; name: string; material_code: string } | null;
  work_order_materials?: Array<{
    id: string;
    material_id: string;
    planned_quantity: number;
    planned_uom: string;
    actual_quantity: number | null;
    material?: { id: string; name: string; material_code: string } | null;
  }>;
  work_order_stage_progress?: Array<{
    id: string;
    stage_status: string;
    cumulative_total_cost: number;
    stage?: { id: string; stage_code: string; stage_name: string; sequence_order: number } | null;
  }>;
}

interface StagedMaterial {
  id: string;
  scanned_lot_number: string;
  quantity_to_use: number;
  quantity_uom: string;
  lot_total_cost: number;
  ai_validation_status: string;
  is_committed: boolean;
  material?: { id: string; name: string } | null;
}

export default function ShopFloorWorkOrder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [scanInput, setScanInput] = useState("");
  const [currentStage, setCurrentStage] = useState("BASE_PREP");
  const [outputQuantity, setOutputQuantity] = useState(0);
  const [wasteQuantity, setWasteQuantity] = useState(0);

  // Get work order details
  const { data: workOrder, isLoading } = useQuery({
    queryKey: ["shop-floor-wo", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_orders")
        .select(`
          *,
          product:materials!work_orders_product_id_fkey(id, name, material_code),
          work_order_materials(
            *,
            material:materials(id, name, material_code)
          ),
          work_order_stage_progress(
            *,
            stage:production_stages_master(id, stage_code, stage_name, sequence_order)
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as unknown as WorkOrderDetail;
    },
    enabled: !!id,
  });

  // Get staged materials
  const { data: stagedMaterials = [] } = useQuery({
    queryKey: ["staged-materials", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("material_consumption_staging")
        .select(`
          *,
          material:materials(id, name)
        `)
        .eq("work_order_id", id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as StagedMaterial[];
    },
    enabled: !!id,
  });

  // Stage material mutation
  const stageMaterialMutation = useMutation({
    mutationFn: async ({ lotNumber, materialId, quantity }: { lotNumber: string; materialId: string; quantity: number }) => {
      const { data, error } = await supabase.rpc("stage_material_for_consumption", {
        p_work_order_id: id,
        p_lot_number: lotNumber,
        p_material_id: materialId,
        p_quantity: quantity,
        p_scan_method: "Manual",
        p_production_stage: currentStage,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["staged-materials", id] });
        queryClient.invalidateQueries({ queryKey: ["shop-floor-wo", id] });
        toast.success("Material staged", {
          description: `Cost: $${data.total_cost?.toFixed(2) || '0.00'}`,
        });
        setScanInput("");
      } else {
        toast.error("Staging failed", {
          description: data.error || "Invalid lot",
        });
      }
    },
    onError: (error: any) => {
      toast.error("Failed to stage material", { description: error.message });
    },
  });

  // Commit staged materials mutation
  const commitMaterialsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("commit_staged_materials", {
        p_work_order_id: id,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["staged-materials", id] });
      queryClient.invalidateQueries({ queryKey: ["shop-floor-wo", id] });
      toast.success("Materials committed", {
        description: `${data.committed_count} items • $${data.total_cost?.toFixed(2) || '0.00'}`,
      });
    },
    onError: (error: any) => {
      toast.error("Failed to commit materials", { description: error.message });
    },
  });

  // Complete stage mutation
  const completeStageMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("complete_production_stage", {
        p_work_order_id: id,
        p_stage_code: currentStage,
        p_output_quantity: outputQuantity,
        p_waste_quantity: wasteQuantity,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["shop-floor-wo", id] });
      toast.success("Stage completed", {
        description: `Yield: ${data.yield_percentage?.toFixed(1) || '0'}% • Cost: $${data.stage_costs?.total?.toFixed(2) || '0.00'}`,
      });
    },
    onError: (error: any) => {
      toast.error("Failed to complete stage", { description: error.message });
    },
  });

  const handleScanMaterial = () => {
    if (!scanInput.trim()) {
      toast.error("Enter a lot number");
      return;
    }
    
    // For now, we'll need to select the material - in practice this would come from barcode data
    const firstMaterial = workOrder?.work_order_materials?.[0];
    if (!firstMaterial?.material_id) {
      toast.error("No materials configured for this work order");
      return;
    }

    stageMaterialMutation.mutate({
      lotNumber: scanInput.trim(),
      materialId: firstMaterial.material_id,
      quantity: firstMaterial.planned_quantity,
    });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!workOrder) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Work order not found</p>
          <Button onClick={() => navigate("/shop-floor")} className="mt-4">
            Back to Shop Floor
          </Button>
        </div>
      </AppLayout>
    );
  }

  const stageProgress = workOrder.work_order_stage_progress || [];
  const completedStages = stageProgress.filter((s) => s.stage_status === "Completed").length;
  const totalStages = stageProgress.length;
  const progressPercent = totalStages > 0 ? (completedStages / totalStages) * 100 : 0;

  const uncommittedMaterials = stagedMaterials.filter((m) => !m.is_committed);
  const approvedUncommitted = uncommittedMaterials.filter((m) => m.ai_validation_status === "Approved");

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/shop-floor")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {workOrder.wo_number}
              <Badge variant={workOrder.wo_status === "In Progress" ? "default" : "secondary"}>
                {workOrder.wo_status}
              </Badge>
            </h1>
            <p className="text-muted-foreground">{workOrder.product?.name || "—"}</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Package className="h-4 w-4" />
                Target
              </div>
              <p className="text-xl font-bold">
                {workOrder.target_quantity} {workOrder.target_uom}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                Actual Cost
              </div>
              <p className="text-xl font-bold font-mono">
                ${workOrder.actual_total_cost?.toFixed(2) || "0.00"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <CheckCircle className="h-4 w-4" />
                Progress
              </div>
              <p className="text-xl font-bold">
                {completedStages}/{totalStages} stages
              </p>
              <Progress value={progressPercent} className="mt-2" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Scan className="h-4 w-4" />
                Staged
              </div>
              <p className="text-xl font-bold">
                {uncommittedMaterials.length} items
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="materials" className="space-y-4">
          <TabsList>
            <TabsTrigger value="materials">Materials</TabsTrigger>
            <TabsTrigger value="stages">Stages</TabsTrigger>
            <TabsTrigger value="complete">Complete Stage</TabsTrigger>
          </TabsList>

          <TabsContent value="materials">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scan className="h-5 w-5" />
                  Scan Materials
                </CardTitle>
                <CardDescription>
                  Scan lot barcodes or enter manually
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter or scan lot number..."
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleScanMaterial()}
                    className="text-lg"
                  />
                  <Button
                    onClick={handleScanMaterial}
                    disabled={stageMaterialMutation.isPending}
                    size="lg"
                  >
                    {stageMaterialMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Scan className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Staged Materials */}
                {uncommittedMaterials.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Staged Materials</h4>
                      <Button
                        size="sm"
                        onClick={() => commitMaterialsMutation.mutate()}
                        disabled={approvedUncommitted.length === 0 || commitMaterialsMutation.isPending}
                      >
                        Commit {approvedUncommitted.length} Items
                      </Button>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Lot #</TableHead>
                          <TableHead>Material</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Cost</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {uncommittedMaterials.map((m) => (
                          <TableRow key={m.id}>
                            <TableCell className="font-mono">{m.scanned_lot_number}</TableCell>
                            <TableCell>{m.material?.name || "—"}</TableCell>
                            <TableCell className="text-right">
                              {m.quantity_to_use} {m.quantity_uom}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              ${m.lot_total_cost?.toFixed(2) || '0.00'}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  m.ai_validation_status === "Approved"
                                    ? "default"
                                    : m.ai_validation_status === "Warning"
                                    ? "secondary"
                                    : "destructive"
                                }
                              >
                                {m.ai_validation_status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Required Materials */}
                <div className="space-y-2">
                  <h4 className="font-medium">Required Materials</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Material</TableHead>
                        <TableHead className="text-right">Planned</TableHead>
                        <TableHead className="text-right">Actual</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(workOrder.work_order_materials || []).map((wom) => (
                        <TableRow key={wom.id}>
                          <TableCell>{wom.material?.name || "—"}</TableCell>
                          <TableCell className="text-right">
                            {wom.planned_quantity} {wom.planned_uom}
                          </TableCell>
                          <TableCell className="text-right">
                            {wom.actual_quantity || 0} {wom.planned_uom}
                          </TableCell>
                          <TableCell>
                            {(wom.actual_quantity || 0) >= wom.planned_quantity ? (
                              <Badge variant="default">Complete</Badge>
                            ) : (
                              <Badge variant="outline">Pending</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stages">
            <Card>
              <CardHeader>
                <CardTitle>Production Stages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stageProgress
                    .sort((a, b) => (a.stage?.sequence_order || 0) - (b.stage?.sequence_order || 0))
                    .map((sp) => (
                      <div
                        key={sp.id}
                        className={`p-4 rounded-lg border ${
                          sp.stage_status === "Completed"
                            ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                            : sp.stage_status === "In Progress"
                            ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"
                            : "bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{sp.stage?.stage_name || "Unknown Stage"}</p>
                            <p className="text-sm text-muted-foreground">{sp.stage?.stage_code}</p>
                          </div>
                          <div className="text-right">
                            <Badge
                              variant={
                                sp.stage_status === "Completed"
                                  ? "default"
                                  : sp.stage_status === "In Progress"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {sp.stage_status}
                            </Badge>
                            <p className="text-sm font-mono mt-1">
                              ${sp.cumulative_total_cost?.toFixed(2) || '0.00'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="complete">
            <Card>
              <CardHeader>
                <CardTitle>Complete Current Stage</CardTitle>
                <CardDescription>
                  Enter output quantity and waste to complete the stage
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Output Quantity</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={outputQuantity}
                      onChange={(e) => setOutputQuantity(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Waste Quantity</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={wasteQuantity}
                      onChange={(e) => setWasteQuantity(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="mt-1"
                    />
                  </div>
                </div>

                <Button
                  onClick={() => completeStageMutation.mutate()}
                  disabled={completeStageMutation.isPending || outputQuantity <= 0}
                  className="w-full"
                  size="lg"
                >
                  {completeStageMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Complete Stage
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
