import { useState } from 'react';
import { Plus, Filter, FileText, TrendingUp, AlertTriangle, Search, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useNonConformities } from '@/hooks/useNonConformities';
import { 
  NC_TYPE_CONFIG, 
  IMPACT_LEVEL_CONFIG, 
  SEVERITY_CONFIG, 
  STATUS_CONFIG,
  NCType,
  ImpactLevel,
  NCSeverity,
  NCStatus,
} from '@/types/non-conformities';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { NCFormDialog } from '@/components/quality/nc/NCFormDialog';
import { NCDetailDialog } from '@/components/quality/nc/NCDetailDialog';
import { SQFAuditReportDialog } from '@/components/quality/nc/SQFAuditReportDialog';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export default function NonConformities() {
  const navigate = useNavigate();
  const [selectedNCId, setSelectedNCId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [impactFilter, setImpactFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filters = {
    ...(statusFilter !== 'all' && { status: statusFilter }),
    ...(typeFilter !== 'all' && { nc_type: typeFilter }),
    ...(severityFilter !== 'all' && { severity: severityFilter }),
    ...(impactFilter !== 'all' && { impact_level: impactFilter }),
  };

  const { data: ncs = [], isLoading } = useNonConformities(filters);

  // Filter by search term
  const filteredNCs = ncs.filter(nc => 
    searchTerm === '' ||
    nc.nc_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    nc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    nc.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Quick stats
  const stats = {
    total: ncs.length,
    open: ncs.filter(nc => nc.status === 'open').length,
    critical: ncs.filter(nc => nc.severity === 'critical').length,
    food_safety: ncs.filter(nc => nc.impact_level === 'food_safety').length,
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Non-Conformities</h1>
          <p className="text-muted-foreground">
            SQF quality event tracking and disposition management
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/quality/nc-analytics')}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
          <Button variant="outline" onClick={() => setShowReportDialog(true)}>
            <FileText className="h-4 w-4 mr-2" />
            SQF Audit Report
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Report Non-Conformity
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total NCs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Open</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.open}</p>
          </CardContent>
        </Card>

        <Card className={stats.critical > 0 ? 'border-red-500' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Critical Severity</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.critical}</p>
          </CardContent>
        </Card>

        <Card className={stats.food_safety > 0 ? 'border-red-500' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Food Safety Impact</CardTitle>
            <TrendingUp className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.food_safety}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <CardTitle className="text-base">Filters</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search NCs..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                    <SelectItem key={value} value={value}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Type</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(NC_TYPE_CONFIG).map(([value, config]) => (
                    <SelectItem key={value} value={value}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Severity</label>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  {Object.entries(SEVERITY_CONFIG).map(([value, config]) => (
                    <SelectItem key={value} value={value}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Impact Level</label>
              <Select value={impactFilter} onValueChange={setImpactFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Impact Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Impact Levels</SelectItem>
                  {Object.entries(IMPACT_LEVEL_CONFIG).map(([value, config]) => (
                    <SelectItem key={value} value={value}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* NC List Table */}
      <Card>
        <CardHeader>
          <CardTitle>Non-Conformity Records</CardTitle>
          <CardDescription>
            {filteredNCs.length} record{filteredNCs.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredNCs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No non-conformities found</p>
              <p className="text-sm">Try adjusting your filters or create a new record</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>NC Number</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Impact</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Disposition</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNCs.map((nc) => (
                  <TableRow 
                    key={nc.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedNCId(nc.id)}
                  >
                    <TableCell className="font-mono font-medium">{nc.nc_number}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{nc.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {NC_TYPE_CONFIG[nc.nc_type as NCType]?.label || nc.nc_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn(
                        IMPACT_LEVEL_CONFIG[nc.impact_level as ImpactLevel]?.bgColor,
                        IMPACT_LEVEL_CONFIG[nc.impact_level as ImpactLevel]?.color
                      )}>
                        {IMPACT_LEVEL_CONFIG[nc.impact_level as ImpactLevel]?.label || nc.impact_level}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn(
                        SEVERITY_CONFIG[nc.severity as NCSeverity]?.bgColor,
                        SEVERITY_CONFIG[nc.severity as NCSeverity]?.textColor
                      )}>
                        {SEVERITY_CONFIG[nc.severity as NCSeverity]?.label || nc.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">
                      {nc.disposition.replace(/_/g, ' ')}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn(
                        STATUS_CONFIG[nc.status as NCStatus]?.bgColor,
                        STATUS_CONFIG[nc.status as NCStatus]?.color
                      )}>
                        {STATUS_CONFIG[nc.status as NCStatus]?.label || nc.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(nc.discovered_date), 'MMM d, yyyy')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <NCFormDialog 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog} 
      />

      <NCDetailDialog
        ncId={selectedNCId}
        open={!!selectedNCId}
        onOpenChange={(open) => !open && setSelectedNCId(null)}
      />

      <SQFAuditReportDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
      />
    </div>
  );
}
