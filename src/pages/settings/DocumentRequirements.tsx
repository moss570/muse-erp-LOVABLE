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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil, Trash2, FileText, GripVertical, X } from 'lucide-react';
import { RequireRole } from '@/components/auth/RequireRole';
import { DataTableHeader, StatusIndicator } from '@/components/ui/data-table';
import { DataTablePagination } from '@/components/ui/data-table/DataTablePagination';
import { SettingsBreadcrumb } from '@/components/settings/SettingsBreadcrumb';
import type { Tables } from '@/integrations/supabase/types';

const DOCUMENT_AREAS = [
  { value: 'materials', label: 'Materials' },
  { value: 'suppliers', label: 'Suppliers' },
  { value: 'products', label: 'Products' },
  { value: 'production', label: 'Production' },
  { value: 'quality', label: 'Quality Control' },
] as const;

const documentRequirementSchema = z.object({
  document_name: z.string()
    .min(1, 'Document name is required')
    .max(100, 'Name must be 100 characters or less'),
  areas: z.array(z.string()).min(1, 'At least one area is required'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  is_required: z.boolean().default(true),
  sort_order: z.coerce.number().min(0).default(0),
  is_active: z.boolean().default(true),
});

type DocumentRequirementFormData = z.infer<typeof documentRequirementSchema>;
type DocumentRequirement = Tables<'document_requirements'>;

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const AREA_FILTER_OPTIONS = [
  { value: 'all', label: 'All Areas' },
  ...DOCUMENT_AREAS.map(a => ({ value: a.value, label: a.label })),
];

function DocumentRequirementsContent() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [areaFilter, setAreaFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState<DocumentRequirement | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<DocumentRequirementFormData>({
    resolver: zodResolver(documentRequirementSchema),
    defaultValues: {
      document_name: '',
      areas: [],
      description: '',
      is_required: true,
      sort_order: 0,
      is_active: true,
    },
  });

  const { data: requirements, isLoading, refetch } = useQuery({
    queryKey: ['document-requirements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_requirements')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data as DocumentRequirement[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: DocumentRequirementFormData) => {
      const { error } = await supabase.from('document_requirements').insert([{
        document_name: data.document_name,
        areas: data.areas,
        description: data.description || null,
        is_required: data.is_required,
        sort_order: data.sort_order,
        is_active: data.is_active,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-requirements'] });
      toast({ title: 'Document requirement created successfully' });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating document requirement', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: DocumentRequirementFormData & { id: string }) => {
      const { id, ...rest } = data;
      const { error } = await supabase
        .from('document_requirements')
        .update({
          document_name: rest.document_name,
          areas: rest.areas,
          description: rest.description || null,
          is_required: rest.is_required,
          sort_order: rest.sort_order,
          is_active: rest.is_active,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-requirements'] });
      toast({ title: 'Document requirement updated successfully' });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating document requirement', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('document_requirements').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-requirements'] });
      toast({ title: 'Document requirement deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting document requirement', description: error.message, variant: 'destructive' });
    },
  });

  const handleOpenDialog = (requirement?: DocumentRequirement) => {
    if (requirement) {
      setEditingRequirement(requirement);
      form.reset({
        document_name: requirement.document_name,
        areas: requirement.areas || [],
        description: requirement.description || '',
        is_required: requirement.is_required ?? true,
        sort_order: requirement.sort_order ?? 0,
        is_active: requirement.is_active ?? true,
      });
    } else {
      setEditingRequirement(null);
      form.reset();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingRequirement(null);
    form.reset();
  };

  const onSubmit = (data: DocumentRequirementFormData) => {
    if (editingRequirement) {
      updateMutation.mutate({ ...data, id: editingRequirement.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const getAreaLabel = (area: string) => {
    return DOCUMENT_AREAS.find(a => a.value === area)?.label || area;
  };

  // Filter and paginate
  const filteredRequirements = requirements?.filter((r) => {
    const matchesSearch = 
      r.document_name.toLowerCase().includes(search.toLowerCase()) ||
      (r.description?.toLowerCase() || '').includes(search.toLowerCase());
    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'active' && r.is_active) ||
      (statusFilter === 'inactive' && !r.is_active);
    const matchesArea = areaFilter === 'all' || r.areas?.includes(areaFilter);
    return matchesSearch && matchesStatus && matchesArea;
  });

  const totalItems = filteredRequirements?.length || 0;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedRequirements = filteredRequirements?.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-4">
      <SettingsBreadcrumb currentPage="Document Requirements" />
      <DataTableHeader
        title="Document Requirements"
        subtitle="Define required documents for materials, products, and suppliers"
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search document requirements..."
        filterValue={statusFilter}
        onFilterChange={(value) => {
          setStatusFilter(value);
          setCurrentPage(1);
        }}
        filterOptions={STATUS_FILTER_OPTIONS}
        filterPlaceholder="All Status"
        onAdd={() => handleOpenDialog()}
        addLabel="Add Document Requirement"
        onRefresh={() => refetch()}
        isLoading={isLoading}
        totalCount={requirements?.length}
        filteredCount={filteredRequirements?.length}
      />

      {/* Secondary filter for area */}
      <div className="flex items-center gap-2">
        <Select value={areaFilter} onValueChange={(value) => { setAreaFilter(value); setCurrentPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Areas" />
          </SelectTrigger>
          <SelectContent>
            {AREA_FILTER_OPTIONS.map(option => (
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
                  <TableHead className="w-[60px]">Order</TableHead>
                  <TableHead>Document Name</TableHead>
                  <TableHead>Areas</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[100px]">Required</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRequirements?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      <FileText className="mx-auto h-10 w-10 mb-3 opacity-30" />
                      <p className="font-medium">No document requirements found</p>
                      <p className="text-sm">Add document requirements to define what documents are needed</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRequirements?.map((requirement) => (
                    <TableRow 
                      key={requirement.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleOpenDialog(requirement)}
                    >
                      <TableCell>
                        <StatusIndicator 
                          status={requirement.is_active ? 'active' : 'inactive'} 
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <GripVertical className="h-4 w-4 opacity-30" />
                          {requirement.sort_order}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{requirement.document_name}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {requirement.areas?.map((area) => (
                            <Badge key={area} variant="outline" className="font-normal text-xs">
                              {getAreaLabel(area)}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-xs truncate">
                        {requirement.description || '-'}
                      </TableCell>
                      <TableCell>
                        {requirement.is_required ? (
                          <Badge variant="default" className="bg-amber-500 hover:bg-amber-600">Required</Badge>
                        ) : (
                          <Badge variant="secondary">Optional</Badge>
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
                              handleOpenDialog(requirement);
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
                              deleteMutation.mutate(requirement.id);
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
            <DialogTitle>{editingRequirement ? 'Edit Document Requirement' : 'Add Document Requirement'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="document_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Document Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Certificate of Analysis (COA)" {...field} maxLength={100} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="areas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Areas</FormLabel>
                    <FormDescription>Select all areas where this document applies</FormDescription>
                    <div className="space-y-2">
                      {/* Selected areas as badges */}
                      {field.value.length > 0 && (
                        <div className="flex flex-wrap gap-1 p-2 border rounded-md bg-muted/30">
                          {field.value.map((area) => (
                            <Badge 
                              key={area} 
                              variant="secondary" 
                              className="gap-1 pr-1"
                            >
                              {getAreaLabel(area)}
                              <button
                                type="button"
                                onClick={() => {
                                  field.onChange(field.value.filter(a => a !== area));
                                }}
                                className="ml-1 hover:bg-muted rounded-full p-0.5"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                      {/* Checkbox list */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {DOCUMENT_AREAS.map((area) => {
                          const isChecked = field.value.includes(area.value);
                          return (
                            <button
                              key={area.value}
                              type="button"
                              className="flex items-center space-x-2 rounded-md border p-2 text-left hover:bg-muted/50"
                              onClick={() => {
                                if (isChecked) {
                                  field.onChange(field.value.filter((a) => a !== area.value));
                                } else {
                                  field.onChange([...field.value, area.value]);
                                }
                              }}
                            >
                              <Checkbox checked={isChecked} className="pointer-events-none" />
                              <span className="text-sm">{area.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
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
                        placeholder="Brief description of the document purpose..."
                        {...field}
                        maxLength={500}
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="sort_order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sort Order</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormDescription>Display order (0 = first)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4 pt-2">
                  <FormField
                    control={form.control}
                    name="is_required"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <FormLabel className="font-normal">Required</FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel className="font-normal">Active</FormLabel>
                      <FormDescription>Inactive requirements won't appear in document lists</FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingRequirement ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function DocumentRequirements() {
  return (
    <RequireRole allowedRoles={['admin', 'manager']}>
      <DocumentRequirementsContent />
    </RequireRole>
  );
}
