import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, GripVertical, Edit, AlertTriangle, Factory } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface ProductionLine {
  id: string;
  line_code: string;
  line_name: string;
  line_type: "Batch" | "Continuous";
  capacity_value?: number;
  capacity_uom?: string;
  capacity_basis?: string;
  average_runtime_hours?: number;
  changeover_time_minutes?: number;
  cleaning_time_minutes?: number;
  is_allergen_dedicated: boolean;
  dedicated_allergen?: string;
  is_active: boolean;
  sort_order?: number;
  notes?: string;
}

function SortableLineCard({
  line,
  onEdit,
  onToggleActive,
}: {
  line: ProductionLine;
  onEdit: (line: ProductionLine) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: line.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={!line.is_active ? "opacity-50" : ""}>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <button
              className="mt-1 cursor-move touch-none"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </button>

            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold">{line.line_name}</h3>
                  <Badge variant="outline" className="font-mono">
                    {line.line_code}
                  </Badge>
                  {line.is_allergen_dedicated && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {line.dedicated_allergen} Only
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={line.is_active}
                    onCheckedChange={(checked) => onToggleActive(line.id, checked)}
                  />
                  <span className="text-sm text-muted-foreground">
                    {line.is_active ? "Active" : "Inactive"}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => onEdit(line)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <span className="font-medium">{line.line_type}</span>
                {line.capacity_value && (
                  <span>
                    {line.capacity_value} {line.capacity_uom}/
                    {line.capacity_basis?.replace("per_", "")}
                  </span>
                )}
                {line.average_runtime_hours && (
                  <span>{line.average_runtime_hours} hrs avg runtime</span>
                )}
              </div>

              <div className="flex items-center gap-6 text-sm">
                <span className="text-muted-foreground">
                  Changeover:{" "}
                  <span className="font-medium">{line.changeover_time_minutes}min</span>
                </span>
                <span className="text-muted-foreground">
                  Cleaning:{" "}
                  <span className="font-medium">{line.cleaning_time_minutes}min</span>
                </span>
              </div>
            </div>
          </div>

          {line.notes && (
            <div className="mt-3 ml-9 p-3 bg-muted rounded-md text-sm">
              {line.notes}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ProductionLinesSettings() {
  const queryClient = useQueryClient();
  const [editingLine, setEditingLine] = useState<ProductionLine | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: productionLines, isLoading } = useQuery({
    queryKey: ["production-lines-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_lines")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as ProductionLine[];
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("production_lines")
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-lines-settings"] });
      toast.success("Production line updated");
    },
    onError: (error: any) => {
      toast.error("Failed to update", { description: error.message });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (reorderedLines: ProductionLine[]) => {
      const updates = reorderedLines.map((line, index) =>
        supabase
          .from("production_lines")
          .update({ sort_order: index + 1, updated_at: new Date().toISOString() })
          .eq("id", line.id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-lines-settings"] });
      toast.success("Order updated");
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (line: Partial<ProductionLine> & { id?: string }) => {
      if (line.id) {
        const { error } = await supabase
          .from("production_lines")
          .update({
            line_code: line.line_code,
            line_name: line.line_name,
            line_type: line.line_type,
            capacity_value: line.capacity_value,
            capacity_uom: line.capacity_uom,
            capacity_basis: line.capacity_basis,
            average_runtime_hours: line.average_runtime_hours,
            changeover_time_minutes: line.changeover_time_minutes,
            cleaning_time_minutes: line.cleaning_time_minutes,
            is_allergen_dedicated: line.is_allergen_dedicated,
            dedicated_allergen: line.dedicated_allergen,
            notes: line.notes,
            updated_at: new Date().toISOString(),
          })
          .eq("id", line.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("production_lines").insert({
          line_code: line.line_code,
          line_name: line.line_name,
          line_type: line.line_type,
          capacity_value: line.capacity_value,
          capacity_uom: line.capacity_uom,
          capacity_basis: line.capacity_basis,
          average_runtime_hours: line.average_runtime_hours,
          changeover_time_minutes: line.changeover_time_minutes || 30,
          cleaning_time_minutes: line.cleaning_time_minutes || 45,
          is_allergen_dedicated: line.is_allergen_dedicated || false,
          dedicated_allergen: line.dedicated_allergen,
          notes: line.notes,
          is_active: true,
          sort_order: (productionLines?.length || 0) + 1,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-lines-settings"] });
      toast.success(editingLine ? "Line updated" : "Line created");
      setEditingLine(null);
      setIsAddDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error("Failed to save", { description: error.message });
    },
  });

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = productionLines?.findIndex((line) => line.id === active.id);
    const newIndex = productionLines?.findIndex((line) => line.id === over.id);

    if (oldIndex !== undefined && newIndex !== undefined && productionLines) {
      const reordered = arrayMove(productionLines, oldIndex, newIndex);
      reorderMutation.mutate(reordered);
    }
  };

  return (
    <div className="container mx-auto py-6 max-w-5xl space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Factory className="h-8 w-8" />
            Production Lines
          </h1>
          <p className="text-muted-foreground">
            Manage manufacturing lines and capacity settings
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Production Line
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading production lines...</div>
      ) : productionLines?.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground mb-4">No production lines configured</p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Production Line
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={productionLines?.map((l) => l.id) || []}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {productionLines?.map((line) => (
                <SortableLineCard
                  key={line.id}
                  line={line}
                  onEdit={setEditingLine}
                  onToggleActive={(id, isActive) =>
                    toggleActiveMutation.mutate({ id, isActive })
                  }
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Dialog
        open={!!editingLine || isAddDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditingLine(null);
            setIsAddDialogOpen(false);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingLine ? "Edit Production Line" : "Add Production Line"}
            </DialogTitle>
            <DialogDescription>
              Configure production line capacity and settings
            </DialogDescription>
          </DialogHeader>
          <ProductionLineForm
            line={editingLine}
            onSave={(data) => saveMutation.mutate(data)}
            isPending={saveMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProductionLineForm({
  line,
  onSave,
  isPending,
}: {
  line: ProductionLine | null;
  onSave: (data: Partial<ProductionLine>) => void;
  isPending: boolean;
}) {
  const [formData, setFormData] = useState<Partial<ProductionLine>>(
    line || {
      line_type: "Batch",
      capacity_uom: "gal",
      capacity_basis: "per_batch",
      changeover_time_minutes: 30,
      cleaning_time_minutes: 45,
      is_allergen_dedicated: false,
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Line Code *</Label>
          <Input
            value={formData.line_code || ""}
            onChange={(e) => setFormData({ ...formData, line_code: e.target.value })}
            placeholder="e.g., VAT"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Line Name *</Label>
          <Input
            value={formData.line_name || ""}
            onChange={(e) => setFormData({ ...formData, line_name: e.target.value })}
            placeholder="e.g., Vat"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Line Type *</Label>
          <Select
            value={formData.line_type}
            onValueChange={(value: "Batch" | "Continuous") =>
              setFormData({ ...formData, line_type: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Batch">Batch</SelectItem>
              <SelectItem value="Continuous">Continuous</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Capacity Value</Label>
          <Input
            type="number"
            value={formData.capacity_value || ""}
            onChange={(e) =>
              setFormData({ ...formData, capacity_value: parseFloat(e.target.value) })
            }
            placeholder="e.g., 300"
          />
        </div>
        <div className="space-y-2">
          <Label>Capacity UOM</Label>
          <Select
            value={formData.capacity_uom || "gal"}
            onValueChange={(value) => setFormData({ ...formData, capacity_uom: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gal">Gallons</SelectItem>
              <SelectItem value="lbs">Pounds</SelectItem>
              <SelectItem value="kg">Kilograms</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Capacity Basis</Label>
          <Select
            value={formData.capacity_basis || "per_batch"}
            onValueChange={(value) => setFormData({ ...formData, capacity_basis: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="per_batch">Per Batch</SelectItem>
              <SelectItem value="per_hour">Per Hour</SelectItem>
              <SelectItem value="per_day">Per Day</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Average Runtime (hours)</Label>
          <Input
            type="number"
            step="0.5"
            value={formData.average_runtime_hours || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                average_runtime_hours: parseFloat(e.target.value),
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Changeover Time (minutes)</Label>
          <Input
            type="number"
            value={formData.changeover_time_minutes || 30}
            onChange={(e) =>
              setFormData({
                ...formData,
                changeover_time_minutes: parseInt(e.target.value),
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Cleaning Time (minutes)</Label>
          <Input
            type="number"
            value={formData.cleaning_time_minutes || 45}
            onChange={(e) =>
              setFormData({
                ...formData,
                cleaning_time_minutes: parseInt(e.target.value),
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Allergen Dedicated</Label>
          <div className="flex items-center gap-2">
            <Switch
              checked={formData.is_allergen_dedicated || false}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_allergen_dedicated: checked })
              }
            />
            {formData.is_allergen_dedicated && (
              <Input
                value={formData.dedicated_allergen || ""}
                onChange={(e) =>
                  setFormData({ ...formData, dedicated_allergen: e.target.value })
                }
                placeholder="e.g., Dairy"
                className="flex-1"
              />
            )}
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          value={formData.notes || ""}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Additional notes..."
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : line ? "Update Line" : "Create Line"}
        </Button>
      </div>
    </form>
  );
}
