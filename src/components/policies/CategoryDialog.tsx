import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import {
  usePolicyCategories,
  useCreatePolicyCategory,
  useUpdatePolicyCategory,
} from '@/hooks/usePolicyCategories';
import type { PolicyCategory, PolicyCategoryFormData } from '@/types/policies';
import { toast } from 'sonner';

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: PolicyCategory | null;
}

const defaultColors = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
];

const defaultIcons = ['📁', '📋', '📄', '📝', '🔒', '⚙️', '📊', '🎯', '✅', '⚡'];

export function CategoryDialog({ open, onOpenChange, category }: CategoryDialogProps) {
  const { data: categories } = usePolicyCategories();
  const createCategory = useCreatePolicyCategory();
  const updateCategory = useUpdatePolicyCategory();

  const isEditMode = !!category;

  const [formData, setFormData] = useState<PolicyCategoryFormData>({
    name: '',
    description: '',
    parent_category_id: null,
    color_hex: defaultColors[0],
    icon_name: '📁',
    is_active: true,
  });

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        description: category.description || '',
        parent_category_id: category.parent_category_id || null,
        color_hex: category.color_hex || defaultColors[0],
        icon_name: category.icon_name || '📁',
        is_active: category.is_active,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        parent_category_id: null,
        color_hex: defaultColors[0],
        icon_name: '📁',
        is_active: true,
      });
    }
  }, [category, open]);

  const handleFieldChange = (field: keyof PolicyCategoryFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    try {
      if (isEditMode) {
        await updateCategory.mutateAsync({ id: category!.id, updates: formData });
        toast.success('Category updated successfully');
      } else {
        await createCategory.mutateAsync(formData);
        toast.success('Category created successfully');
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(isEditMode ? 'Failed to update category' : 'Failed to create category');
    }
  };

  const availableParents = categories?.filter(c => c.id !== category?.id) || [];
  const isSaving = createCategory.isPending || updateCategory.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Edit Category' : 'Create New Category'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the category details below'
              : 'Create a new category to organize policies'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Category Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              placeholder="e.g., Food Safety, Quality Control"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder="Describe this category..."
              rows={3}
            />
          </div>

          {/* Parent Category */}
          <div className="space-y-2">
            <Label htmlFor="parent">Parent Category</Label>
            <Select
              value={formData.parent_category_id || 'none'}
              onValueChange={(value) => handleFieldChange('parent_category_id', value === 'none' ? null : value)}
            >
              <SelectTrigger id="parent">
                <SelectValue placeholder="Select parent category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Parent (Root Category)</SelectItem>
                {availableParents.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Optional: Create hierarchical category structures
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Color */}
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <div className="flex gap-2">
                <Input
                  id="color"
                  type="color"
                  value={formData.color_hex}
                  onChange={(e) => handleFieldChange('color_hex', e.target.value)}
                  className="w-20 h-10 cursor-pointer"
                />
                <Input
                  value={formData.color_hex}
                  onChange={(e) => handleFieldChange('color_hex', e.target.value)}
                  placeholder="#000000"
                  className="flex-1 font-mono"
                />
              </div>
              <div className="flex gap-1 flex-wrap">
                {defaultColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleFieldChange('color_hex', color)}
                    className="h-6 w-6 rounded border-2 border-background hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>

            {/* Icon */}
            <div className="space-y-2">
              <Label htmlFor="icon">Icon</Label>
              <Input
                id="icon"
                value={formData.icon_name}
                onChange={(e) => handleFieldChange('icon_name', e.target.value)}
                placeholder="📁"
                className="text-2xl text-center"
                maxLength={2}
              />
              <div className="flex gap-1 flex-wrap">
                {defaultIcons.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => handleFieldChange('icon_name', icon)}
                    className="h-8 w-8 text-xl hover:bg-muted rounded transition-colors"
                    title={icon}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="is_active">Active</Label>
              <p className="text-xs text-muted-foreground">
                Inactive categories are hidden from users
              </p>
            </div>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => handleFieldChange('is_active', checked)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isSaving ? 'Saving...' : isEditMode ? 'Update Category' : 'Create Category'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
