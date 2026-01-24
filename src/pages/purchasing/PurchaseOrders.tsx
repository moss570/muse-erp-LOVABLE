import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Eye, 
  Pencil, 
  Trash2, 
  ShoppingCart,
  CheckCircle,
  Clock,
  Send,
  XCircle,
  AlertTriangle,
  Package
} from 'lucide-react';
import { DataTableHeader } from '@/components/ui/data-table';
import { DataTablePagination } from '@/components/ui/data-table/DataTablePagination';
import { usePermissions } from '@/hooks/usePermission';
import { POFormDialog } from '@/components/purchasing/POFormDialog';
import { format } from 'date-fns';
import type { Tables } from '@/integrations/supabase/types';

type PurchaseOrder = Tables<'purchase_orders'>;
type Supplier = Tables<'suppliers'>;

const PO_STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'sent', label: 'Sent to Supplier' },
  { value: 'partially_received', label: 'Partially Received' },
  { value: 'received', label: 'Fully Received' },
  { value: 'cancelled', label: 'Cancelled' },
];

const getStatusBadge = (status: string) => {
  const configs: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode; label: string }> = {
    draft: { variant: 'outline', icon: <Pencil className="h-3 w-3" />, label: 'Draft' },
    pending_approval: { variant: 'secondary', icon: <Clock className="h-3 w-3" />, label: 'Pending Approval' },
    approved: { variant: 'default', icon: <CheckCircle className="h-3 w-3" />, label: 'Approved' },
    sent: { variant: 'default', icon: <Send className="h-3 w-3" />, label: 'Sent' },
    partially_received: { variant: 'secondary', icon: <Package className="h-3 w-3" />, label: 'Partial' },
    received: { variant: 'default', icon: <CheckCircle className="h-3 w-3" />, label: 'Received' },
    cancelled: { variant: 'destructive', icon: <XCircle className="h-3 w-3" />, label: 'Cancelled' },
  };
  const config = configs[status] || configs.draft;
  return (
    <Badge variant={config.variant} className="gap-1">
      {config.icon}
      {config.label}
    </Badge>
  );
};

export default function PurchaseOrders() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { checkPermission, isAdmin } = usePermissions();

  const canCreate = isAdmin || checkPermission('purchasing.orders', 'full');
  const canEdit = isAdmin || checkPermission('purchasing.orders', 'full');
  const canDelete = isAdmin || checkPermission('purchasing.orders', 'full');

  const { data: purchaseOrders, isLoading, refetch } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          supplier:suppliers(id, name, code),
          delivery_location:locations(id, name),
          items:purchase_order_items(count)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as (PurchaseOrder & { 
        supplier: { id: string; name: string; code: string } | null;
        delivery_location: { id: string; name: string } | null;
        items: { count: number }[];
      })[];
    },
  });

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // First delete line items
      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .delete()
        .eq('purchase_order_id', id);
      if (itemsError) throw itemsError;
      
      // Then delete the PO
      const { error } = await supabase.from('purchase_orders').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast({ title: 'Purchase Order deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting purchase order', description: error.message, variant: 'destructive' });
    },
  });

  const handleOpenDialog = (po?: PurchaseOrder) => {
    setEditingPO(po || null);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPO(null);
  };

  const handleViewDetail = (poId: string) => {
    navigate(`/purchasing/orders/${poId}`);
  };

  // Filter and paginate
  const filteredPOs = purchaseOrders?.filter((po) => {
    const matchesSearch = 
      po.po_number.toLowerCase().includes(search.toLowerCase()) ||
      po.supplier?.name?.toLowerCase().includes(search.toLowerCase()) ||
      po.supplier?.code?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
    const matchesSupplier = supplierFilter === 'all' || po.supplier_id === supplierFilter;
    return matchesSearch && matchesStatus && matchesSupplier;
  });

  const totalItems = filteredPOs?.length || 0;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedPOs = filteredPOs?.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-4">
      <DataTableHeader
        title="Purchase Orders"
        subtitle="Manage purchase orders and track deliveries"
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search PO number or supplier..."
        filterValue={statusFilter}
        onFilterChange={(value) => {
          setStatusFilter(value);
          setCurrentPage(1);
        }}
        filterOptions={PO_STATUS_OPTIONS}
        filterPlaceholder="All Status"
        onAdd={canCreate ? () => handleOpenDialog() : undefined}
        addLabel="Create PO"
        onRefresh={() => refetch()}
        isLoading={isLoading}
        totalCount={purchaseOrders?.length}
        filteredCount={filteredPOs?.length}
      >
        {/* Supplier Filter */}
        <Select 
          value={supplierFilter} 
          onValueChange={(value) => {
            setSupplierFilter(value);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Suppliers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Suppliers</SelectItem>
            {suppliers?.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
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
                  <TableHead>PO Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Expected Delivery</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Approval</TableHead>
                  <TableHead className="w-[120px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPOs?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      <ShoppingCart className="mx-auto h-10 w-10 mb-3 opacity-30" />
                      <p className="font-medium">No purchase orders found</p>
                      <p className="text-sm">Create your first purchase order to get started</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedPOs?.map((po) => (
                    <TableRow 
                      key={po.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleViewDetail(po.id)}
                    >
                      <TableCell className="font-mono font-medium">{po.po_number}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{po.supplier?.name}</p>
                          <p className="text-xs text-muted-foreground">{po.supplier?.code}</p>
                        </div>
                      </TableCell>
                      <TableCell>{format(new Date(po.order_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        {po.expected_delivery_date 
                          ? format(new Date(po.expected_delivery_date), 'MMM d, yyyy')
                          : <span className="text-muted-foreground">-</span>
                        }
                      </TableCell>
                      <TableCell>{getStatusBadge(po.status)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {po.total_amount 
                          ? `$${Number(po.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        {po.requires_approval ? (
                          po.approved_at ? (
                            <Badge variant="outline" className="gap-1 text-green-600 border-green-600">
                              <CheckCircle className="h-3 w-3" />
                              Approved
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 text-amber-600 border-amber-600">
                              <AlertTriangle className="h-3 w-3" />
                              Needs Approval
                            </Badge>
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground">N/A</span>
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
                              handleViewDetail(po.id);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canEdit && po.status === 'draft' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDialog(po);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && po.status === 'draft' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Are you sure you want to delete this purchase order?')) {
                                  deleteMutation.mutate(po.id);
                                }
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

      <POFormDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseDialog();
          else setIsDialogOpen(true);
        }}
        purchaseOrder={editingPO}
        canEdit={canEdit}
      />
    </div>
  );
}
