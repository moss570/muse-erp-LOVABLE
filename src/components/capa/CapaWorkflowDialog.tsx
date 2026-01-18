import { useState } from 'react';
import { format, isPast } from 'date-fns';
import {
  ShieldCheck,
  Search,
  Lightbulb,
  ClipboardCheck,
  TrendingUp,
  FileWarning,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  Target,
} from 'lucide-react';

import {
  useCapa,
  useUpdateCapa,
  useUpdateCapaStatus,
  useCapaActivityLog,
  useCapaAttachments,
} from '@/hooks/useCapa';
import { useCapaTasks } from '@/hooks/useCapaTasks';
import { useProfiles } from '@/hooks/useReceivingCapa';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

import { FiveWhysAnalysis } from './FiveWhysAnalysis';
import { FishboneDiagram } from './FishboneDiagram';
import { CapaTaskList } from './CapaTaskList';
import { CapaActivityTimeline } from './CapaActivityTimeline';
import { CapaAttachments } from './CapaAttachments';

// Extended CAPA type with workflow fields
interface ExtendedCapa {
  id: string;
  capa_number: string;
  title: string;
  description: string;
  capa_type: string;
  severity: string;
  status: string;
  source_type: string | null;
  occurrence_date: string;
  discovery_date: string;
  assigned_to: string | null;
  containment_due_date: string | null;
  containment_actions: string | null;
  containment_completed_at: string | null;
  root_cause_due_date: string | null;
  root_cause_statement: string | null;
  root_cause_category: string | null;
  investigation_summary: string | null;
  corrective_action_due_date: string | null;
  corrective_actions_text: string | null;
  preventive_actions_text: string | null;
  verification_due_date: string | null;
  verification_method: string | null;
  verification_results: string | null;
  effectiveness_review_due_date: string | null;
  effectiveness_criteria: string | null;
  effectiveness_results: string | null;
  effectiveness_verified: boolean | null;
  [key: string]: unknown;
}

import {
  CAPA_STATUS_CONFIG,
  CAPA_SEVERITY_CONFIG,
  CAPA_TYPE_CONFIG,
  ROOT_CAUSE_CATEGORY_CONFIG,
  type CapaStatus,
  type CapaSeverity,
} from '@/types/capa';

// Workflow phases with their completion requirements
const WORKFLOW_PHASES = [
  {
    id: 'containment',
    label: 'Containment',
    icon: ShieldCheck,
    description: 'Immediate actions to contain the issue',
    requiredFields: ['containment_actions'],
    statuses: ['open', 'containment'],
  },
  {
    id: 'investigation',
    label: 'Investigation',
    icon: Search,
    description: 'Root cause analysis and investigation',
    requiredFields: ['root_cause_statement', 'root_cause_category'],
    statuses: ['investigating'],
  },
  {
    id: 'planning',
    label: 'Action Planning',
    icon: Lightbulb,
    description: 'Define corrective and preventive actions',
    requiredFields: ['corrective_actions_text', 'preventive_actions_text'],
    statuses: ['action_required'],
  },
  {
    id: 'verification',
    label: 'Verification',
    icon: ClipboardCheck,
    description: 'Verify actions were implemented',
    requiredFields: ['verification_method', 'verification_results'],
    statuses: ['verification'],
  },
  {
    id: 'effectiveness',
    label: 'Effectiveness',
    icon: TrendingUp,
    description: 'Review long-term effectiveness',
    requiredFields: ['effectiveness_criteria', 'effectiveness_results'],
    statuses: ['effectiveness_review'],
  },
];

interface CapaWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  capaId?: string;
  mode?: 'create' | 'edit' | 'view';
}

