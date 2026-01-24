import { useState } from 'react';
import { format } from 'date-fns';
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Upload,
  Eye,
  RefreshCw,
  Mail,
  Loader2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTableHeader } from '@/components/ui/data-table/DataTableHeader';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { usePendingOrders, type PendingPurchaseOrder } from '@/hooks/usePendingOrders';
import { POReviewWizard } from '@/components/sales/POReviewWizard';
import { ImportPODialog } from '@/components/sales/ImportPODialog';

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

function getStatusBadge(status: string) {
  switch (status) {
    case 'pending':
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      );
    case 'reviewing':
      return (
        <Badge variant="default" className="gap-1 bg-blue-500">
          <Eye className="h-3 w-3" />
          Reviewing
        </Badge>
      );
    case 'approved':
      return (
        <Badge variant="default" className="gap-1 bg-green-600">
          <CheckCircle2 className="h-3 w-3" />
          Approved
        </Badge>
      );
    case 'rejected':
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Rejected
        </Badge>
      );
    case 'error':
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Error
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getExtractionBadge(status: string) {
  switch (status) {
    case 'completed':
      return (
        <Badge variant="outline" className="gap-1 border-green-500 text-green-600">
          <CheckCircle2 className="h-3 w-3" />
          Extracted
        </Badge>
      );
    case 'processing':
      return (
        <Badge variant="outline" className="gap-1 border-blue-500 text-blue-600">
          <Loader2 className="h-3 w-3 animate-spin" />
          Processing
        </Badge>
      );
    case 'failed':
      return (
        <Badge variant="outline" className="gap-1 border-red-500 text-red-600">
          <XCircle className="h-3 w-3" />
          Failed
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="gap-1">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      );
  }
}

export default function PendingOrders() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<PendingPurchaseOrder | null>(null);
  const [showReviewWizard, setShowReviewWizard] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);

  const { data: orders, isLoading, refetch } = usePendingOrders(
    statusFilter !== 'all' ? statusFilter : undefined
  );

  // Filter orders by search query
  const filteredOrders = orders?.filter((order) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const poNumber = order.raw_extracted_data?.po_number?.toLowerCase() || '';
    const customerName = order.raw_extracted_data?.customer_name?.toLowerCase() || '';
    const matchedCustomer = order.matched_customer?.name?.toLowerCase() || '';
    const email = order.email_from?.toLowerCase() || '';
    return (
      poNumber.includes(query) ||
      customerName.includes(query) ||
      matchedCustomer.includes(query) ||
      email.includes(query)
    );
  });

  // Stats
  const stats = {
    total: orders?.length || 0,
    pending: orders?.filter((o) => o.status === 'pending').length || 0,
    reviewing: orders?.filter((o) => o.status === 'reviewing').length || 0,
    approved: orders?.filter((o) => o.status === 'approved').length || 0,
  };

  const handleReviewOrder = (order: PendingPurchaseOrder) => {
    setSelectedOrder(order);
    setShowReviewWizard(true);
  };

  const handleCloseReviewWizard = () => {
    setShowReviewWizard(false);
    setSelectedOrder(null);
    refetch();
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Review</CardTitle>
            <Eye className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.reviewing}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approved}</div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Customer Purchase Orders</CardTitle>
          <CardDescription>
            Review and approve incoming purchase orders from customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTableHeader
            title="Pending Orders"
            searchPlaceholder="Search by PO#, customer, or email..."
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            filterValue={statusFilter}
            onFilterChange={setStatusFilter}
            filterOptions={STATUS_FILTER_OPTIONS}
            onAdd={() => setShowImportDialog(true)}
            addLabel="Import PDF"
            onRefresh={() => refetch()}
            isLoading={isLoading}
            totalCount={orders?.length}
            filteredCount={filteredOrders?.length}
          />

          {isLoading ? (
            <div className="space-y-2 mt-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="rounded-md border mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Received</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Extraction</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <FileText className="h-8 w-8 text-muted-foreground" />
                          <p className="text-muted-foreground">
                            No pending orders found
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowImportDialog(true)}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Import PDF
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders?.map((order) => (
                      <TableRow
                        key={order.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleReviewOrder(order)}
                      >
                        <TableCell className="font-medium">
                          {format(new Date(order.received_at), 'MMM d, yyyy')}
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(order.received_at), 'h:mm a')}
                          </div>
                        </TableCell>
                        <TableCell>
                          {order.email_from ? (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm truncate max-w-[150px]">
                                {order.email_from}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Upload className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                Manual Upload
                              </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-mono">
                          {order.raw_extracted_data?.po_number || (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {order.matched_customer ? (
                            <div>
                              <span className="font-medium">
                                {order.matched_customer.name}
                              </span>
                              {order.customer_confidence && (
                                <span className="text-xs text-muted-foreground ml-1">
                                  ({Math.round(order.customer_confidence * 100)}%)
                                </span>
                              )}
                            </div>
                          ) : order.raw_extracted_data?.customer_name ? (
                            <div className="flex items-center gap-1">
                              <AlertCircle className="h-3 w-3 text-yellow-500" />
                              <span className="text-sm">
                                {order.raw_extracted_data.customer_name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {order.raw_extracted_data?.line_items?.length || 0} items
                        </TableCell>
                        <TableCell>
                          {getExtractionBadge(order.extraction_status)}
                        </TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReviewOrder(order);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Wizard Dialog */}
      {selectedOrder && (
        <POReviewWizard
          open={showReviewWizard}
          onOpenChange={(open) => {
            if (!open) handleCloseReviewWizard();
          }}
          pendingOrder={selectedOrder}
        />
      )}

      {/* Import Dialog */}
      <ImportPODialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
      />
    </div>
  );
}
