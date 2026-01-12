import { useState } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ClipboardCheck,
  Clock,
  FileEdit,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
  FileText,
} from 'lucide-react';
import { useQAPendingItems, useStaleDraftItems, useRecentApprovalActivity, useDocumentExpirationWatchlist } from '@/hooks/useApprovalEngine';
import { useExpiringDocumentsCount } from '@/hooks/useComplianceDocuments';
import { ApprovalStatusBadge } from '@/components/approval/ApprovalStatusBadge';
import { ApprovalActionsDropdown } from '@/components/approval/ApprovalActionsDropdown';
import { DocumentExpirationBadge } from '@/components/approval/DocumentExpirationBadge';
import { cn } from '@/lib/utils';

// Map table names to display names and routes
const tableConfig: Record<string, { label: string; route: string }> = {
  materials: { label: 'Material', route: '/inventory/materials' },
  suppliers: { label: 'Supplier', route: '/purchasing/suppliers' },
  products: { label: 'Product', route: '/inventory/products' },
  production_lots: { label: 'Production Lot', route: '/manufacturing/batches' },
  po_receiving_sessions: { label: 'Receiving', route: '/purchasing/receiving' },
  receiving_lots: { label: 'Receiving Lot', route: '/inventory/material-inventory' },
};

export default function QADashboard() {
  const navigate = useNavigate();
  const { data: pendingItems, isLoading: pendingLoading, refetch: refetchPending } = useQAPendingItems();
  const { data: staleItems, isLoading: staleLoading } = useStaleDraftItems();
  const { data: expiringDocs, isLoading: docsLoading } = useDocumentExpirationWatchlist();
  const { data: docCounts } = useExpiringDocumentsCount();
  const { data: recentActivity, isLoading: activityLoading } = useRecentApprovalActivity(10);

  // Group pending items by table
  const groupedPending = pendingItems?.reduce((acc, item) => {
    const key = item.table_name;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, typeof pendingItems>);

  // Separate expired from expiring soon
  const expiredDocs = expiringDocs?.filter(d => d.expiration_status === 'expired') || [];
  const expiringSoonDocs = expiringDocs?.filter(d => d.expiration_status === 'expiring_soon') || [];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <ClipboardCheck className="h-8 w-8 text-primary" />
              QA Compliance Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              SQF compliance overview • Review pending approvals and document status
            </p>
          </div>
          <Button variant="outline" onClick={() => refetchPending()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending QA Review</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingItems?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Items awaiting approval</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stale Drafts</CardTitle>
              <FileEdit className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{staleItems?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Drafts older than 7 days</p>
            </CardContent>
          </Card>

          <Card className={cn(docCounts?.expired && docCounts.expired > 0 && 'border-destructive')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expired Documents</CardTitle>
              <XCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{docCounts?.expired || 0}</div>
              <p className="text-xs text-muted-foreground">Require immediate renewal</p>
            </CardContent>
          </Card>

          <Card className={cn(docCounts?.expiringSoon && docCounts.expiringSoon > 0 && 'border-amber-500')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{docCounts?.expiringSoon || 0}</div>
              <p className="text-xs text-muted-foreground">Within 45 days</p>
            </CardContent>
          </Card>
        </div>

        {/* Expired Documents Alert */}
        {expiredDocs.length > 0 && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Action Required: Expired Documents</AlertTitle>
            <AlertDescription>
              {expiredDocs.length} document(s) have expired and require immediate renewal for SQF compliance.
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              QA Inbox
              {pendingItems && pendingItems.length > 0 && (
                <Badge variant="secondary" className="ml-1">{pendingItems.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="stale" className="gap-2">
              <FileEdit className="h-4 w-4" />
              Stale Drafts
              {staleItems && staleItems.length > 0 && (
                <Badge variant="secondary" className="ml-1">{staleItems.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2">
              <FileText className="h-4 w-4" />
              Document Watchlist
              {(docCounts?.expired || 0) + (docCounts?.expiringSoon || 0) > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {(docCounts?.expired || 0) + (docCounts?.expiringSoon || 0)}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Pending QA Tab */}
          <TabsContent value="pending" className="space-y-4">
            {pendingLoading ? (
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                </CardContent>
              </Card>
            ) : !pendingItems || pendingItems.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500 mb-4" />
                  <h3 className="text-lg font-semibold">All Caught Up!</h3>
                  <p className="text-muted-foreground">No items pending QA review</p>
                </CardContent>
              </Card>
            ) : (
              Object.entries(groupedPending || {}).map(([tableName, items]) => (
                <Card key={tableName}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {tableConfig[tableName]?.label || tableName}
                      <Badge variant="outline">{items?.length || 0}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Code</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items?.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.item_name}</TableCell>
                            <TableCell className="text-muted-foreground">{item.item_code}</TableCell>
                            <TableCell>
                              <ApprovalStatusBadge status={item.approval_status} size="sm" />
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {format(new Date(item.created_at), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate(tableConfig[tableName]?.route || '/')}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                                <ApprovalActionsDropdown
                                  recordId={item.id}
                                  tableName={tableName as 'materials' | 'suppliers' | 'products' | 'production_lots' | 'po_receiving_sessions' | 'receiving_lots'}
                                  currentStatus={item.approval_status}
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Stale Drafts Tab */}
          <TabsContent value="stale">
            <Card>
              <CardHeader>
                <CardTitle>Setup In-Progress</CardTitle>
                <CardDescription>
                  Items that have been in Draft status for more than 7 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                {staleLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : !staleItems || staleItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-emerald-500" />
                    <p>No stale drafts</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Days Stale</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staleItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Badge variant="outline">{tableConfig[item.table_name]?.label || item.table_name}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{item.item_name}</TableCell>
                          <TableCell className="text-muted-foreground">{item.item_code}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-amber-500/10 text-amber-600">
                              {item.days_stale} days
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(tableConfig[item.table_name]?.route || '/')}
                            >
                              <ExternalLink className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Document Watchlist Tab */}
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle>Document Expiration Watchlist</CardTitle>
                <CardDescription>
                  Compliance documents expiring within 45 days or already expired
                </CardDescription>
              </CardHeader>
              <CardContent>
                {docsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : !expiringDocs || expiringDocs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-emerald-500" />
                    <p>All documents are up to date</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Entity</TableHead>
                        <TableHead>Document</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Expiration</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expiringDocs.map((doc) => (
                        <TableRow key={doc.id} className={cn(doc.expiration_status === 'expired' && 'bg-destructive/5')}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{doc.entity_name}</span>
                              <span className="text-xs text-muted-foreground capitalize">{doc.related_entity_type}</span>
                            </div>
                          </TableCell>
                          <TableCell>{doc.document_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-normal">
                              {doc.document_type.replace(/_/g, ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(doc.expiration_date), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            <DocumentExpirationBadge expirationDate={doc.expiration_date} size="sm" />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  // Navigate to the entity based on type
                                  const routes: Record<string, string> = {
                                    material: '/inventory/materials',
                                    supplier: '/purchasing/suppliers',
                                    product: '/inventory/products',
                                  };
                                  const route = routes[doc.related_entity_type];
                                  if (route) {
                                    navigate(`${route}?edit=${doc.related_entity_id}`);
                                  }
                                }}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm">
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Renew
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Approval Activity</CardTitle>
            <CardDescription>Last 10 approval actions across all entities</CardDescription>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : !recentActivity || recentActivity.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground">No recent activity</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((log) => (
                  <div key={log.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <ApprovalStatusBadge status={log.new_status || 'Draft'} size="sm" showIcon={false} />
                      <div>
                        <span className="font-medium">{log.action}</span>
                        <span className="text-muted-foreground mx-2">•</span>
                        <span className="text-sm text-muted-foreground capitalize">
                          {log.related_table_name.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {log.profiles?.first_name} {log.profiles?.last_name}
                      <span className="mx-2">•</span>
                      {format(new Date(log.timestamp), 'MMM d, h:mm a')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
