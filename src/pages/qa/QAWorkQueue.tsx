import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Search, Download, Filter, ExternalLink, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { WorkQueueSummary } from '@/components/qa/WorkQueueSummary';
import { useQAWorkQueue, useQAWorkQueueSummary, WorkQueueItemType, WorkQueuePriority } from '@/hooks/useQAWorkQueue';

const TYPE_LABELS: Record<WorkQueueItemType, string> = {
  material_issue_critical: 'Material Issue (Critical)',
  material_issue_important: 'Material Issue (Important)',
  supplier_issue: 'Supplier Issue',
  document_expiry: 'Document Expiry',
  conditional_expiry: 'Conditional Expiring',
  override_request: 'Override Request',
  override_followup: 'Override Follow-up',
  stale_draft: 'Stale Draft',
  supplier_review: 'Supplier Review',
};

const PRIORITY_COLORS: Record<WorkQueuePriority, string> = {
  high: 'bg-destructive text-destructive-foreground',
  medium: 'bg-orange-500 text-white',
  low: 'bg-yellow-500 text-black',
};

export default function QAWorkQueue() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const filters = useMemo(() => ({
    types: typeFilter !== 'all' ? [typeFilter] : undefined,
    priorities: priorityFilter !== 'all' ? [priorityFilter] : undefined,
    search: search || undefined,
  }), [search, typeFilter, priorityFilter]);

  const { data: items, isLoading } = useQAWorkQueue(filters);
  const summary = useQAWorkQueueSummary();

  const paginatedItems = useMemo(() => {
    if (!items) return [];
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page]);

  const totalPages = Math.ceil((items?.length || 0) / pageSize);

  const handleExport = () => {
    if (!items) return;
    
    const headers = ['Priority', 'Type', 'Item', 'Code', 'Issue', 'Due Date', 'Days'];
    const rows = items.map((item) => [
      item.priority.toUpperCase(),
      TYPE_LABELS[item.type] || item.type,
      item.entityName,
      item.entityCode || '',
      item.issueDescription,
      item.dueDate ? format(item.dueDate, 'yyyy-MM-dd') : '',
      item.daysUntilDue?.toString() || '',
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qa-work-queue-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          📋 QA Work Queue
        </h1>
        <p className="text-muted-foreground">
          Items requiring attention in the next 45 days
        </p>
      </div>

      {/* Summary Cards */}
      <WorkQueueSummary summary={summary} isLoading={isLoading} />

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">🔴 High</SelectItem>
                <SelectItem value="medium">🟠 Medium</SelectItem>
                <SelectItem value="low">🟡 Low</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExport} disabled={!items?.length}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : paginatedItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No items in the work queue
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Priority</TableHead>
                    <TableHead className="w-[180px]">Type</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Issue</TableHead>
                    <TableHead className="w-[80px] text-right">Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map((item) => {
                    // Build the URL based on entity type
                    const getItemUrl = () => {
                      switch (item.entityType) {
                        case 'material':
                          return `/inventory/materials?id=${item.entityId}`;
                        case 'supplier':
                          return `/purchasing/suppliers?id=${item.entityId}`;
                        case 'product':
                          return `/inventory/products?id=${item.entityId}`;
                        case 'override_request':
                          return `/qa/override-requests?id=${item.entityId}`;
                        default:
                          return null;
                      }
                    };
                    
                    const itemUrl = getItemUrl();
                    
                    const handleRowClick = () => {
                      if (itemUrl) {
                        window.open(itemUrl, '_blank');
                      }
                    };
                    
                    return (
                      <TableRow 
                        key={item.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={handleRowClick}
                      >
                        <TableCell>
                          <Badge className={PRIORITY_COLORS[item.priority]}>
                            {item.priority.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {TYPE_LABELS[item.type] || item.type}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="font-medium">{item.entityName}</div>
                              {item.entityCode && (
                                <div className="text-sm text-muted-foreground">
                                  {item.entityCode}
                                </div>
                              )}
                            </div>
                            {itemUrl && (
                              <ExternalLink className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {item.issueDescription}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {item.daysUntilDue !== undefined && (
                            <span className={item.isOverdue ? 'text-destructive font-medium' : ''}>
                              {item.daysUntilDue}d
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {(page - 1) * pageSize + 1}-
                    {Math.min(page * pageSize, items?.length || 0)} of {items?.length || 0}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      ← Prev
                    </Button>
                    <span className="flex items-center px-3 text-sm">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Next →
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
