import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { Pencil, Trash2, Tags, Link, Package, Upload, Download } from 'lucide-react';
import { DataTableHeader, StatusIndicator } from '@/components/ui/data-table';
import { DataTablePagination } from '@/components/ui/data-table/DataTablePagination';
import { SettingsBreadcrumb } from '@/components/settings/SettingsBreadcrumb';
import { LinkedMaterialsDialog } from '@/components/materials/LinkedMaterialsDialog';
import { useNavigate } from 'react-router-dom';
import type { Tables } from '@/integrations/supabase/types';

const materialNameSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required').max(200, 'Name must be 200 characters or less'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  is_active: z.boolean().default(true),
});

type MaterialNameFormData = z.infer<typeof materialNameSchema>;
type ListedMaterialName = Tables<'listed_material_names'>;

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export default function ListedMaterialNames() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLinkedDialogOpen, setIsLinkedDialogOpen] = useState(false);
  const [editingName, setEditingName] = useState<ListedMaterialName | null>(null);
  const [selectedForLinking, setSelectedForLinking] = useState<ListedMaterialName | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const form = useForm<MaterialNameFormData>({
    resolver: zodResolver(materialNameSchema),
    defaultValues: {
      code: '',
      name: '',
      description: '',
      is_active: true,
    },
  });

  // Generate code for new listed materials
  const generateCode = async () => {
    const { data, error } = await supabase.rpc('generate_listed_material_code');
    if (error) {
      console.error('Error generating code:', error);
      return 'LM-00001';
    }
    return data as string;
  };

  // Fetch listed material names with linked material counts
  const { data: materialNames, isLoading, refetch } = useQuery({
    queryKey: ['listed-material-names'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listed_material_names')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as ListedMaterialName[];
    },
  });

  // Fetch material counts per listed name from junction table
  const { data: materialCounts } = useQuery({
    queryKey: ['listed-material-counts', 'material-listed-links'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('material_listed_material_links')
        .select('listed_material_id');
      if (error) throw error;
      
      // Count materials per listed_material_id
      const counts: Record<string, number> = {};
      data.forEach(link => {
        counts[link.listed_material_id] = (counts[link.listed_material_id] || 0) + 1;
      });
      return counts;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: MaterialNameFormData) => {
      const { error } = await supabase.from('listed_material_names').insert([{
        code: data.code,
        name: data.name,
        description: data.description || null,
        is_active: data.is_active,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listed-material-names'] });
      toast({ title: 'Material name created successfully' });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating material name', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: MaterialNameFormData }) => {
      const { error } = await supabase
        .from('listed_material_names')
        .update({
          code: data.code,
          name: data.name,
          description: data.description || null,
          is_active: data.is_active,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listed-material-names'] });
      toast({ title: 'Material name updated successfully' });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating material name', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('listed_material_names').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listed-material-names'] });
      toast({ title: 'Material name deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting material name', description: error.message, variant: 'destructive' });
    },
  });

  const handleOpenDialog = async (materialName?: ListedMaterialName) => {
    if (materialName) {
      setEditingName(materialName);
      form.reset({
        code: (materialName as any).code || '',
        name: materialName.name,
        description: materialName.description || '',
        is_active: materialName.is_active ?? true,
      });
    } else {
      setEditingName(null);
      const newCode = await generateCode();
      form.reset({
        code: newCode,
        name: '',
        description: '',
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingName(null);
    form.reset();
  };

  const onSubmit = (data: MaterialNameFormData) => {
    if (editingName) {
      updateMutation.mutate({ id: editingName.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Filter and paginate
  const filteredNames = materialNames?.filter((n) => {
    const matchesSearch = 
      n.name.toLowerCase().includes(search.toLowerCase()) ||
      (n.description?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'active' && n.is_active) ||
      (statusFilter === 'inactive' && !n.is_active);
    return matchesSearch && matchesStatus;
  });

  const totalItems = filteredNames?.length || 0;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedNames = filteredNames?.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-4">
      <SettingsBreadcrumb currentPage="Listed Material Names" />
      
      <DataTableHeader
        title="Listed Material Names"
        subtitle="Manage standardized material names for consistency across the system"
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search material names..."
        filterValue={statusFilter}
        onFilterChange={(value) => {
          setStatusFilter(value);
          setCurrentPage(1);
        }}
        filterOptions={STATUS_FILTER_OPTIONS}
        filterPlaceholder="All Status"
        onAdd={() => handleOpenDialog()}
        addLabel="Add Material Name"
        onRefresh={() => refetch()}
        isLoading={isLoading}
        totalCount={materialNames?.length}
        filteredCount={filteredNames?.length}
        actions={
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1.5"
            onClick={() => navigate('/settings/import-export')}
          >
            <Upload className="h-4 w-4" />
            Import / Export
          </Button>
        }
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
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Linked Materials</TableHead>
                  <TableHead className="w-[120px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedNames?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <Tags className="mx-auto h-10 w-10 mb-3 opacity-30" />
                      <p className="font-medium">No material names found</p>
                      <p className="text-sm">Try adjusting your search or filter</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedNames?.map((materialName) => {
                    const linkedCount = materialCounts?.[materialName.id] || 0;
                    return (
                      <TableRow 
                        key={materialName.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleOpenDialog(materialName)}
                      >
                        <TableCell>
                          <StatusIndicator status={materialName.is_active ? 'active' : 'inactive'} />
                        </TableCell>
                        <TableCell className="font-mono text-sm">{(materialName as any).code || '-'}</TableCell>
                        <TableCell className="font-medium">{materialName.name}</TableCell>
                        <TableCell className="text-muted-foreground max-w-md truncate">
                          {materialName.description || '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedForLinking(materialName);
                              setIsLinkedDialogOpen(true);
                            }}
                          >
                            <Package className="h-3.5 w-3.5" />
                            <Badge variant={linkedCount > 0 ? "default" : "secondary"} className="h-5 min-w-[20px]">
                              {linkedCount}
                            </Badge>
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedForLinking(materialName);
                                setIsLinkedDialogOpen(true);
                              }}
                              title="Manage linked materials"
                            >
                              <Link className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDialog(materialName);
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
                                deleteMutation.mutate(materialName.id);
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingName ? 'Edit Material Name' : 'Add Material Name'}</DialogTitle>
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
                        placeholder="LM-00001" 
                        {...field} 
                        className="font-mono"
                        readOnly={!!editingName}
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
                      <Input placeholder="e.g., Organic Cane Sugar" {...field} maxLength={200} />
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
                      <Textarea 
                        placeholder="Optional description or notes about this material name" 
                        {...field} 
                        rows={3}
                        maxLength={500}
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
                        Material name is available for selection
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
                  {editingName ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <LinkedMaterialsDialog
        open={isLinkedDialogOpen}
        onOpenChange={setIsLinkedDialogOpen}
        listedMaterial={selectedForLinking}
      />

    </div>
  );
}
