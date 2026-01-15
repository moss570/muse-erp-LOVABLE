import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil, Trash2, FolderTree } from 'lucide-react';
import { DataTableHeader, StatusIndicator } from '@/components/ui/data-table';
import { DataTablePagination } from '@/components/ui/data-table/DataTablePagination';
import { SettingsBreadcrumb } from '@/components/settings/SettingsBreadcrumb';

const categorySchema = z.object({
  code: z.string().min(1, 'Code is required').max(10, 'Code must be 10 characters or less'),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  sort_order: z.coerce.number().min(0).default(0),
  is_active: z.boolean().default(true),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface ListedMaterialCategory {
  id: string;
  name: string;
  code: string;
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

export default function MaterialNameCategories() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ListedMaterialCategory | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      code: '',
      name: '',
      sort_order: 0,
      is_active: true,
    },
  });

  // Fetch categories
  const { data: categories, isLoading, refetch } = useQuery({
    queryKey: ['listed-material-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listed_material_categories')
        .select('*')
        .order('sort_order')
        .order('name');
      if (error) throw error;
      return data as ListedMaterialCategory[];
    },
  });

  // Fetch linked material counts per category
  const { data: materialCounts } = useQuery({
    queryKey: ['category-material-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listed_material_names')
        .select('category_id');
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data.forEach(item => {
        if (item.category_id) {
          counts[item.category_id] = (counts[item.category_id] || 0) + 1;
        }
      });
      return counts;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      const { error } = await supabase.from('listed_material_categories').insert([{
        code: data.code.toUpperCase(),
        name: data.name,
        sort_order: data.sort_order,
        is_active: data.is_active,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listed-material-categories'] });
      toast({ title: 'Category created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating category', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CategoryFormData }) => {
      const { error } = await supabase
        .from('listed_material_categories')
        .update({
          code: data.code.toUpperCase(),
          name: data.name,
          sort_order: data.sort_order,
          is_active: data.is_active,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listed-material-categories'] });
      toast({ title: 'Category updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating category', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('listed_material_categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listed-material-categories'] });
      toast({ title: 'Category deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting category', description: error.message, variant: 'destructive' });
    },
  });

  const handleOpenDialog = (category?: ListedMaterialCategory) => {
    if (category) {
      setEditingCategory(category);
      form.reset({
        code: category.code,
        name: category.name,
        sort_order: category.sort_order ?? 0,
        is_active: category.is_active ?? true,
      });
    } else {
      setEditingCategory(null);
      form.reset({
        code: '',
        name: '',
        sort_order: 0,
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCategory(null);
    form.reset();
  };

  const onSubmit = (data: CategoryFormData) => {
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Filter and paginate
  const filteredCategories = categories?.filter((c) => {
    const matchesSearch = 
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'active' && c.is_active) ||
      (statusFilter === 'inactive' && !c.is_active);
    return matchesSearch && matchesStatus;
  });

  const totalItems = filteredCategories?.length || 0;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedCategories = filteredCategories?.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-4">
      <SettingsBreadcrumb currentPage="Material Name Categories" />
      
      <DataTableHeader
        title="Material Name Categories"
        subtitle="Organize listed material names into categories for easier selection"
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search categories..."
        filterValue={statusFilter}
        onFilterChange={(value) => {
          setStatusFilter(value);
          setCurrentPage(1);
        }}
        filterOptions={STATUS_FILTER_OPTIONS}
        filterPlaceholder="All Status"
        onAdd={() => handleOpenDialog()}
        addLabel="Add Category"
        onRefresh={() => refetch()}
        isLoading={isLoading}
        totalCount={categories?.length}
        filteredCount={filteredCategories?.length}
      />

      <div className="rounded-md border bg-card">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[50px]">Status</TableHead>
                  <TableHead className="w-[100px]">Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-center w-[100px]">Sort Order</TableHead>
                  <TableHead className="text-center">Linked Materials</TableHead>
                  <TableHead className="w-[120px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCategories?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <FolderTree className="mx-auto h-10 w-10 mb-3 opacity-30" />
                      <p className="font-medium">No categories found</p>
                      <p className="text-sm">Try adjusting your search or filter</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedCategories?.map((category) => {
                    const linkedCount = materialCounts?.[category.id] || 0;
                    return (
                      <TableRow 
                        key={category.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleOpenDialog(category)}
                      >
                        <TableCell>
                          <StatusIndicator status={category.is_active ? 'active' : 'inactive'} />
                        </TableCell>
                        <TableCell className="font-mono text-sm font-medium">{category.code}</TableCell>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell className="text-center text-muted-foreground">{category.sort_order ?? 0}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={linkedCount > 0 ? "default" : "secondary"} className="h-5 min-w-[20px]">
                            {linkedCount}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDialog(category);
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
                                if (linkedCount > 0) {
                                  toast({ 
                                    title: 'Cannot delete', 
                                    description: 'Category has linked materials. Remove or reassign them first.',
                                    variant: 'destructive' 
                                  });
                                } else {
                                  deleteMutation.mutate(category.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Add Category'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., FLA" 
                        {...field} 
                        className="font-mono uppercase"
                        maxLength={10}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
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
                      <Input placeholder="e.g., Flavors & Extracts" {...field} maxLength={100} />
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
                      <Input 
                        type="number" 
                        placeholder="0" 
                        {...field} 
                        min={0}
                      />
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
                        Category is available for selection
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
                  {editingCategory ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
