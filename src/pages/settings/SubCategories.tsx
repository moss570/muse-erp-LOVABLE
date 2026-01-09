import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil, Trash2, Layers } from 'lucide-react';
import { DataTableHeader, StatusIndicator } from '@/components/ui/data-table';
import { DataTablePagination } from '@/components/ui/data-table/DataTablePagination';
import { SettingsBreadcrumb } from '@/components/settings/SettingsBreadcrumb';

const MATERIAL_CATEGORIES = [
  { value: 'Ingredients', label: 'Ingredients' },
  { value: 'Packaging', label: 'Packaging' },
  { value: 'Boxes', label: 'Boxes' },
  { value: 'Chemical', label: 'Chemical' },
  { value: 'Supplies', label: 'Supplies' },
  { value: 'Maintenance', label: 'Maintenance' },
  { value: 'Direct Sale', label: 'Direct Sale' },
] as const;

const subCategorySchema = z.object({
  category: z.string().min(1, 'Category is required'),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  sort_order: z.coerce.number().min(0).default(0),
  is_active: z.boolean().default(true),
});

type SubCategoryFormData = z.infer<typeof subCategorySchema>;

interface SubCategory {
  id: string;
  category: string;
  name: string;
  description: string | null;
  sort_order: number | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
}

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export default function SubCategories() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubCategory, setEditingSubCategory] = useState<SubCategory | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<SubCategoryFormData>({
    resolver: zodResolver(subCategorySchema),
    defaultValues: {
      category: '',
      name: '',
      description: '',
      sort_order: 0,
      is_active: true,
    },
  });

  const { data: subCategories, isLoading, refetch } = useQuery({
    queryKey: ['material-sub-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('material_sub_categories')
        .select('*')
        .order('category')
        .order('sort_order')
        .order('name');
      if (error) throw error;
      return data as SubCategory[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: SubCategoryFormData) => {
      const { error } = await supabase.from('material_sub_categories').insert([{
        category: data.category,
        name: data.name,
        description: data.description || null,
        sort_order: data.sort_order,
        is_active: data.is_active,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-sub-categories'] });
      toast({ title: 'Sub-category created successfully' });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating sub-category', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: SubCategoryFormData }) => {
      const { error } = await supabase
        .from('material_sub_categories')
        .update({
          category: data.category,
          name: data.name,
          description: data.description || null,
          sort_order: data.sort_order,
          is_active: data.is_active,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-sub-categories'] });
      toast({ title: 'Sub-category updated successfully' });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating sub-category', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('material_sub_categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-sub-categories'] });
      toast({ title: 'Sub-category deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting sub-category', description: error.message, variant: 'destructive' });
    },
  });

  const handleOpenDialog = (subCategory?: SubCategory) => {
    if (subCategory) {
      setEditingSubCategory(subCategory);
      form.reset({
        category: subCategory.category,
        name: subCategory.name,
        description: subCategory.description || '',
        sort_order: subCategory.sort_order || 0,
        is_active: subCategory.is_active ?? true,
      });
    } else {
      setEditingSubCategory(null);
      form.reset({
        category: '',
        name: '',
        description: '',
        sort_order: 0,
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingSubCategory(null);
    form.reset();
  };

  const onSubmit = (data: SubCategoryFormData) => {
    if (editingSubCategory) {
      updateMutation.mutate({ id: editingSubCategory.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Filter and paginate
  const filteredSubCategories = subCategories?.filter((sc) => {
    const matchesSearch = sc.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'active' && sc.is_active) ||
      (statusFilter === 'inactive' && !sc.is_active);
    const matchesCategory = categoryFilter === 'all' || sc.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const totalItems = filteredSubCategories?.length || 0;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedSubCategories = filteredSubCategories?.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Group by category for display
  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'Ingredients': return 'bg-green-100 text-green-800 border-green-200';
      case 'Packaging': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Boxes': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Chemical': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Supplies': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'Maintenance': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Direct Sale': return 'bg-pink-100 text-pink-800 border-pink-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-4">
      <SettingsBreadcrumb currentPage="Sub-Categories" />
      <DataTableHeader
        title="Material Sub-Categories"
        subtitle="Manage sub-categories for each material category"
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search sub-categories..."
        filterValue={statusFilter}
        onFilterChange={(value) => {
          setStatusFilter(value);
          setCurrentPage(1);
        }}
        filterOptions={STATUS_FILTER_OPTIONS}
        filterPlaceholder="All Status"
        onAdd={() => handleOpenDialog()}
        addLabel="Add Sub-Category"
        onRefresh={() => refetch()}
        isLoading={isLoading}
        totalCount={subCategories?.length}
        filteredCount={filteredSubCategories?.length}
      />

      {/* Category Filter */}
      <div className="flex items-center gap-2">
        <Select value={categoryFilter} onValueChange={(value) => { setCategoryFilter(value); setCurrentPage(1); }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {MATERIAL_CATEGORIES.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border bg-card">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[50px]">Status</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[80px]">Order</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSubCategories?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <Layers className="mx-auto h-10 w-10 mb-3 opacity-30" />
                      <p className="font-medium">No sub-categories found</p>
                      <p className="text-sm">Try adjusting your search or filter</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedSubCategories?.map((subCategory) => (
                    <TableRow 
                      key={subCategory.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleOpenDialog(subCategory)}
                    >
                      <TableCell>
                        <StatusIndicator status={subCategory.is_active ? 'active' : 'inactive'} />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getCategoryBadgeColor(subCategory.category)}>
                          {subCategory.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{subCategory.name}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[300px] truncate">
                        {subCategory.description || '-'}
                      </TableCell>
                      <TableCell className="text-center">{subCategory.sort_order}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDialog(subCategory);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteMutation.mutate(subCategory.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {totalItems > 0 && (
              <DataTablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={totalItems}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
              />
            )}
          </>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSubCategory ? 'Edit Sub-Category' : 'Add Sub-Category'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MATERIAL_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Sub-category name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Optional description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sort_order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sort Order</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel className="text-base">Active</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        This sub-category will be available for selection
                      </p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingSubCategory ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}