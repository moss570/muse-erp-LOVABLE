import { useState } from 'react';
import { format } from 'date-fns';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  MessageSquare,
  User,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { CapaStatusBadge } from './CapaStatusBadge';
import { CapaSeverityBadge } from './CapaSeverityBadge';

import { useCapa, useUpdateCapaStatus, useCapaActivityLog, useAddCapaComment, useCloseCapa } from '@/hooks/useCapa';
import { 
  CAPA_TYPE_CONFIG, 
  CAPA_STATUS_CONFIG,
  type CapaStatus,
  type CapaListItem,
} from '@/types/capa';
import { cn } from '@/lib/utils';

interface CapaDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  capaId: string | null;
}

const STATUS_WORKFLOW: Record<CapaStatus, CapaStatus[]> = {
  open: ['containment', 'investigating'],
  containment: ['investigating'],
  investigating: ['action_required'],
  action_required: ['verification'],
  verification: ['effectiveness_review'],
  effectiveness_review: ['closed'],
  closed: [],
  cancelled: [],
};

export function CapaDetailDialog({ open, onOpenChange, capaId }: CapaDetailDialogProps) {
  const [comment, setComment] = useState('');
  const [closureNotes, setClosureNotes] = useState('');
  const [effectivenessResult, setEffectivenessResult] = useState<'effective' | 'requires_followup' | 'ineffective'>('effective');

  const { data: capa, isLoading } = useCapa(capaId || undefined);
  const { data: activityLog } = useCapaActivityLog(capaId || undefined);
  const updateStatus = useUpdateCapaStatus();
  const addComment = useAddCapaComment();
  const closeCapa = useCloseCapa();

  if (!capaId) return null;

  const handleStatusChange = async (newStatus: CapaStatus) => {
    if (newStatus === 'closed') {
      await closeCapa.mutateAsync({
        id: capaId,
        closure_notes: closureNotes,
        effectiveness_review_result: effectivenessResult,
      });
    } else {
      await updateStatus.mutateAsync({ id: capaId, newStatus });
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    await addComment.mutateAsync({ capaId, comment });
    setComment('');
  };

  const nextStatuses = capa ? STATUS_WORKFLOW[capa.status as CapaStatus] : [];
  const typeConfig = capa ? CAPA_TYPE_CONFIG[capa.capa_type as keyof typeof CAPA_TYPE_CONFIG] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : capa ? (
          <>
            <DialogHeader className="px-6 py-4 border-b">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-muted-foreground">
                      {capa.capa_number}
                    </span>
                    <CapaStatusBadge status={capa.status as CapaStatus} />
                    <CapaSeverityBadge severity={capa.severity as 'minor' | 'major' | 'critical'} />
                    {typeConfig && (
                      <Badge variant="outline">{typeConfig.label}</Badge>
                    )}
                  </div>
                  <DialogTitle className="text-xl">{capa.title}</DialogTitle>
                </div>
              </div>
            </DialogHeader>

            <Tabs defaultValue="overview" className="flex-1">
              <div className="px-6 border-b">
                <TabsList className="h-10 bg-transparent p-0 w-full justify-start gap-4">
                  <TabsTrigger 
                    value="overview" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                  >
                    Overview
                  </TabsTrigger>
                  <TabsTrigger 
                    value="activity" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                  >
                    Activity
                  </TabsTrigger>
                  <TabsTrigger 
                    value="actions" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                  >
                    Progress Actions
                  </TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="h-[60vh]">
                <TabsContent value="overview" className="p-6 space-y-6 m-0">
                  {/* Description */}
                  <div>
                    <h3 className="font-medium mb-2">Description</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {capa.description}
                    </p>
                  </div>

                  <Separator />

                  {/* Key Details */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="font-medium">Details</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Occurrence Date</span>
                          <span>{format(new Date(capa.occurrence_date), 'PP')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Discovery Date</span>
                          <span>{format(new Date(capa.discovery_date), 'PP')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Created</span>
                          <span>{format(new Date(capa.created_at), 'PP')}</span>
                        </div>
                        {(capa as CapaListItem).assigned_to_profile && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Assigned To</span>
                            <span>
                              {(capa as CapaListItem).assigned_to_profile?.first_name} {(capa as CapaListItem).assigned_to_profile?.last_name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-medium">Related Entities</h3>
                      <div className="space-y-2 text-sm">
                        {(capa as CapaListItem).supplier && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Supplier</span>
                            <span>{(capa as CapaListItem).supplier?.name}</span>
                          </div>
                        )}
                        {(capa as CapaListItem).material && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Material</span>
                            <span>{(capa as CapaListItem).material?.name}</span>
                          </div>
                        )}
                        {(capa as CapaListItem).product && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Product</span>
                            <span>{(capa as CapaListItem).product?.name}</span>
                          </div>
                        )}
                        {(capa as CapaListItem).equipment && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Equipment</span>
                            <span>{(capa as CapaListItem).equipment?.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Progress Fields */}
                  {capa.immediate_action && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="font-medium mb-2 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          Immediate/Containment Action
                        </h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {capa.immediate_action}
                        </p>
                      </div>
                    </>
                  )}

                  {capa.root_cause && (
                    <div>
                      <h3 className="font-medium mb-2">Root Cause</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {capa.root_cause}
                      </p>
                    </div>
                  )}

                  {capa.corrective_action && (
                    <div>
                      <h3 className="font-medium mb-2">Corrective Action</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {capa.corrective_action}
                      </p>
                    </div>
                  )}

                  {capa.preventive_action && (
                    <div>
                      <h3 className="font-medium mb-2">Preventive Action</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {capa.preventive_action}
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="activity" className="p-6 space-y-4 m-0">
                  {/* Add Comment */}
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Add a comment..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={2}
                    />
                    <Button 
                      size="sm" 
                      onClick={handleAddComment}
                      disabled={!comment.trim() || addComment.isPending}
                    >
                      {addComment.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Add Comment
                    </Button>
                  </div>

                  <Separator />

                  {/* Activity Log */}
                  <div className="space-y-4">
                    {activityLog?.map((log) => {
                      const profile = log.performed_by_profile as { id: string; first_name: string | null; last_name: string | null } | null;
                      return (
                        <div key={log.id} className="flex gap-3 text-sm">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            {log.action === 'commented' ? (
                              <MessageSquare className="h-4 w-4" />
                            ) : log.action === 'status_changed' ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <FileText className="h-4 w-4" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {profile?.first_name} {profile?.last_name}
                              </span>
                              <span className="text-muted-foreground">
                                {log.action === 'status_changed' 
                                  ? `changed status from ${log.old_value} to ${log.new_value}`
                                  : log.action === 'commented'
                                  ? 'commented'
                                  : log.action}
                              </span>
                            </div>
                            {log.comment && (
                              <p className="text-muted-foreground mt-1">{log.comment}</p>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(log.performed_at), 'PPp')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {(!activityLog || activityLog.length === 0) && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No activity recorded yet.
                      </p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="actions" className="p-6 space-y-6 m-0">
                  {/* Status Workflow */}
                  <div className="space-y-4">
                    <h3 className="font-medium">Current Status</h3>
                    <div className="flex items-center gap-4">
                      <CapaStatusBadge status={capa.status as CapaStatus} />
                      {capa.status !== 'closed' && capa.status !== 'cancelled' && (
                        <span className="text-sm text-muted-foreground">
                          Step {CAPA_STATUS_CONFIG[capa.status as CapaStatus].step} of 7
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress to Next Status */}
                  {nextStatuses.length > 0 && (
                    <div className="space-y-4">
                      <Separator />
                      <h3 className="font-medium">Progress to Next Stage</h3>
                      
                      {nextStatuses.includes('closed') && (
                        <div className="space-y-4 p-4 border rounded-lg">
                          <div className="space-y-2">
                            <Label>Effectiveness Review Result</Label>
                            <Select 
                              value={effectivenessResult} 
                              onValueChange={(v) => setEffectivenessResult(v as typeof effectivenessResult)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="effective">Effective</SelectItem>
                                <SelectItem value="requires_followup">Requires Follow-up</SelectItem>
                                <SelectItem value="ineffective">Ineffective</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Closure Notes</Label>
                            <Textarea
                              value={closureNotes}
                              onChange={(e) => setClosureNotes(e.target.value)}
                              placeholder="Summary of the corrective action and its effectiveness..."
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        {nextStatuses.map((status) => (
                          <Button
                            key={status}
                            onClick={() => handleStatusChange(status)}
                            disabled={updateStatus.isPending || closeCapa.isPending}
                            variant={status === 'closed' ? 'default' : 'outline'}
                          >
                            {(updateStatus.isPending || closeCapa.isPending) && (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            )}
                            {status === 'closed' ? 'Close CAPA' : `Move to ${CAPA_STATUS_CONFIG[status].label}`}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {capa.status === 'closed' && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="font-medium">CAPA Closed</span>
                      </div>
                      {capa.closure_notes && (
                        <p className="text-sm text-green-600 mt-2">{capa.closure_notes}</p>
                      )}
                    </div>
                  )}
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </>
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            CAPA not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
