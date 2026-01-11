import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Trash2, Package } from 'lucide-react';
import { DataTableHeader, StatusIndicator } from '@/components/ui/data-table';
import { DataTablePagination } from '@/components/ui/data-table/DataTablePagination';
import { MaterialFormDialog } from '@/components/materials/MaterialFormDialog';
import { ApprovalStatusBadge } from '@/components/approval';
import { usePermissions } from '@/hooks/usePermission';
import type { Tables } from '@/integrations/supabase/types';

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
  const [listedNameFilter, setListedNameFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { checkPermission, isAdmin } = usePermissions();

  const canCreate = isAdmin || checkPermission('materials.create', 'full');
  const canEdit = isAdmin || checkPermission('materials.edit', 'full');
  const canDelete = isAdmin || checkPermission('materials.delete', 'full');

  const { data: materials, isLoading, refetch } = useQuery({
    queryKey: ['materials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('materials')
        .select(`
          *, 
          purchase_unit:units_of_measure!materials_base_unit_id_fkey(*), 
          usage_unit:units_of_measure!materials_usage_unit_id_fkey(*),
          listed_material:listed_material_names(id, name)
        `)
        .order('name');
      if (error) throw error;
      return data as (Material & { 
        purchase_unit: Unit | null; 
        usage_unit: Unit | null;
        listed_material: { id: string; name: string } | null;
      })[];
    },
  });

  // Fetch listed material names for filtering
  const { data: listedMaterialNames } = useQuery({
    queryKey: ['listed-material-names-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listed_material_names')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
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
    setEditingMaterial(material || null);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingMaterial(null);
  };

  // Filter and paginate
  const filteredMaterials = materials?.filter((m) => {
    const matchesSearch = 
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.code.toLowerCase().includes(search.toLowerCase()) ||
      (m.listed_material?.name?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const materialStatus = m.material_status || 'pending_setup';
    const matchesStatus = 
      statusFilter === 'all' || materialStatus === statusFilter;
    const matchesListedName = 
      listedNameFilter === 'all' ||
      (listedNameFilter === 'unlinked' && !m.listed_material_id) ||
      m.listed_material_id === listedNameFilter;
    return matchesSearch && matchesStatus && matchesListedName;
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
        onAdd={canCreate ? () => handleOpenDialog() : undefined}
        addLabel="Add Material"
        onRefresh={() => refetch()}
        isLoading={isLoading}
        totalCount={materials?.length}
        filteredCount={filteredMaterials?.length}
      >
        {/* Additional filter for Listed Material Name */}
        <Select 
          value={listedNameFilter} 
          onValueChange={(value) => {
            setListedNameFilter(value);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Listed Name" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Listed Names</SelectItem>
            <SelectItem value="unlinked">Not Linked</SelectItem>
            {listedMaterialNames?.map((lm) => (
              <SelectItem key={lm.id} value={lm.id}>
                {lm.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </DataTableHeader>

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
                  <TableHead>Listed Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>QA Status</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Cost/Unit</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedMaterials?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
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
                          status={(material.material_status || 'pending_setup') as any} 
                        />
                      </TableCell>
                      <TableCell className="font-mono font-medium">{material.code}</TableCell>
                      <TableCell className="font-medium">{material.name}</TableCell>
                      <TableCell>
                        {material.listed_material?.name ? (
                          <Badge variant="secondary" className="font-normal">
                            {material.listed_material.name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">Not linked</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {material.category ? (
                          <Badge variant="outline" className="font-normal">
                            {material.category}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <ApprovalStatusBadge 
                          status={material.approval_status as 'Draft' | 'Pending_QA' | 'Approved' | 'Rejected' | 'Archived'} 
                          size="sm"
                          showIcon={false}
                        />
                      </TableCell>
                      <TableCell>{material.purchase_unit?.code || '-'}</TableCell>
                      <TableCell className="text-right">
                        {material.cost_per_base_unit
                          ? `$${Number(material.cost_per_base_unit).toFixed(2)}`
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && (
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
                          )}
                          {canDelete && (
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
                          )}
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

      <MaterialFormDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingMaterial(null);
        }}
        material={editingMaterial}
      />
    </div>
  );
}
