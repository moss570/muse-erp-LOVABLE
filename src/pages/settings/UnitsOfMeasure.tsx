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
  FormDescription,
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
import { Pencil, Trash2, Ruler, Scale, Droplets, Hash } from 'lucide-react';
import { DataTableHeader, StatusIndicator } from '@/components/ui/data-table';
import { DataTablePagination } from '@/components/ui/data-table/DataTablePagination';
import { SettingsBreadcrumb } from '@/components/settings/SettingsBreadcrumb';
import type { Tables } from '@/integrations/supabase/types';

const UNIT_TYPES = [
  { value: 'weight', label: 'Weight', icon: Scale },
  { value: 'volume', label: 'Volume', icon: Droplets },
  { value: 'count', label: 'Count / Each', icon: Hash },
] as const;

const unitSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  code: z.string()
    .min(1, 'Code is required')
    .max(20, 'Code must be 20 characters or less')
    .regex(/^[A-Z0-9_]+$/, 'Code must be uppercase letters, numbers, and underscores only'),
  unit_type: z.string().min(1, 'Unit type is required'),
  is_base_unit: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

type UnitFormData = z.infer<typeof unitSchema>;
type Unit = Tables<'units_of_measure'>;

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const TYPE_FILTER_OPTIONS = [
  { value: 'all', label: 'All Types' },
  ...UNIT_TYPES.map(t => ({ value: t.value, label: t.label })),
];

export default function UnitsOfMeasure() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<UnitFormData>({
    resolver: zodResolver(unitSchema),
    defaultValues: {
      name: '',
      code: '',
      unit_type: 'count',
      is_base_unit: false,
      is_active: true,
    },
  });

  const { data: units, isLoading, refetch } = useQuery({
    queryKey: ['units-of-measure'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('units_of_measure')
        .select('*')
        .order('unit_type')
        .order('name');
      if (error) throw error;
      return data as Unit[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: UnitFormData) => {
      const { error } = await supabase.from('units_of_measure').insert([{
        name: data.name,
        code: data.code.toUpperCase(),
        unit_type: data.unit_type,
        is_base_unit: data.is_base_unit,
        is_active: data.is_active,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units-of-measure'] });
      queryClient.invalidateQueries({ queryKey: ['units'] });
      toast({ title: 'Unit created successfully' });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating unit', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UnitFormData }) => {
      const { error } = await supabase
        .from('units_of_measure')
        .update({
          name: data.name,
          code: data.code.toUpperCase(),
          unit_type: data.unit_type,
          is_base_unit: data.is_base_unit,
          is_active: data.is_active,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units-of-measure'] });
      queryClient.invalidateQueries({ queryKey: ['units'] });
      toast({ title: 'Unit updated successfully' });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating unit', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('units_of_measure').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units-of-measure'] });
      queryClient.invalidateQueries({ queryKey: ['units'] });
      toast({ title: 'Unit deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting unit', description: error.message, variant: 'destructive' });
    },
  });

  const handleOpenDialog = (unit?: Unit) => {
    if (unit) {
      setEditingUnit(unit);
      form.reset({
        name: unit.name,
        code: unit.code,
        unit_type: unit.unit_type,
        is_base_unit: unit.is_base_unit ?? false,
        is_active: unit.is_active ?? true,
      });
    } else {
      setEditingUnit(null);
      form.reset({
        name: '',
        code: '',
        unit_type: 'count',
        is_base_unit: false,
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingUnit(null);
    form.reset();
  };

  const onSubmit = (data: UnitFormData) => {
    if (editingUnit) {
      updateMutation.mutate({ id: editingUnit.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getUnitTypeIcon = (type: string) => {
    const unitType = UNIT_TYPES.find(t => t.value === type);
    if (!unitType) return Hash;
    return unitType.icon;
  };

  const getUnitTypeLabel = (type: string) => {
    return UNIT_TYPES.find(t => t.value === type)?.label || type;
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'weight': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'volume': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'count': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Filter and paginate
  const filteredUnits = units?.filter((u) => {
    const matchesSearch = 
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.code.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'active' && u.is_active) ||
      (statusFilter === 'inactive' && !u.is_active);
    const matchesType = typeFilter === 'all' || u.unit_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const totalItems = filteredUnits?.length || 0;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedUnits = filteredUnits?.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-4">
      <SettingsBreadcrumb currentPage="Units of Measure" />
      
      <DataTableHeader
        title="Units of Measure"
        subtitle="Manage measurement units for materials and products"
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search units..."
        filterValue={statusFilter}
        onFilterChange={(value) => {
          setStatusFilter(value);
          setCurrentPage(1);
        }}
        filterOptions={STATUS_FILTER_OPTIONS}
        filterPlaceholder="All Status"
        onAdd={() => handleOpenDialog()}
        addLabel="Add Unit"
        onRefresh={() => refetch()}
        isLoading={isLoading}
        totalCount={units?.length}
        filteredCount={filteredUnits?.length}
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
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="w-[100px]">Base Unit</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUnits?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <Ruler className="mx-auto h-10 w-10 mb-3 opacity-30" />
                      <p className="font-medium">No units found</p>
                      <p className="text-sm">Try adjusting your search or filter</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedUnits?.map((unit) => {
                    const TypeIcon = getUnitTypeIcon(unit.unit_type);
                    return (
                      <TableRow 
                        key={unit.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleOpenDialog(unit)}
                      >
                        <TableCell>
                          <StatusIndicator status={unit.is_active ? 'active' : 'inactive'} />
                        </TableCell>
                        <TableCell className="font-mono font-bold">{unit.code}</TableCell>
                        <TableCell className="font-medium">{unit.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`gap-1 ${getTypeBadgeColor(unit.unit_type)}`}>
                            <TypeIcon className="h-3 w-3" />
                            {getUnitTypeLabel(unit.unit_type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {unit.is_base_unit ? (
                            <Badge variant="secondary" className="text-xs">Base</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDialog(unit);
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
                                deleteMutation.mutate(unit.id);
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
            <DialogTitle>{editingUnit ? 'Edit Unit' : 'Add Unit'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., KG, LB, GAL" 
                          {...field} 
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          className="font-mono"
                          maxLength={20}
                        />
                      </FormControl>
                      <FormDescription>Abbreviation for the unit</FormDescription>
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
                        <Input placeholder="e.g., Kilogram, Pound, Gallon" {...field} maxLength={100} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="unit_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {UNIT_TYPES.map((type) => {
                          const TypeIcon = type.icon;
                          return (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center gap-2">
                                <TypeIcon className="h-4 w-4" />
                                {type.label}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_base_unit"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel className="text-base">Base Unit</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Mark as a base/standard unit for this type
                      </p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
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
                        This unit will be available for selection
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
                  {editingUnit ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
