import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil, Trash2, Building } from 'lucide-react';
import { DataTableHeader, StatusIndicator } from '@/components/ui/data-table';
import { DataTablePagination } from '@/components/ui/data-table/DataTablePagination';
import { SettingsBreadcrumb } from '@/components/settings/SettingsBreadcrumb';
import type { Tables, Enums } from '@/integrations/supabase/types';

const DEPARTMENT_TYPES: { value: Enums<'department_type'>; label: string }[] = [
  { value: 'production', label: 'Production' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'quality_control', label: 'Quality Control' },
  { value: 'sales', label: 'Sales' },
  { value: 'purchasing', label: 'Purchasing' },
  { value: 'admin', label: 'Administration' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'hr', label: 'Human Resources' },
];

const departmentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  department_type: z.enum(['production', 'warehouse', 'quality_control', 'sales', 'purchasing', 'admin', 'maintenance', 'hr']),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  is_active: z.boolean().default(true),
});

type DepartmentFormData = z.infer<typeof departmentSchema>;
type Department = Tables<'departments'>;

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const TYPE_FILTER_OPTIONS = [
  { value: 'all', label: 'All Types' },
  ...DEPARTMENT_TYPES.map(t => ({ value: t.value, label: t.label })),
];

export default function Departments() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      name: '',
      department_type: 'production',
      description: '',
      is_active: true,
    },
  });

  const { data: departments, isLoading, refetch } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('department_type')
        .order('name');
      if (error) throw error;
      return data as Department[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: DepartmentFormData) => {
      const { error } = await supabase.from('departments').insert([{
        name: data.name,
        department_type: data.department_type,
        description: data.description || null,
        is_active: data.is_active,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast({ title: 'Department created successfully' });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating department', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: DepartmentFormData }) => {
      const { error } = await supabase
        .from('departments')
        .update({
          name: data.name,
          department_type: data.department_type,
          description: data.description || null,
          is_active: data.is_active,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast({ title: 'Department updated successfully' });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating department', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('departments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast({ title: 'Department deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting department', description: error.message, variant: 'destructive' });
    },
  });

  const handleOpenDialog = (department?: Department) => {
    if (department) {
      setEditingDepartment(department);
      form.reset({
        name: department.name,
        department_type: department.department_type,
        description: department.description || '',
        is_active: department.is_active,
      });
    } else {
      setEditingDepartment(null);
      form.reset({
        name: '',
        department_type: 'production',
        description: '',
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingDepartment(null);
    form.reset();
  };

  const onSubmit = (data: DepartmentFormData) => {
    if (editingDepartment) {
      updateMutation.mutate({ id: editingDepartment.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getTypeLabel = (type: string) => {
    return DEPARTMENT_TYPES.find(t => t.value === type)?.label || type;
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'production': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'warehouse': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'quality_control': return 'bg-green-100 text-green-800 border-green-200';
      case 'sales': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'purchasing': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'admin': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'maintenance': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'hr': return 'bg-pink-100 text-pink-800 border-pink-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Filter and paginate
  const filteredDepartments = departments?.filter((d) => {
    const matchesSearch = 
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      (d.description?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'active' && d.is_active) ||
      (statusFilter === 'inactive' && !d.is_active);
    const matchesType = typeFilter === 'all' || d.department_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const totalItems = filteredDepartments?.length || 0;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedDepartments = filteredDepartments?.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-4">
      <SettingsBreadcrumb currentPage="Departments" />
      
      <DataTableHeader
        title="Departments"
        subtitle="Manage organizational departments and work areas"
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search departments..."
        filterValue={statusFilter}
        onFilterChange={(value) => {
          setStatusFilter(value);
          setCurrentPage(1);
        }}
        filterOptions={STATUS_FILTER_OPTIONS}
        filterPlaceholder="All Status"
        onAdd={() => handleOpenDialog()}
        addLabel="Add Department"
        onRefresh={() => refetch()}
        isLoading={isLoading}
        totalCount={departments?.length}
        filteredCount={filteredDepartments?.length}
      />

      {/* Type Filter */}
      <div className="flex items-center gap-2">
        <Select value={typeFilter} onValueChange={(value) => { setTypeFilter(value); setCurrentPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_FILTER_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
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
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedDepartments?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      <Building className="mx-auto h-10 w-10 mb-3 opacity-30" />
                      <p className="font-medium">No departments found</p>
                      <p className="text-sm">Try adjusting your search or filter</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedDepartments?.map((department) => (
                    <TableRow 
                      key={department.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleOpenDialog(department)}
                    >
                      <TableCell>
                        <StatusIndicator status={department.is_active ? 'active' : 'inactive'} />
                      </TableCell>
                      <TableCell className="font-medium">{department.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getTypeBadgeColor(department.department_type)}>
                          {getTypeLabel(department.department_type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-xs truncate">
                        {department.description || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDialog(department);
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
                              deleteMutation.mutate(department.id);
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
            <DialogTitle>{editingDepartment ? 'Edit Department' : 'Add Department'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Production Line 1" {...field} maxLength={100} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="department_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DEPARTMENT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Optional description of the department" 
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
                        Department is available for use
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
                  {editingDepartment ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
