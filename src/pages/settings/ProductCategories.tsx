import { useState } from "react";
import { useProductCategories, ProductCategory, ProductCategoryInput } from "@/hooks/useProductCategories";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, GripVertical, FlaskConical, FileText } from "lucide-react";
import { toast } from "sonner";

export default function ProductCategories() {
  const { categories, isLoading, createCategory, updateCategory, deleteCategory } = useProductCategories();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [formData, setFormData] = useState<ProductCategoryInput>({
    name: "",
    code: "",
    sku_prefix: "",
    description: "",
    qa_parameters: [],
    spec_sheet_sections: [],
    is_active: true,
    sort_order: 0,
  });

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setFormData({
      name: "",
      code: "",
      sku_prefix: "",
      description: "",
      qa_parameters: [],
      spec_sheet_sections: [],
      is_active: true,
      sort_order: categories?.length || 0,
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (category: ProductCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      code: category.code,
      sku_prefix: (category as any).sku_prefix || "",
      description: category.description || "",
      qa_parameters: (category.qa_parameters || []) as unknown as ProductCategoryInput["qa_parameters"],
      spec_sheet_sections: (category.spec_sheet_sections || []) as unknown as ProductCategoryInput["spec_sheet_sections"],
      is_active: category.is_active,
      sort_order: category.sort_order,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.code) {
      toast.error("Name and code are required");
      return;
    }

    try {
      if (editingCategory) {
        await updateCategory.mutateAsync({ id: editingCategory.id, ...formData });
      } else {
        await createCategory.mutateAsync(formData);
      }
      setDialogOpen(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this category?")) {
      await deleteCategory.mutateAsync(id);
    }
  };

  const generateCode = (name: string) => {
    return name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  };

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Product Categories</h1>
          <p className="text-muted-foreground">
            Configure product categories with QA parameters and spec sheet templates
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
          <CardDescription>
            Categories define default QA parameters and spec sheet sections for products
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>QA Parameters</TableHead>
                <TableHead>Spec Sections</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories?.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  </TableCell>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{category.code}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <FlaskConical className="h-4 w-4 text-muted-foreground" />
                      <span>{category.qa_parameters?.length || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>{category.spec_sheet_sections?.length || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={category.is_active ? "default" : "secondary"}>
                      {category.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(category)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(category.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!categories || categories.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No categories found. Create your first category to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Category" : "New Category"}
            </DialogTitle>
            <DialogDescription>
              Configure category settings, QA parameters, and spec sheet sections
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Category Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setFormData({
                      ...formData,
                      name,
                      code: formData.code || generateCode(name),
                    });
                  }}
                  placeholder="e.g., Ice Cream"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., ICECR"
                  maxLength={10}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sku_prefix">SKU Prefix</Label>
              <Input
                id="sku_prefix"
                value={(formData as any).sku_prefix || ""}
                onChange={(e) => setFormData({ ...formData, sku_prefix: e.target.value.toUpperCase() } as any)}
                placeholder="e.g., G, IC14, IC10"
                maxLength={5}
              />
              <p className="text-xs text-muted-foreground">This prefix will be used to generate product SKUs</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description for this category"
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Active</Label>
                <p className="text-sm text-muted-foreground">
                  Inactive categories won't appear in product forms
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground mb-2">
                QA parameters and spec sheet sections can be configured after creating the category.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={createCategory.isPending || updateCategory.isPending}
            >
              {editingCategory ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
