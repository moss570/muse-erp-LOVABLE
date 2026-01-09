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
import { Pencil, Trash2, Package } from 'lucide-react';
import { DataTableHeader, StatusIndicator } from '@/components/ui/data-table';
import { DataTablePagination } from '@/components/ui/data-table/DataTablePagination';
import type { Tables } from '@/integrations/supabase/types';

const materialSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  category: z.string().optional(),
  base_unit_id: z.string().min(1, 'Unit is required'),
  cost_per_base_unit: z.coerce.number().min(0).optional(),
  min_stock_level: z.coerce.number().min(0).optional(),
  is_active: z.boolean().default(true),
});

type MaterialFormData = z.infer<typeof materialSchema>;
type Material = Tables<'materials'>;
type Unit = Tables<'units_of_measure'>;

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'pending_setup', label: 'Pending Set-Up' },
  { value: 'approved', label: 'Approved' },
  { value: 'not_approved', label: 'Not Approved' },
];

export default function Materials() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<MaterialFormData>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      code: '',
      name: '',
      description: '',
      category: '',
      base_unit_id: '',
      cost_per_base_unit: 0,
      min_stock_level: 0,
      is_active: true,
    },
  });

  const { data: materials, isLoading, refetch } = useQuery({
    queryKey: ['materials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('materials')
        .select('*, units_of_measure:base_unit_id(*)')
        .order('name');
      if (error) throw error;
      return data as (Material & { units_of_measure: Unit })[];
    },
  });

  const { data: units } = useQuery({
    queryKey: ['units'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('units_of_measure')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as Unit[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: MaterialFormData) => {
      const { error } = await supabase.from('materials').insert([{
        code: data.code,
        name: data.name,
        base_unit_id: data.base_unit_id,
        description: data.description || null,
        category: data.category || null,
        cost_per_base_unit: data.cost_per_base_unit || null,
        min_stock_level: data.min_stock_level || null,
        is_active: data.is_active,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      toast({ title: 'Material created successfully' });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating material', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: MaterialFormData & { id: string }) => {
      const { id, ...rest } = data;
      const { error } = await supabase
        .from('materials')
        .update({
          ...rest,
          description: rest.description || null,
          category: rest.category || null,
          cost_per_base_unit: rest.cost_per_base_unit || null,
          min_stock_level: rest.min_stock_level || null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      toast({ title: 'Material updated successfully' });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating material', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('materials').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      toast({ title: 'Material deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting material', description: error.message, variant: 'destructive' });
    },
  });

  const handleOpenDialog = (material?: Material) => {
    if (material) {
      setEditingMaterial(material);
      form.reset({
        code: material.code,
        name: material.name,
        description: material.description || '',
        category: material.category || '',
        base_unit_id: material.base_unit_id,
        cost_per_base_unit: material.cost_per_base_unit || 0,
        min_stock_level: material.min_stock_level || 0,
        is_active: material.is_active ?? true,
      });
    } else {
      setEditingMaterial(null);
      form.reset();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingMaterial(null);
    form.reset();
  };

  const onSubmit = (data: MaterialFormData) => {
    if (editingMaterial) {
      updateMutation.mutate({ ...data, id: editingMaterial.id });
    } else {
      createMutation.mutate(data);
    }
  };

  // Filter and paginate
  const filteredMaterials = materials?.filter((m) => {
    const matchesSearch = 
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.code.toLowerCase().includes(search.toLowerCase());
    const materialStatus = (m as any).material_status || 'pending_setup';
    const matchesStatus = 
      statusFilter === 'all' || materialStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalItems = filteredMaterials?.length || 0;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedMaterials = filteredMaterials?.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-4">
      <DataTableHeader
        title="Materials"
        subtitle="Manage raw materials and ingredients"
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search materials..."
        filterValue={statusFilter}
        onFilterChange={(value) => {
          setStatusFilter(value);
          setCurrentPage(1);
        }}
        filterOptions={STATUS_FILTER_OPTIONS}
        filterPlaceholder="All Status"
        onAdd={() => handleOpenDialog()}
        addLabel="Add Material"
        onRefresh={() => refetch()}
        isLoading={isLoading}
        totalCount={materials?.length}
        filteredCount={filteredMaterials?.length}
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
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Cost/Unit</TableHead>
                  <TableHead className="text-right">Min Stock</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedMaterials?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      <Package className="mx-auto h-10 w-10 mb-3 opacity-30" />
                      <p className="font-medium">No materials found</p>
                      <p className="text-sm">Try adjusting your search or filter</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedMaterials?.map((material) => (
                    <TableRow 
                      key={material.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleOpenDialog(material)}
                    >
                      <TableCell>
                        <StatusIndicator 
                          status={((material as any).material_status || 'pending_setup') as any} 
                        />
                      </TableCell>
                      <TableCell className="font-mono font-medium">{material.code}</TableCell>
                      <TableCell className="font-medium">{material.name}</TableCell>
                      <TableCell>
                        {material.category ? (
                          <Badge variant="outline" className="font-normal">
                            {material.category}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{material.units_of_measure?.code || '-'}</TableCell>
                      <TableCell className="text-right">
                        {material.cost_per_base_unit
                          ? `$${Number(material.cost_per_base_unit).toFixed(2)}`
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">{material.min_stock_level || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDialog(material);
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
                              deleteMutation.mutate(material.id);
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingMaterial ? 'Edit Material' : 'Add Material'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code</FormLabel>
                      <FormControl>
                        <Input placeholder="MAT-001" {...field} />
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
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Material name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Description..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input placeholder="Dairy, Packaging, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="base_unit_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base Unit</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {units?.map((unit) => (
                            <SelectItem key={unit.id} value={unit.id}>
                              {unit.name} ({unit.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="cost_per_base_unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost per Unit ($)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="min_stock_level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min Stock Level</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="!mt-0">Active</FormLabel>
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingMaterial ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
