import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import {
  AlertTriangle,
  Clock,
  Filter,
  Plus,
  Search,
  CheckCircle,
  XCircle,
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

import { CapaStatusBadge } from '@/components/capa/CapaStatusBadge';
import { CapaSeverityBadge } from '@/components/capa/CapaSeverityBadge';
import { CapaFormDialog } from '@/components/capa/CapaFormDialog';
import { CapaDetailDialog } from '@/components/capa/CapaDetailDialog';

import { useCapaList, useCapaDashboardMetrics, type CapaFilters } from '@/hooks/useCapa';
import { 
  CAPA_TYPE_CONFIG, 
  CAPA_STATUS_CONFIG,
  CAPA_SEVERITY_CONFIG,
  type CapaStatus, 
  type CapaSeverity,
  type CapaType,
} from '@/types/capa';
import { cn } from '@/lib/utils';

export default function CapaManagement() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedCapaId, setSelectedCapaId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filters: CapaFilters = useMemo(() => ({
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter as CapaStatus : 'all',
    severity: severityFilter !== 'all' ? severityFilter as CapaSeverity : 'all',
    capa_type: typeFilter !== 'all' ? typeFilter as CapaType : 'all',
  }), [search, statusFilter, severityFilter, typeFilter]);

  const { data: capas, isLoading } = useCapaList(filters);
  const { data: metrics } = useCapaDashboardMetrics();

  const openCapas = capas?.filter(c => c.status !== 'closed' && c.status !== 'cancelled').length || 0;
  const overdueCapas = capas?.filter(c => c.is_overdue).length || 0;
  const criticalCapas = capas?.filter(c => c.severity === 'critical' && c.status !== 'closed').length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Corrective Actions (CAPA)</h1>
          <p className="text-muted-foreground">
            Manage and track corrective and preventive actions
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New CAPA
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Open CAPAs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openCapas}</div>
          </CardContent>
        </Card>

        <Card className={cn(overdueCapas > 0 && 'border-destructive')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn('text-2xl font-bold', overdueCapas > 0 && 'text-destructive')}>
              {overdueCapas}
            </div>
          </CardContent>
        </Card>

        <Card className={cn(criticalCapas > 0 && 'border-red-300')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Critical
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn('text-2xl font-bold', criticalCapas > 0 && 'text-red-600')}>
              {criticalCapas}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Closed This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {metrics?.closedThisMonth || 0}
            </div>
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
                placeholder="Search CAPAs..."
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
                {Object.entries(CAPA_STATUS_CONFIG).map(([value, config]) => (
                  <SelectItem key={value} value={value}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                {Object.entries(CAPA_SEVERITY_CONFIG).map(([value, config]) => (
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
                {Object.entries(CAPA_TYPE_CONFIG).map(([value, config]) => (
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
                <TableHead>CAPA #</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Days Open</TableHead>
                <TableHead>Next Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : capas && capas.length > 0 ? (
                capas.map((capa) => {
                  const typeConfig = CAPA_TYPE_CONFIG[capa.capa_type as CapaType];
                  return (
                    <TableRow 
                      key={capa.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedCapaId(capa.id)}
                    >
                      <TableCell className="font-mono text-sm">
                        {capa.capa_number}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {capa.is_overdue && (
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                          )}
                          <span className="max-w-[300px] truncate">{capa.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{typeConfig?.label || capa.capa_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <CapaSeverityBadge severity={capa.severity as CapaSeverity} />
                      </TableCell>
                      <TableCell>
                        <CapaStatusBadge status={capa.status as CapaStatus} />
                      </TableCell>
                      <TableCell>
                        {capa.assigned_to_profile ? (
                          <span className="text-sm">
                            {capa.assigned_to_profile.first_name} {capa.assigned_to_profile.last_name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          'font-medium',
                          capa.days_open && capa.days_open > 30 && 'text-amber-600',
                          capa.days_open && capa.days_open > 60 && 'text-red-600'
                        )}>
                          {capa.days_open || 0}
                        </span>
                      </TableCell>
                      <TableCell>
                        {capa.next_due_date ? (
                          <div className="text-sm">
                            <div className={cn(
                              capa.is_overdue && 'text-destructive font-medium'
                            )}>
                              {format(new Date(capa.next_due_date), 'PP')}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {capa.next_due_action}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No CAPAs found matching your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CapaFormDialog 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog} 
      />

      <CapaDetailDialog
        open={!!selectedCapaId}
        onOpenChange={(open) => !open && setSelectedCapaId(null)}
        capaId={selectedCapaId}
      />
    </div>
  );
}
