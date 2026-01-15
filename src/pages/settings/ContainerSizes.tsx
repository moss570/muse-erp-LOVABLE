import { useState } from "react";
import { useContainerSizes, ContainerSize, ContainerSizeInput } from "@/hooks/useContainerSizes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";

export default function ContainerSizes() {
  const { containerSizes, isLoading, createContainerSize, updateContainerSize, deleteContainerSize } = useContainerSizes();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSize, setEditingSize] = useState<ContainerSize | null>(null);
  const [formData, setFormData] = useState<ContainerSizeInput>({
    name: "",
    volume_gallons: 0,
    sku_code: "",
    target_weight_kg: null,
    min_weight_kg: null,
    max_weight_kg: null,
    is_active: true,
    sort_order: 0,
  });

  const handleOpenCreate = () => {
    setEditingSize(null);
    setFormData({
      name: "",
      volume_gallons: 0,
      sku_code: "",
      target_weight_kg: null,
      min_weight_kg: null,
      max_weight_kg: null,
      is_active: true,
      sort_order: containerSizes?.length || 0,
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (size: ContainerSize) => {
    setEditingSize(size);
    setFormData({
      name: size.name,
      volume_gallons: size.volume_gallons,
      sku_code: size.sku_code,
      target_weight_kg: size.target_weight_kg,
      min_weight_kg: size.min_weight_kg,
      max_weight_kg: size.max_weight_kg,
      is_active: size.is_active,
      sort_order: size.sort_order,
    });
    setDialogOpen(true);
  };

  const validateForm = (): boolean => {
    if (!formData.name || !formData.sku_code || formData.volume_gallons <= 0) {
      toast.error("Name, SKU code, and volume are required");
      return false;
    }

    if (formData.sku_code.length < 1 || formData.sku_code.length > 4) {
      toast.error("SKU code must be 1-4 characters");
      return false;
    }

    // Validate weight constraints if provided
    const min = formData.min_weight_kg;
    const target = formData.target_weight_kg;
    const max = formData.max_weight_kg;

    if (min !== null && target !== null && min >= target) {
      toast.error("Min weight must be less than target weight");
      return false;
    }

    if (target !== null && max !== null && target >= max) {
      toast.error("Target weight must be less than max weight");
      return false;
    }

    if (min !== null && max !== null && min >= max) {
      toast.error("Min weight must be less than max weight");
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      if (editingSize) {
        await updateContainerSize.mutateAsync({ id: editingSize.id, ...formData });
      } else {
        await createContainerSize.mutateAsync(formData);
      }
      setDialogOpen(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this container size?")) {
      await deleteContainerSize.mutateAsync(id);
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Container Sizes</h1>
          <p className="text-muted-foreground">
            Configure standardized container sizes with volume, SKU codes, and weight specifications for quality control
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Container Size
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Container Sizes</CardTitle>
          <CardDescription>
            Container sizes define standard volumes and weight specifications for products
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Volume (gal)</TableHead>
                <TableHead>SKU Code</TableHead>
                <TableHead>Target (kg)</TableHead>
                <TableHead>Min (kg)</TableHead>
                <TableHead>Max (kg)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {containerSizes?.map((size) => (
                <TableRow key={size.id}>
                  <TableCell>
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  </TableCell>
                  <TableCell className="font-medium">{size.name}</TableCell>
                  <TableCell>{size.volume_gallons}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{size.sku_code}</Badge>
                  </TableCell>
                  <TableCell>{size.target_weight_kg ?? "-"}</TableCell>
                  <TableCell>{size.min_weight_kg ?? "-"}</TableCell>
                  <TableCell>{size.max_weight_kg ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={size.is_active ? "default" : "secondary"}>
                      {size.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(size)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(size.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!containerSizes || containerSizes.length === 0) && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No container sizes found. Create your first container size to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingSize ? "Edit Container Size" : "New Container Size"}
            </DialogTitle>
            <DialogDescription>
              Configure container volume, SKU code, and weight specifications
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Half Gallon"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku_code">SKU Code *</Label>
                <Input
                  id="sku_code"
                  value={formData.sku_code}
                  onChange={(e) => setFormData({ ...formData, sku_code: e.target.value.toUpperCase() })}
                  placeholder="e.g., 08"
                  maxLength={4}
                />
                <p className="text-xs text-muted-foreground">2-4 character code for SKU generation</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="volume">Volume (Gallons) *</Label>
              <Input
                id="volume"
                type="number"
                step="0.0001"
                min="0"
                value={formData.volume_gallons || ""}
                onChange={(e) => setFormData({ ...formData, volume_gallons: parseFloat(e.target.value) || 0 })}
                placeholder="e.g., 0.5"
              />
              <p className="text-xs text-muted-foreground">Volume in gallons for production reporting</p>
            </div>

            <div className="border-t pt-4 space-y-4">
              <h4 className="font-medium text-sm">Weight Specifications (Optional)</h4>
              <p className="text-xs text-muted-foreground">
                Set default weight targets and ranges for quality control
              </p>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="target_weight">Target (kg)</Label>
                  <Input
                    id="target_weight"
                    type="number"
                    step="0.01"
                    value={formData.target_weight_kg ?? ""}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      target_weight_kg: e.target.value ? parseFloat(e.target.value) : null 
                    })}
                    placeholder="e.g., 2.27"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min_weight">Min (kg)</Label>
                  <Input
                    id="min_weight"
                    type="number"
                    step="0.01"
                    value={formData.min_weight_kg ?? ""}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      min_weight_kg: e.target.value ? parseFloat(e.target.value) : null 
                    })}
                    placeholder="e.g., 2.20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_weight">Max (kg)</Label>
                  <Input
                    id="max_weight"
                    type="number"
                    step="0.01"
                    value={formData.max_weight_kg ?? ""}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      max_weight_kg: e.target.value ? parseFloat(e.target.value) : null 
                    })}
                    placeholder="e.g., 2.35"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Active</Label>
                <p className="text-sm text-muted-foreground">
                  Inactive sizes won't appear in product forms
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={createContainerSize.isPending || updateContainerSize.isPending}
            >
              {editingSize ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
