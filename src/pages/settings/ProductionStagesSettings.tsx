import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit, Trash2, Loader2, Layers } from "lucide-react";
import { toast } from "sonner";

interface ProductionStage {
  id: string;
  stage_code: string;
  stage_name: string;
  sequence_order: number;
  stage_type: string;
  captures_material_cost: boolean;
  captures_labor_cost: boolean;
  captures_overhead: boolean;
  requires_qc_approval: boolean;
  creates_intermediate_lot: boolean;
  standard_labor_hours_per_unit: number | null;
  is_active: boolean;
  description: string | null;
}

export default function ProductionStagesSettings() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<ProductionStage | null>(null);
  const [formData, setFormData] = useState({
    stage_code: "",
    stage_name: "",
    sequence_order: 1,
    stage_type: "Processing",
    captures_material_cost: true,
    captures_labor_cost: true,
    captures_overhead: false,
    requires_qc_approval: false,
    creates_intermediate_lot: false,
    standard_labor_hours_per_unit: 0,
    description: "",
  });

  const { data: stages = [], isLoading } = useQuery({
    queryKey: ["production-stages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_stages_master")
        .select("*")
        .order("sequence_order");
      if (error) throw error;
      return data as ProductionStage[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: result, error } = await supabase
        .from("production_stages_master")
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-stages"] });
      toast.success("Stage created");
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error("Failed to create stage", { description: error.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: typeof formData & { id: string }) => {
      const { data: result, error } = await supabase
        .from("production_stages_master")
        .update(data)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-stages"] });
      toast.success("Stage updated");
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error("Failed to update stage", { description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("production_stages_master")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-stages"] });
      toast.success("Stage deleted");
    },
    onError: (error: any) => {
      toast.error("Failed to delete stage", { description: error.message });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("production_stages_master")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-stages"] });
      toast.success("Stage status updated");
    },
  });

  const resetForm = () => {
    setFormData({
      stage_code: "",
      stage_name: "",
      sequence_order: stages.length + 1,
      stage_type: "Processing",
      captures_material_cost: true,
      captures_labor_cost: true,
      captures_overhead: false,
      requires_qc_approval: false,
      creates_intermediate_lot: false,
      standard_labor_hours_per_unit: 0,
      description: "",
    });
    setEditingStage(null);
  };

  const handleEdit = (stage: ProductionStage) => {
    setEditingStage(stage);
    setFormData({
      stage_code: stage.stage_code,
      stage_name: stage.stage_name,
      sequence_order: stage.sequence_order,
      stage_type: stage.stage_type,
      captures_material_cost: stage.captures_material_cost,
      captures_labor_cost: stage.captures_labor_cost,
      captures_overhead: stage.captures_overhead,
      requires_qc_approval: stage.requires_qc_approval,
      creates_intermediate_lot: stage.creates_intermediate_lot,
      standard_labor_hours_per_unit: stage.standard_labor_hours_per_unit || 0,
      description: stage.description || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingStage) {
      updateMutation.mutate({ id: editingStage.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getStageTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      Preparation: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
      Processing: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
      Finishing: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
      Packaging: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
      Quality: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    };
    return <Badge className={colors[type] || ""}>{type}</Badge>;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Layers className="h-8 w-8" />
              Production Stages
            </h1>
            <p className="text-muted-foreground">
              Configure production workflow stages and cost capture settings
            </p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Stage
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Order</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Cost Capture</TableHead>
                    <TableHead>Labor Hrs</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stages.map((stage) => (
                    <TableRow key={stage.id}>
                      <TableCell className="font-mono">{stage.sequence_order}</TableCell>
                      <TableCell className="font-mono font-medium">{stage.stage_code}</TableCell>
                      <TableCell>{stage.stage_name}</TableCell>
                      <TableCell>{getStageTypeBadge(stage.stage_type)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {stage.captures_material_cost && <Badge variant="outline">Mat</Badge>}
                          {stage.captures_labor_cost && <Badge variant="outline">Labor</Badge>}
                          {stage.captures_overhead && <Badge variant="outline">OH</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>{stage.standard_labor_hours_per_unit || "—"}</TableCell>
                      <TableCell>
                        <Switch
                          checked={stage.is_active}
                          onCheckedChange={(checked) =>
                            toggleActiveMutation.mutate({ id: stage.id, is_active: checked })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(stage)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(stage.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingStage ? "Edit Stage" : "Add Stage"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Stage Code *</label>
                <Input
                  value={formData.stage_code}
                  onChange={(e) => setFormData({ ...formData, stage_code: e.target.value })}
                  placeholder="BASE_PREP"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Sequence</label>
                <Input
                  type="number"
                  value={formData.sequence_order}
                  onChange={(e) =>
                    setFormData({ ...formData, sequence_order: parseInt(e.target.value) || 1 })
                  }
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Stage Name *</label>
              <Input
                value={formData.stage_name}
                onChange={(e) => setFormData({ ...formData, stage_name: e.target.value })}
                placeholder="Base Preparation"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Stage Type</label>
              <Select
                value={formData.stage_type}
                onValueChange={(v) => setFormData({ ...formData, stage_type: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Preparation">Preparation</SelectItem>
                  <SelectItem value="Processing">Processing</SelectItem>
                  <SelectItem value="Finishing">Finishing</SelectItem>
                  <SelectItem value="Packaging">Packaging</SelectItem>
                  <SelectItem value="Quality">Quality</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Standard Labor Hours/Unit</label>
              <Input
                type="number"
                step="0.01"
                value={formData.standard_labor_hours_per_unit}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    standard_labor_hours_per_unit: parseFloat(e.target.value) || 0,
                  })
                }
                className="mt-1"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Cost Capture</label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <Switch
                    checked={formData.captures_material_cost}
                    onCheckedChange={(v) => setFormData({ ...formData, captures_material_cost: v })}
                  />
                  <span className="text-sm">Material</span>
                </label>
                <label className="flex items-center gap-2">
                  <Switch
                    checked={formData.captures_labor_cost}
                    onCheckedChange={(v) => setFormData({ ...formData, captures_labor_cost: v })}
                  />
                  <span className="text-sm">Labor</span>
                </label>
                <label className="flex items-center gap-2">
                  <Switch
                    checked={formData.captures_overhead}
                    onCheckedChange={(v) => setFormData({ ...formData, captures_overhead: v })}
                  />
                  <span className="text-sm">Overhead</span>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Options</label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <Switch
                    checked={formData.requires_qc_approval}
                    onCheckedChange={(v) => setFormData({ ...formData, requires_qc_approval: v })}
                  />
                  <span className="text-sm">Requires QC</span>
                </label>
                <label className="flex items-center gap-2">
                  <Switch
                    checked={formData.creates_intermediate_lot}
                    onCheckedChange={(v) => setFormData({ ...formData, creates_intermediate_lot: v })}
                  />
                  <span className="text-sm">Creates WIP Lot</span>
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingStage ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
