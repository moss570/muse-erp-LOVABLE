import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  ClipboardCheck,
  Calendar,
  User,
  Building,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Play,
  FileText,
  Loader2,
} from 'lucide-react';

import { useAudit, useAuditFindings, useUpdateAudit, AUDIT_TYPE_CONFIG, FINDING_TYPE_CONFIG } from '@/hooks/useAudits';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

import { FindingFormDialog } from './FindingFormDialog';
import type { AuditStatus, AuditFinding } from '@/types/audits';
import { CAPA_SEVERITY_CONFIG } from '@/types/capa';

interface AuditDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  auditId: string;
}

const STATUS_CONFIG: Record<AuditStatus, { label: string; color: string; bgColor: string }> = {
  scheduled: { label: 'Scheduled', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  in_progress: { label: 'In Progress', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  completed: { label: 'Completed', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  findings_review: { label: 'Findings Review', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  closed: { label: 'Closed', color: 'text-green-700', bgColor: 'bg-green-100' },
};

export function AuditDetailDialog({ open, onOpenChange, auditId }: AuditDetailDialogProps) {
  const { data: audit, isLoading } = useAudit(auditId);
  const { data: findings } = useAuditFindings(auditId);
  const updateAudit = useUpdateAudit();

  const [activeTab, setActiveTab] = useState('overview');
  const [showFindingDialog, setShowFindingDialog] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState<AuditFinding | null>(null);
  const [summary, setSummary] = useState('');

  useEffect(() => {
    if (audit?.description) {
      setSummary(audit.description);
    }
  }, [audit]);

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </DialogContent>
      </Dialog>
    );
  }

  if (!audit) return null;

  const typeConfig = AUDIT_TYPE_CONFIG[audit.audit_type];
  const statusConfig = STATUS_CONFIG[audit.status];

  const handleStatusChange = async (newStatus: AuditStatus) => {
    await updateAudit.mutateAsync({ id: auditId, status: newStatus });
  };

  const handleSaveSummary = async () => {
    await updateAudit.mutateAsync({ id: auditId, description: summary });
  };

  // Group findings by type
  const nonConformances = findings?.filter((f) => f.finding_type === 'non_conformance') || [];
  const observations = findings?.filter((f) => f.finding_type === 'observation') || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <ClipboardCheck className="h-6 w-6 mt-1 text-muted-foreground" />
              <div>
                <span className="text-xs text-muted-foreground">{audit.audit_number}</span>
                <DialogTitle className="text-xl">{audit.title}</DialogTitle>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{typeConfig?.label}</Badge>
              <Badge className={cn(statusConfig?.bgColor, statusConfig?.color)}>
                {statusConfig?.label}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Status Actions */}
        <div className="flex gap-2 px-6 pb-4">
          {audit.status === 'scheduled' && (
            <Button size="sm" onClick={() => handleStatusChange('in_progress')}>
              <Play className="h-4 w-4 mr-1" />
              Start Audit
            </Button>
          )}
          {audit.status === 'in_progress' && (
            <Button size="sm" onClick={() => handleStatusChange('completed')}>
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Complete Audit
            </Button>
          )}
          {audit.status === 'completed' && (
            <Button size="sm" onClick={() => handleStatusChange('findings_review')}>
              <FileText className="h-4 w-4 mr-1" />
              Begin Findings Review
            </Button>
          )}
          {audit.status === 'findings_review' && (
            <Button size="sm" onClick={() => handleStatusChange('closed')}>
              Close Audit
            </Button>
          )}
        </div>

        <div className="flex-1 min-h-0 px-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            <TabsList className="flex-shrink-0 mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="findings">
                Findings
                {findings && findings.length > 0 && (
                  <Badge variant="secondary" className="ml-2">{findings.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 min-h-0 pb-6">
              {/* OVERVIEW TAB */}
              <TabsContent value="overview" className="space-y-4 mt-0 pr-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Audit Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {format(new Date(audit.audit_date), 'MMMM d, yyyy')}
                          {audit.audit_end_date && ` - ${format(new Date(audit.audit_end_date), 'MMMM d, yyyy')}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {audit.auditor_type === 'internal' ? (
                          <>
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {audit.lead_auditor
                                ? `${audit.lead_auditor.first_name} ${audit.lead_auditor.last_name}`
                                : 'No auditor assigned'}
                            </span>
                          </>
                        ) : (
                          <>
                            <Building className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {audit.auditor_name}
                              {audit.auditor_organization && ` (${audit.auditor_organization})`}
                            </span>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Findings Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">Critical</div>
                          <div className={cn('text-xl font-bold', audit.critical_findings > 0 && 'text-red-600')}>
                            {nonConformances.filter((f) => f.severity === 'critical').length}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">Major</div>
                          <div className={cn('text-xl font-bold', audit.major_findings > 0 && 'text-amber-600')}>
                            {nonConformances.filter((f) => f.severity === 'major').length}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">Minor</div>
                          <div className="text-xl font-bold text-blue-600">
                            {nonConformances.filter((f) => f.severity === 'minor').length}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">Observations</div>
                          <div className="text-xl font-bold">{observations.length}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {audit.audit_scope && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Scope</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{audit.audit_scope}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* FINDINGS TAB */}
              <TabsContent value="findings" className="mt-0 pr-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">Audit Findings</h3>
                  <Button size="sm" onClick={() => { setSelectedFinding(null); setShowFindingDialog(true); }}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Finding
                  </Button>
                </div>

                {findings && findings.length > 0 ? (
                  <Card>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Finding #</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>CAPA</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {findings.map((finding) => {
                          const typeConfig = FINDING_TYPE_CONFIG[finding.finding_type];
                          const severityConfig = finding.severity
                            ? CAPA_SEVERITY_CONFIG[finding.severity]
                            : null;

                          return (
                            <TableRow
                              key={finding.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => { setSelectedFinding(finding); setShowFindingDialog(true); }}
                            >
                              <TableCell className="font-mono text-sm">{finding.finding_number}</TableCell>
                              <TableCell>
                                <Badge className={cn(typeConfig.bgColor, typeConfig.color)}>
                                  {typeConfig.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {severityConfig ? (
                                  <Badge className={cn(severityConfig.bgColor, severityConfig.color)}>
                                    {severityConfig.label}
                                  </Badge>
                                ) : '-'}
                              </TableCell>
                              <TableCell>{finding.title}</TableCell>
                              <TableCell className="capitalize">
                                {finding.status.replace('_', ' ')}
                              </TableCell>
                              <TableCell>
                                {finding.capa ? (
                                  <Badge variant="secondary">
                                    {finding.capa.capa_number}
                                  </Badge>
                                ) : finding.capa_required ? (
                                  <Badge variant="destructive">Required</Badge>
                                ) : '-'}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </Card>
                ) : (
                  <Card className="p-8">
                    <div className="text-center text-muted-foreground">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="mb-4">No findings recorded yet</p>
                      <Button onClick={() => { setSelectedFinding(null); setShowFindingDialog(true); }}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add First Finding
                      </Button>
                    </div>
                  </Card>
                )}
              </TabsContent>

              {/* SUMMARY TAB */}
              <TabsContent value="summary" className="mt-0 pr-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Audit Summary</CardTitle>
                    <CardDescription>
                      Provide an executive summary of the audit results
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      placeholder="Summarize the key findings, observations, and recommendations from this audit..."
                      rows={8}
                    />
                    <Button
                      onClick={handleSaveSummary}
                      disabled={updateAudit.isPending}
                    >
                      {updateAudit.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Save Summary
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>

        {/* Finding Form Dialog */}
        <FindingFormDialog
          open={showFindingDialog}
          onOpenChange={setShowFindingDialog}
          auditId={auditId}
          auditNumber={audit.audit_number}
          finding={selectedFinding}
        />
      </DialogContent>
    </Dialog>
  );
}
