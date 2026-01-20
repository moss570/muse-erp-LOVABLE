import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import {
  ClipboardList,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Building,
  User,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { useAudits, useCreateAudit, AUDIT_TYPE_CONFIG, AUDIT_STATUS_CONFIG } from '@/hooks/useAudits';
import type { AuditType } from '@/types/audits';
import { cn } from '@/lib/utils';
import { AuditDetailDialog } from '@/components/audits/AuditDetailDialog';

export default function Audits() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);

  const { data: audits, isLoading } = useAudits();
  const createAudit = useCreateAudit();

  // Form state with proper types
  const [formData, setFormData] = useState<{
    title: string;
    audit_type: AuditType;
    audit_date: string;
    auditor_name: string;
    auditor_organization: string;
    audit_scope: string;
    description: string;
  }>({
    title: '',
    audit_type: 'internal',
    audit_date: format(new Date(), 'yyyy-MM-dd'),
    auditor_name: '',
    auditor_organization: '',
    audit_scope: '',
    description: '',
  });

  const filteredAudits = useMemo(() => {
    if (!audits) return [];
    return audits.filter(a => {
      if (search && !a.title.toLowerCase().includes(search.toLowerCase()) &&
          !a.audit_number.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (typeFilter !== 'all' && a.audit_type !== typeFilter) return false;
      return true;
    });
  }, [audits, search, statusFilter, typeFilter]);

  const scheduledAudits = audits?.filter(a => a.status === 'scheduled').length || 0;
  const inProgressAudits = audits?.filter(a => a.status === 'in_progress').length || 0;
  const totalFindings = audits?.reduce((sum, a) => sum + (a.total_findings || 0), 0) || 0;

  const handleCreate = async () => {
    await createAudit.mutateAsync(formData);
    setShowCreateDialog(false);
    setFormData({
      title: '',
      audit_type: 'internal',
      audit_date: format(new Date(), 'yyyy-MM-dd'),
      auditor_name: '',
      auditor_organization: '',
      audit_scope: '',
      description: '',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Audits</h1>
          <p className="text-muted-foreground">
            Schedule, conduct, and track internal and external audits
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Audit
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Audits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{audits?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Scheduled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{scheduledAudits}</div>
          </CardContent>
        </Card>

        <Card className={cn(inProgressAudits > 0 && 'border-amber-300')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn('text-2xl font-bold', inProgressAudits > 0 && 'text-amber-600')}>
              {inProgressAudits}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Total Findings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFindings}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search audits..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(AUDIT_STATUS_CONFIG).map(([value, config]) => (
                  <SelectItem key={value} value={value}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(AUDIT_TYPE_CONFIG).map(([value, config]) => (
                  <SelectItem key={value} value={value}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Audit #</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Auditor</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Findings</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  </TableRow>
                ))
              ) : filteredAudits.length > 0 ? (
                filteredAudits.map((audit) => {
                  const typeConfig = AUDIT_TYPE_CONFIG[audit.audit_type];
                  const statusConfig = AUDIT_STATUS_CONFIG[audit.status];
                  return (
                    <TableRow key={audit.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedAuditId(audit.id)}>
                      <TableCell className="font-mono text-sm">
                        {audit.audit_number}
                      </TableCell>
                      <TableCell>
                        <span className="max-w-[300px] truncate block">{audit.title}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{typeConfig?.label || audit.audit_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig?.color || ''}>{statusConfig?.label || audit.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {audit.auditor_name ? (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{audit.auditor_name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(audit.audit_date), 'PP')}
                      </TableCell>
                      <TableCell>
                        {audit.total_findings || 0}
                        {(audit.critical_findings || 0) > 0 && (
                          <Badge variant="destructive" className="ml-2 text-xs">
                            {audit.critical_findings} critical
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No audits found matching your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Schedule New Audit</DialogTitle>
            <DialogDescription>
              Create a new internal or external audit.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Audit Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Q1 2026 Food Safety Audit"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Audit Type</Label>
                <Select
                  value={formData.audit_type}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, audit_type: v as AuditType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(AUDIT_TYPE_CONFIG).map(([value, config]) => (
                      <SelectItem key={value} value={value}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Audit Date *</Label>
                <Input
                  type="date"
                  value={formData.audit_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, audit_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Auditor Name</Label>
                <Input
                  value={formData.auditor_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, auditor_name: e.target.value }))}
                  placeholder="Jane Smith"
                />
              </div>
              <div className="space-y-2">
                <Label>Organization</Label>
                <Input
                  value={formData.auditor_organization}
                  onChange={(e) => setFormData(prev => ({ ...prev, auditor_organization: e.target.value }))}
                  placeholder="SQF Certification Body"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Audit Scope</Label>
              <Input
                value={formData.audit_scope}
                onChange={(e) => setFormData(prev => ({ ...prev, audit_scope: e.target.value }))}
                placeholder="Full facility, production areas, storage"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Additional notes about the audit..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreate}
              disabled={!formData.title || !formData.audit_date || createAudit.isPending}
            >
              Schedule Audit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audit Detail Dialog */}
      {selectedAuditId && (
        <AuditDetailDialog
          open={!!selectedAuditId}
          onOpenChange={(open) => !open && setSelectedAuditId(null)}
          auditId={selectedAuditId}
        />
      )}
    </div>
  );
}
