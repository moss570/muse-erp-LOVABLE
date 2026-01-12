import { useState, useRef } from 'react';
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
  DialogDescription,
  DialogFooter,
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
import { Pencil, Trash2, Tags, Link, Package, Upload, CheckCircle, AlertCircle, ArrowUpDown } from 'lucide-react';
import { DataTableHeader, StatusIndicator } from '@/components/ui/data-table';
import { DataTablePagination } from '@/components/ui/data-table/DataTablePagination';
import { SettingsBreadcrumb } from '@/components/settings/SettingsBreadcrumb';
import { LinkedMaterialsDialog } from '@/components/materials/LinkedMaterialsDialog';
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
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [editingName, setEditingName] = useState<ListedMaterialName | null>(null);
  const [selectedForLinking, setSelectedForLinking] = useState<ListedMaterialName | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [importPreview, setImportPreview] = useState<{
    toCreate: Array<{ code: string; name: string; description: string; is_active: boolean }>;
    toUpdate: Array<{ id: string; code: string; name: string; description: string; is_active: boolean; changes: string[] }>;
    errors: string[];
  } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  // Fetch material counts per listed name
  const { data: materialCounts } = useQuery({
    queryKey: ['listed-material-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('materials')
        .select('listed_material_id')
        .not('listed_material_id', 'is', null);
      if (error) throw error;
      
      // Count materials per listed_material_id
      const counts: Record<string, number> = {};
      data.forEach(m => {
        if (m.listed_material_id) {
          counts[m.listed_material_id] = (counts[m.listed_material_id] || 0) + 1;
        }
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

  // CSV parsing helper
  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
    const rows: Record<string, string>[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (const char of lines[i]) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim().replace(/^"|"$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim().replace(/^"|"$/g, ''));
      
      const row: Record<string, string> = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      rows.push(row);
    }
    
    return rows;
  };

  // Export function - exports full list
  const handleExport = () => {
    if (!materialNames || materialNames.length === 0) {
      toast({ title: 'No data to export', variant: 'destructive' });
      return;
    }

    const headers = ['code', 'name', 'description', 'is_active'];
    const rows = materialNames.map(item => 
      headers.map(field => {
        const value = item[field as keyof ListedMaterialName];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      }).join(',')
    );
    
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `listed_material_names_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({ title: 'Export successful', description: `Exported ${materialNames.length} material names` });
  };

  // Import file handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const text = await file.text();
    const rows = parseCSV(text);
    
    if (rows.length === 0) {
      toast({ title: 'Invalid file', description: 'No data found in CSV', variant: 'destructive' });
      return;
    }

    // Create a map of existing items by code
    const existingByCode = new Map(
      (materialNames || []).map(item => [item.code, item])
    );

    const toCreate: typeof importPreview extends null ? never : NonNullable<typeof importPreview>['toCreate'] = [];
    const toUpdate: typeof importPreview extends null ? never : NonNullable<typeof importPreview>['toUpdate'] = [];
    const errors: string[] = [];

    rows.forEach((row, idx) => {
      const code = row.code?.trim();
      const name = row.name?.trim();
      const description = row.description?.trim() || '';
      const isActiveStr = row.is_active?.trim().toLowerCase();
      const is_active = isActiveStr === 'false' || isActiveStr === '0' ? false : true;

      if (!code) {
        errors.push(`Row ${idx + 2}: Missing code`);
        return;
      }
      if (!name) {
        errors.push(`Row ${idx + 2}: Missing name`);
        return;
      }

      const existing = existingByCode.get(code);
      if (existing) {
        // Check what would change (only update if new value is not empty)
        const changes: string[] = [];
        if (name && name !== existing.name) changes.push('name');
        if (description && description !== (existing.description || '')) changes.push('description');
        if (isActiveStr && is_active !== existing.is_active) changes.push('is_active');

        if (changes.length > 0) {
          toUpdate.push({
            id: existing.id,
            code,
            name: name || existing.name,
            description: description || existing.description || '',
            is_active: isActiveStr ? is_active : (existing.is_active ?? true),
            changes,
          });
        }
      } else {
        toCreate.push({ code, name, description, is_active });
      }
    });

    setImportPreview({ toCreate, toUpdate, errors });
    setIsImportDialogOpen(true);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Execute import
  const handleImport = async () => {
    if (!importPreview) return;
    
    setIsImporting(true);
    try {
      // Create new items
      if (importPreview.toCreate.length > 0) {
        const { error: createError } = await supabase
          .from('listed_material_names')
          .insert(importPreview.toCreate);
        if (createError) throw createError;
      }

      // Update existing items (only non-empty fields)
      for (const item of importPreview.toUpdate) {
        const updateData: Partial<{ name: string; description: string; is_active: boolean }> = {};
        if (item.changes.includes('name')) updateData.name = item.name;
        if (item.changes.includes('description')) updateData.description = item.description;
        if (item.changes.includes('is_active')) updateData.is_active = item.is_active;

        const { error: updateError } = await supabase
          .from('listed_material_names')
          .update(updateData)
          .eq('id', item.id);
        if (updateError) throw updateError;
      }

      queryClient.invalidateQueries({ queryKey: ['listed-material-names'] });
      toast({ 
        title: 'Import successful', 
        description: `Created ${importPreview.toCreate.length}, updated ${importPreview.toUpdate.length} material names` 
      });
      setIsImportDialogOpen(false);
      setImportPreview(null);
    } catch (error) {
      toast({ 
        title: 'Import failed', 
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
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
      {/* Hidden file input for import */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".csv"
        onChange={handleFileChange}
        className="hidden"
      />
      
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
        onExport={handleExport}
        onRefresh={() => refetch()}
        isLoading={isLoading}
        totalCount={materialNames?.length}
        filteredCount={filteredNames?.length}
        actions={
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1.5"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            Import
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

      {/* Import Preview Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Import Preview</DialogTitle>
            <DialogDescription>
              Review the data before importing. Only changes will be applied - existing data won't be overwritten with empty values.
            </DialogDescription>
          </DialogHeader>
          
          {importPreview && (
            <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
              {/* Summary */}
              <div className="flex gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">
                    <strong>{importPreview.toCreate.length}</strong> new records
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">
                    <strong>{importPreview.toUpdate.length}</strong> updates
                  </span>
                </div>
                {importPreview.errors.length > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span className="text-sm">
                      <strong>{importPreview.errors.length}</strong> errors
                    </span>
                  </div>
                )}
              </div>

              {/* Errors */}
              {importPreview.errors.length > 0 && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive max-h-24 overflow-y-auto">
                  {importPreview.errors.map((error, idx) => (
                    <div key={idx}>{error}</div>
                  ))}
                </div>
              )}

              {/* Preview Table */}
              <div className="flex-1 overflow-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[80px]">Action</TableHead>
                      <TableHead className="w-[100px]">Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-[80px]">Active</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importPreview.toCreate.map((item, idx) => (
                      <TableRow key={`create-${idx}`}>
                        <TableCell>
                          <Badge variant="default" className="bg-green-500">New</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{item.code}</TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell className="text-muted-foreground max-w-xs truncate">
                          {item.description || '-'}
                        </TableCell>
                        <TableCell>{item.is_active ? 'Yes' : 'No'}</TableCell>
                      </TableRow>
                    ))}
                    {importPreview.toUpdate.map((item, idx) => (
                      <TableRow key={`update-${idx}`}>
                        <TableCell>
                          <Badge variant="secondary" className="bg-blue-500/20 text-blue-700">Update</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{item.code}</TableCell>
                        <TableCell>
                          {item.name}
                          {item.changes.includes('name') && (
                            <span className="ml-1 text-xs text-blue-500">*</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-xs truncate">
                          {item.description || '-'}
                          {item.changes.includes('description') && (
                            <span className="ml-1 text-xs text-blue-500">*</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.is_active ? 'Yes' : 'No'}
                          {item.changes.includes('is_active') && (
                            <span className="ml-1 text-xs text-blue-500">*</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {importPreview.toCreate.length === 0 && importPreview.toUpdate.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No valid records to import
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <p className="text-xs text-muted-foreground">
                <span className="text-blue-500">*</span> indicates fields that will be updated
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleImport}
              disabled={isImporting || (!importPreview?.toCreate.length && !importPreview?.toUpdate.length)}
            >
              {isImporting ? 'Importing...' : `Import ${(importPreview?.toCreate.length || 0) + (importPreview?.toUpdate.length || 0)} Records`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