export function CapaWorkflowDialog({
  open,
  onOpenChange,
  capaId,
  mode = 'edit',
}: CapaWorkflowDialogProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'investigation' | 'actions' | 'activity' | 'attachments'>('details');
  const [expandedSections, setExpandedSections] = useState<string[]>(['problem', 'containment']);

  const { data: capaData, isLoading } = useCapa(capaId);
  const capa = capaData as ExtendedCapa | null;
  const { data: tasks } = useCapaTasks(capaId);
  const { data: activities } = useCapaActivityLog(capaId);
  const { data: attachments } = useCapaAttachments(capaId);
  const { data: profiles } = useProfiles();

  const updateCapa = useUpdateCapa();
  const updateStatus = useUpdateCapaStatus();

  const isViewMode = mode === 'view' || capa?.status === 'closed';

  // Helper to update CAPA fields
  const handleUpdateCapa = (field: string, value: unknown) => {
    if (!capaId) return;
    updateCapa.mutate({ id: capaId, [field]: value } as any);
  };

  const isViewMode = mode === 'view' || capa?.status === 'closed';

  // Calculate workflow progress
  const getWorkflowProgress = () => {
    if (!capa) return 0;
    const phases = WORKFLOW_PHASES;
    let completed = 0;

    if (capa.containment_actions) completed++;
    if (capa.root_cause_statement) completed++;
    if (capa.corrective_actions_text && capa.preventive_actions_text) completed++;
    if (capa.verification_results) completed++;
    if (capa.effectiveness_verified) completed++;

    return (completed / phases.length) * 100;
  };

  // Get current phase based on status
  const getCurrentPhase = () => {
    if (!capa) return 'containment';
    const statusToPhase: Record<string, string> = {
      open: 'containment',
      containment: 'containment',
      investigating: 'investigation',
      action_required: 'planning',
      verification: 'verification',
      effectiveness_review: 'effectiveness',
      closed: 'closed',
    };
    return statusToPhase[capa.status] || 'containment';
  };

  // Check if section has overdue items
  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return isPast(new Date(dueDate));
  };

  // Toggle section expansion
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(s => s !== sectionId)
        : [...prev, sectionId]
    );
  };

  if (isLoading && capaId) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!capa) {
    return null;
  }

  const overdueTasksCount = tasks?.filter(t => t.status === 'overdue').length || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <FileWarning className="h-5 w-5" />
                {capa.capa_number}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">{capa.title}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={cn(CAPA_SEVERITY_CONFIG[capa.severity as CapaSeverity]?.bgColor, CAPA_SEVERITY_CONFIG[capa.severity as CapaSeverity]?.color)}>
                {CAPA_SEVERITY_CONFIG[capa.severity as CapaSeverity]?.label}
              </Badge>
              <Badge variant="outline" className={cn(CAPA_STATUS_CONFIG[capa.status as CapaStatus]?.bgColor, CAPA_STATUS_CONFIG[capa.status as CapaStatus]?.color)}>
                {CAPA_STATUS_CONFIG[capa.status as CapaStatus]?.label}
              </Badge>
            </div>
          </div>

          {/* Progress Bar */}
          {capa.status !== 'closed' && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Workflow Progress</span>
                <span className="font-medium">{Math.round(getWorkflowProgress())}%</span>
              </div>
              <Progress value={getWorkflowProgress()} className="h-2" />

              {/* Phase Indicators */}
              <div className="flex justify-between mt-2">
                {WORKFLOW_PHASES.map((phase, index) => {
                  const PhaseIcon = phase.icon;
                  const isCurrent = getCurrentPhase() === phase.id;
                  const isComplete = index < WORKFLOW_PHASES.findIndex(p => p.id === getCurrentPhase());

                  return (
                    <div key={phase.id} className="flex flex-col items-center">
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center',
                        isComplete ? 'bg-green-100 text-green-600' :
                        isCurrent ? 'bg-blue-100 text-blue-600' :
                        'bg-muted text-muted-foreground'
                      )}>
                        {isComplete ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <PhaseIcon className="h-4 w-4" />
                        )}
                      </div>
                      <span className={cn(
                        'text-xs mt-1',
                        isCurrent ? 'font-medium' : 'text-muted-foreground'
                      )}>
                        {phase.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </DialogHeader>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="flex-shrink-0">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="investigation">
              Investigation
              {capa && !capa.root_cause_statement && capa.status === 'investigating' && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center">!</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="actions">
              Actions
              {overdueTasksCount > 0 && (
                <Badge variant="destructive" className="ml-2">{overdueTasksCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="activity">
              Activity
              <Badge variant="outline" className="ml-2">{activities?.length || 0}</Badge>
            </TabsTrigger>
            <TabsTrigger value="attachments">
              Files
              <Badge variant="outline" className="ml-2">{attachments?.length || 0}</Badge>
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            {/* Details Tab */}
            <TabsContent value="details" className="mt-0 p-4 space-y-4">
              {/* Problem Description Section */}
              <Collapsible open={expandedSections.includes('problem')} onOpenChange={() => toggleSection('problem')}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {expandedSections.includes('problem') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          <CardTitle className="text-base">Problem Description</CardTitle>
                        </div>
                        <Badge variant="outline" className="bg-green-100 text-green-700">Complete</Badge>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground">CAPA Type</Label>
                          <p className="text-sm font-medium mt-1">
                            {CAPA_TYPE_CONFIG[capa.capa_type as keyof typeof CAPA_TYPE_CONFIG]?.label || capa.capa_type}
                          </p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Source</Label>
                          <p className="text-sm font-medium mt-1 capitalize">
                            {capa.source_type || 'Manual'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Occurrence Date</Label>
                          <p className="text-sm font-medium mt-1">
                            {capa.occurrence_date ? format(new Date(capa.occurrence_date), 'PPP') : '-'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Discovery Date</Label>
                          <p className="text-sm font-medium mt-1">
                            {capa.discovery_date ? format(new Date(capa.discovery_date), 'PPP') : '-'}
                          </p>
                        </div>
                      </div>

                      <div>
                        <Label className="text-muted-foreground">Description</Label>
                        <div className="mt-1 p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                          {capa.description || 'No description provided'}
                        </div>
                      </div>

                      {/* Related Entities */}
                      {((capa as any).supplier || (capa as any).material || (capa as any).product) && (
                        <div>
                          <Label className="text-muted-foreground">Related Entities</Label>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {(capa as any).supplier && (
                              <Badge variant="outline">Supplier: {(capa as any).supplier.name}</Badge>
                            )}
                            {(capa as any).material && (
                              <Badge variant="outline">Material: {(capa as any).material.name}</Badge>
                            )}
                            {(capa as any).product && (
                              <Badge variant="outline">Product: {(capa as any).product.name}</Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Containment Section */}
              <Collapsible open={expandedSections.includes('containment')} onOpenChange={() => toggleSection('containment')}>
                <Card className={cn(
                  isOverdue(capa.containment_due_date) && !capa.containment_actions && 'border-destructive'
                )}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {expandedSections.includes('containment') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          <ShieldCheck className="h-4 w-4" />
                          <CardTitle className="text-base">Containment Actions</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                          {capa.containment_due_date && (
                            <span className={cn(
                              'text-xs',
                              isOverdue(capa.containment_due_date) && !capa.containment_actions ? 'text-destructive font-medium' : 'text-muted-foreground'
                            )}>
                              Due: {format(new Date(capa.containment_due_date), 'MMM d, h:mm a')}
                            </span>
                          )}
                          {capa.containment_actions ? (
                            <Badge variant="outline" className="bg-green-100 text-green-700">Complete</Badge>
                          ) : isOverdue(capa.containment_due_date) ? (
                            <Badge variant="destructive">Overdue</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-100 text-amber-700">Pending</Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Immediate Containment Actions Taken</Label>
                        {isViewMode ? (
                          <div className="mt-1 p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                            {capa.containment_actions || 'Not documented'}
                          </div>
                        ) : (
                          <Textarea
                            placeholder="Describe immediate actions taken to contain the issue (quarantine, customer notification, stop shipment, etc.)..."
                            value={capa.containment_actions || ''}
                            onChange={(e) => updateCapa.mutate({ id: capaId!, containment_actions: e.target.value })}
                            rows={4}
                            className="mt-1"
                          />
                        )}
                      </div>

                      {/* Containment Tasks */}
                      <div>
                        <Label>Containment Tasks</Label>
                        <CapaTaskList capaId={capaId!} readOnly={isViewMode} />
                      </div>

                      {!isViewMode && capa.containment_actions && !capa.containment_completed_at && (
                        <Button
                          onClick={() => updateStatus.mutate({
                            id: capaId!,
                            newStatus: 'investigating'
                          })}
                          disabled={updateStatus.isPending}
                        >
                          {updateStatus.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Mark Containment Complete & Move to Investigation
                        </Button>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Assignment & Due Dates */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Assignment & Due Dates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Assigned To</Label>
                      {isViewMode ? (
                        <p className="text-sm font-medium mt-1">
                          {(capa as any).assigned_to_profile
                            ? `${(capa as any).assigned_to_profile.first_name} ${(capa as any).assigned_to_profile.last_name}`
                            : 'Unassigned'}
                        </p>
                      ) : (
                        <Select
                          value={capa.assigned_to || ''}
                          onValueChange={(v) => updateCapa.mutate({ id: capaId!, assigned_to: v || null })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select assignee" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Unassigned</SelectItem>
                            {profiles?.map(p => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.first_name} {p.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    <div>
                      <Label className="text-muted-foreground">Root Cause Due</Label>
                      <p className={cn(
                        'text-sm font-medium mt-1',
                        isOverdue(capa.root_cause_due_date) && !capa.root_cause_statement && 'text-destructive'
                      )}>
                        {capa.root_cause_due_date ? format(new Date(capa.root_cause_due_date), 'PPP') : '-'}
                      </p>
                    </div>

                    <div>
                      <Label className="text-muted-foreground">Corrective Action Due</Label>
                      <p className={cn(
                        'text-sm font-medium mt-1',
                        isOverdue(capa.corrective_action_due_date) && !capa.corrective_actions_text && 'text-destructive'
                      )}>
                        {capa.corrective_action_due_date ? format(new Date(capa.corrective_action_due_date), 'PPP') : '-'}
                      </p>
                    </div>

                    <div>
                      <Label className="text-muted-foreground">Verification Due</Label>
                      <p className="text-sm font-medium mt-1">
                        {capa.verification_due_date ? format(new Date(capa.verification_due_date), 'PPP') : '-'}
                      </p>
                    </div>

                    <div>
                      <Label className="text-muted-foreground">Effectiveness Review Due</Label>
                      <p className="text-sm font-medium mt-1">
                        {capa.effectiveness_review_due_date ? format(new Date(capa.effectiveness_review_due_date), 'PPP') : '-'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Investigation Tab */}
            <TabsContent value="investigation" className="mt-0 p-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Root Cause Analysis
                  </CardTitle>
                  <CardDescription>
                    Use structured analysis tools to identify the root cause
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Tabs defaultValue="five_whys">
                    <TabsList>
                      <TabsTrigger value="five_whys">5 Whys</TabsTrigger>
                      <TabsTrigger value="fishbone">Fishbone</TabsTrigger>
                    </TabsList>

                    <TabsContent value="five_whys" className="mt-4">
                      <FiveWhysAnalysis
                        data={[]}
                        onChange={() => {}}
                        readOnly={isViewMode}
                      />
                    </TabsContent>

                    <TabsContent value="fishbone" className="mt-4">
                      <FishboneDiagram
                        data={{ categories: [] }}
                        onChange={() => {}}
                        problem={capa.title || 'Problem'}
                        readOnly={isViewMode}
                      />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Investigation Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Investigation Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Investigation Notes</Label>
                    {isViewMode ? (
                      <div className="mt-1 p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                        {capa.investigation_summary || 'No notes documented'}
                      </div>
                    ) : (
                      <Textarea
                        placeholder="Document investigation findings, interviews, data analysis, etc..."
                        value={capa.investigation_summary || ''}
                        onChange={(e) => updateCapa.mutate({ id: capaId!, investigation_summary: e.target.value })}
                        rows={4}
                        className="mt-1"
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Root Cause Category</Label>
                      {isViewMode ? (
                        <p className="text-sm font-medium mt-1">
                          {ROOT_CAUSE_CATEGORY_CONFIG[capa.root_cause_category as keyof typeof ROOT_CAUSE_CATEGORY_CONFIG]?.label || 'Not classified'}
                        </p>
                      ) : (
                        <Select
                          value={capa.root_cause_category || ''}
                          onValueChange={(v) => updateCapa.mutate({ id: capaId!, root_cause_category: v })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(ROOT_CAUSE_CATEGORY_CONFIG).map(([value, config]) => (
                              <SelectItem key={value} value={value}>
                                <div>
                                  <div className="font-medium">{config.label}</div>
                                  <div className="text-xs text-muted-foreground">{config.description}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label className="text-base font-semibold">Root Cause Statement *</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Clear, concise statement of the true root cause
                    </p>
                    {isViewMode ? (
                      <div className="p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap border-l-4 border-primary">
                        {capa.root_cause_statement || 'Not documented'}
                      </div>
                    ) : (
                      <Textarea
                        placeholder="The root cause of this issue is..."
                        value={capa.root_cause_statement || ''}
                        onChange={(e) => updateCapa.mutate({ id: capaId!, root_cause_statement: e.target.value })}
                        rows={3}
                        className="border-l-4 border-primary"
                      />
                    )}
                  </div>

                  {!isViewMode && capa.root_cause_statement && capa.status === 'investigating' && (
                    <Button
                      onClick={() => updateStatus.mutate({
                        id: capaId!,
                        newStatus: 'action_required'
                      })}
                      disabled={updateStatus.isPending}
                    >
                      {updateStatus.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Confirm Root Cause & Move to Action Planning
                    </Button>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Actions Tab */}
            <TabsContent value="actions" className="mt-0 p-4 space-y-4">
              {/* Corrective Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Corrective Actions
                  </CardTitle>
                  <CardDescription>
                    Actions to fix the current problem and prevent immediate recurrence
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Corrective Action Plan</Label>
                    {isViewMode ? (
                      <div className="mt-1 p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                        {capa.corrective_actions_text || 'Not documented'}
                      </div>
                    ) : (
                      <Textarea
                        placeholder="Describe the corrective actions to be taken..."
                        value={capa.corrective_actions_text || ''}
                        onChange={(e) => updateCapa.mutate({ id: capaId!, corrective_actions_text: e.target.value })}
                        rows={4}
                        className="mt-1"
                      />
                    )}
                  </div>

                  <CapaTaskList capaId={capaId!} readOnly={isViewMode} />
                </CardContent>
              </Card>

              {/* Preventive Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    Preventive Actions
                  </CardTitle>
                  <CardDescription>
                    Actions to prevent similar issues from occurring in the future
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Preventive Action Plan</Label>
                    {isViewMode ? (
                      <div className="mt-1 p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                        {capa.preventive_actions_text || 'Not documented'}
                      </div>
                    ) : (
                      <Textarea
                        placeholder="Describe the preventive actions to be implemented..."
                        value={capa.preventive_actions_text || ''}
                        onChange={(e) => updateCapa.mutate({ id: capaId!, preventive_actions_text: e.target.value })}
                        rows={4}
                        className="mt-1"
                      />
                    )}
                  </div>

                  {!isViewMode && capa.corrective_actions_text && capa.preventive_actions_text && capa.status === 'action_required' && (
                    <Button
                      onClick={() => updateStatus.mutate({
                        id: capaId!,
                        newStatus: 'verification'
                      })}
                      disabled={updateStatus.isPending}
                    >
                      {updateStatus.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Actions Complete - Move to Verification
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Verification */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4" />
                    Verification
                  </CardTitle>
                  <CardDescription>
                    Verify that corrective and preventive actions were implemented
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Verification Method</Label>
                    {isViewMode ? (
                      <div className="mt-1 p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                        {capa.verification_method || 'Not documented'}
                      </div>
                    ) : (
                      <Textarea
                        placeholder="How were the actions verified? (inspection, testing, documentation review, etc.)"
                        value={capa.verification_method || ''}
                        onChange={(e) => updateCapa.mutate({ id: capaId!, verification_method: e.target.value })}
                        rows={3}
                        className="mt-1"
                      />
                    )}
                  </div>

                  <div>
                    <Label>Verification Results</Label>
                    {isViewMode ? (
                      <div className="mt-1 p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                        {capa.verification_results || 'Not documented'}
                      </div>
                    ) : (
                      <Textarea
                        placeholder="Results of the verification activities..."
                        value={capa.verification_results || ''}
                        onChange={(e) => updateCapa.mutate({ id: capaId!, verification_results: e.target.value })}
                        rows={3}
                        className="mt-1"
                      />
                    )}
                  </div>

                  {!isViewMode && capa.verification_results && capa.status === 'verification' && (
                    <Button
                      onClick={() => updateStatus.mutate({
                        id: capaId!,
                        newStatus: 'effectiveness_review'
                      })}
                      disabled={updateStatus.isPending}
                    >
                      {updateStatus.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Verification Complete - Move to Effectiveness Review
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Effectiveness Review */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Effectiveness Review
                  </CardTitle>
                  <CardDescription>
                    Evaluate long-term effectiveness of the corrective actions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Effectiveness Criteria</Label>
                    {isViewMode ? (
                      <div className="mt-1 p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                        {capa.effectiveness_criteria || 'Not documented'}
                      </div>
                    ) : (
                      <Textarea
                        placeholder="What criteria will be used to evaluate effectiveness?"
                        value={capa.effectiveness_criteria || ''}
                        onChange={(e) => updateCapa.mutate({ id: capaId!, effectiveness_criteria: e.target.value })}
                        rows={3}
                        className="mt-1"
                      />
                    )}
                  </div>

                  <div>
                    <Label>Effectiveness Results</Label>
                    {isViewMode ? (
                      <div className="mt-1 p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                        {capa.effectiveness_results || 'Not documented'}
                      </div>
                    ) : (
                      <Textarea
                        placeholder="Results of effectiveness evaluation..."
                        value={capa.effectiveness_results || ''}
                        onChange={(e) => updateCapa.mutate({ id: capaId!, effectiveness_results: e.target.value })}
                        rows={3}
                        className="mt-1"
                      />
                    )}
                  </div>

                  {!isViewMode && capa.effectiveness_results && capa.status === 'effectiveness_review' && (
                    <Button
                      onClick={() => updateStatus.mutate({
                        id: capaId!,
                        newStatus: 'closed'
                      })}
                      disabled={updateStatus.isPending}
                    >
                      {updateStatus.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Close CAPA
                    </Button>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="mt-0 p-4">
              <CapaActivityTimeline capaId={capaId!} />
            </TabsContent>

            {/* Attachments Tab */}
            <TabsContent value="attachments" className="mt-0 p-4">
              <CapaAttachments capaId={capaId!} readOnly={isViewMode} />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
