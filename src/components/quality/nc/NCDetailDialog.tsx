import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  useNonConformity, 
  useNCAttachments, 
  useNCActivityLog,
  useUploadNCAttachment,
  useDeleteNCAttachment,
  useAddNCActivity,
  useCloseNonConformity,
  useUpdateNonConformity,
} from '@/hooks/useNonConformities';
import { 
  NC_TYPE_CONFIG, 
  IMPACT_LEVEL_CONFIG, 
  SEVERITY_CONFIG, 
  STATUS_CONFIG,
  DISPOSITION_CONFIG,
  NCType,
  ImpactLevel,
  NCSeverity,
  NCStatus,
  NCDisposition,
} from '@/types/non-conformities';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  Camera, 
  FileText, 
  Upload, 
  Trash2, 
  MessageSquare, 
  Clock,
  User,
  MapPin,
  Package,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DispositionApprovalPanel } from './DispositionApprovalPanel';
import { CAPAEscalationPanel } from './CAPAEscalationPanel';

interface NCDetailDialogProps {
  ncId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NCDetailDialog({ ncId, open, onOpenChange }: NCDetailDialogProps) {
  const { data: nc, isLoading } = useNonConformity(ncId);
  const { data: attachments = [] } = useNCAttachments(ncId);
  const { data: activityLog = [] } = useNCActivityLog(ncId);
  const uploadAttachment = useUploadNCAttachment();
  const deleteAttachment = useDeleteNCAttachment();
  const addActivity = useAddNCActivity();
  const closeNC = useCloseNonConformity();
  const updateNC = useUpdateNonConformity();

  const [comment, setComment] = useState('');
  const [closureNotes, setClosureNotes] = useState('');
  const [showCloseForm, setShowCloseForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !ncId) return;

    const attachmentType = file.type.startsWith('image/') ? 'photo' : 
                          file.type.includes('pdf') ? 'document' : 'other';
    
    await uploadAttachment.mutateAsync({
      ncId,
      file,
      attachmentType,
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim() || !ncId) return;
    await addActivity.mutateAsync({ ncId, comment });
    setComment('');
  };

  const handleClose = async () => {
    if (!ncId || !closureNotes.trim()) return;
    await closeNC.mutateAsync({ id: ncId, closureNotes });
    setShowCloseForm(false);
    setClosureNotes('');
  };

  const handleStatusChange = async (newStatus: NCStatus) => {
    if (!ncId) return;
    await updateNC.mutateAsync({ id: ncId, updates: { status: newStatus } });
  };

  const handleDispositionChange = async (newDisposition: NCDisposition) => {
    if (!ncId) return;
    await updateNC.mutateAsync({ id: ncId, updates: { disposition: newDisposition } });
  };

  const getProfileName = (profile: any) => {
    if (!profile) return 'Unknown';
    return [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email || 'Unknown';
  };

  const getAttachmentUrl = (filePath: string) => {
    const { data } = supabase.storage.from('nc-attachments').getPublicUrl(filePath);
    return data.publicUrl;
  };

  if (isLoading || !nc) {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl">{nc.nc_number}</DialogTitle>
              <Badge className={cn(STATUS_CONFIG[nc.status as NCStatus].bgColor, STATUS_CONFIG[nc.status as NCStatus].color)}>
                {STATUS_CONFIG[nc.status as NCStatus].label}
              </Badge>
              <Badge className={cn(SEVERITY_CONFIG[nc.severity as NCSeverity].bgColor, SEVERITY_CONFIG[nc.severity as NCSeverity].textColor)}>
                {SEVERITY_CONFIG[nc.severity as NCSeverity].label}
              </Badge>
            </div>
          </div>
          <p className="text-lg font-medium mt-2">{nc.title}</p>
        </DialogHeader>

        <Tabs defaultValue="details" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="flex-shrink-0">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="photos">
              Photos & Files ({attachments.length})
            </TabsTrigger>
            <TabsTrigger value="activity">Activity Log</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            {/* Details Tab */}
            <TabsContent value="details" className="p-4 space-y-6">
              {/* Classification */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-muted-foreground">Type</Label>
                  <p className="font-medium">{NC_TYPE_CONFIG[nc.nc_type as NCType].label}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Impact Level</Label>
                  <Badge className={cn(IMPACT_LEVEL_CONFIG[nc.impact_level as ImpactLevel].bgColor, IMPACT_LEVEL_CONFIG[nc.impact_level as ImpactLevel].color)}>
                    {IMPACT_LEVEL_CONFIG[nc.impact_level as ImpactLevel].label}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Severity</Label>
                  <Badge className={cn(SEVERITY_CONFIG[nc.severity as NCSeverity].bgColor, SEVERITY_CONFIG[nc.severity as NCSeverity].textColor)}>
                    {SEVERITY_CONFIG[nc.severity as NCSeverity].label}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Description */}
              <div>
                <Label className="text-muted-foreground">Description</Label>
                <p className="mt-1 whitespace-pre-wrap">{nc.description}</p>
              </div>

              {nc.specification_reference && (
                <div>
                  <Label className="text-muted-foreground">Specification Reference</Label>
                  <p className="mt-1">{nc.specification_reference}</p>
                </div>
              )}

              <Separator />

              {/* Discovery Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-muted-foreground">Discovered</Label>
                    <p className="font-medium">{format(new Date(nc.discovered_date), 'MMM d, yyyy h:mm a')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-muted-foreground">Discovered By</Label>
                    <p className="font-medium">{getProfileName(nc.discovered_by_profile)}</p>
                  </div>
                </div>
                {nc.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label className="text-muted-foreground">Location</Label>
                      <p className="font-medium">{nc.location.name}</p>
                    </div>
                  </div>
                )}
                {nc.shift && (
                  <div>
                    <Label className="text-muted-foreground">Shift</Label>
                    <p className="font-medium capitalize">{nc.shift}</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Related Items */}
              {(nc.material || nc.product || nc.supplier) && (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    {nc.material && (
                      <div>
                        <Label className="text-muted-foreground">Material</Label>
                        <p className="font-medium">{nc.material.code} - {nc.material.name}</p>
                      </div>
                    )}
                    {nc.product && (
                      <div>
                        <Label className="text-muted-foreground">Product</Label>
                        <p className="font-medium">{nc.product.sku} - {nc.product.name}</p>
                      </div>
                    )}
                    {nc.supplier && (
                      <div>
                        <Label className="text-muted-foreground">Supplier</Label>
                        <p className="font-medium">{nc.supplier.code} - {nc.supplier.name}</p>
                      </div>
                    )}
                  </div>
                  <Separator />
                </>
              )}

              {/* Quantity & Cost */}
              <div className="grid grid-cols-3 gap-4">
                {nc.quantity_affected && (
                  <div>
                    <Label className="text-muted-foreground">Quantity Affected</Label>
                    <p className="font-medium">{nc.quantity_affected} {nc.quantity_affected_unit}</p>
                  </div>
                )}
                {nc.estimated_cost && (
                  <div>
                    <Label className="text-muted-foreground">Estimated Cost</Label>
                    <p className="font-medium">${nc.estimated_cost.toFixed(2)}</p>
                  </div>
                )}
                {nc.actual_cost && (
                  <div>
                    <Label className="text-muted-foreground">Actual Cost</Label>
                    <p className="font-medium">${nc.actual_cost.toFixed(2)}</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Disposition */}
              <div>
                <Label className="text-muted-foreground">Disposition</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-base">
                    {DISPOSITION_CONFIG[nc.disposition as NCDisposition].label}
                  </Badge>
                  {nc.disposition_justification && (
                    <span className="text-muted-foreground">- {nc.disposition_justification}</span>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Photos Tab */}
            <TabsContent value="photos" className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Attachments</h3>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadAttachment.isPending}
                  >
                    {uploadAttachment.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Upload
                  </Button>
                </div>
              </div>

              {attachments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No attachments yet</p>
                  <p className="text-sm">Upload photos or documents as evidence</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {attachments.map((attachment) => (
                    <Card key={attachment.id} className="overflow-hidden">
                      <div className="aspect-video bg-muted relative group">
                        {attachment.attachment_type === 'photo' ? (
                          <img 
                            src={getAttachmentUrl(attachment.file_path)} 
                            alt={attachment.file_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FileText className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => window.open(getAttachmentUrl(attachment.file_path), '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => ncId && deleteAttachment.mutate({ 
                              id: attachment.id, 
                              ncId, 
                              filePath: attachment.file_path 
                            })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <CardContent className="p-2">
                        <p className="text-sm font-medium truncate">{attachment.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(attachment.uploaded_at), { addSuffix: true })}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="p-4 space-y-4">
              {/* Add Comment */}
              <div className="flex gap-2">
                <Textarea
                  placeholder="Add a comment..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={2}
                  className="flex-1"
                />
                <Button 
                  onClick={handleAddComment} 
                  disabled={!comment.trim() || addActivity.isPending}
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </div>

              <Separator />

              {/* Activity Log */}
              <div className="space-y-3">
                {activityLog.map((activity) => (
                  <div key={activity.id} className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      {activity.action === 'created' && <AlertTriangle className="h-4 w-4" />}
                      {activity.action === 'status_changed' && <Clock className="h-4 w-4" />}
                      {activity.action === 'disposition_changed' && <Package className="h-4 w-4" />}
                      {activity.action === 'comment_added' && <MessageSquare className="h-4 w-4" />}
                      {activity.action === 'attachment_added' && <Camera className="h-4 w-4" />}
                      {activity.action === 'closed' && <CheckCircle className="h-4 w-4" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {getProfileName(activity.performed_by_profile)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(activity.performed_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm">
                        {activity.action === 'created' && 'Created this non-conformity'}
                        {activity.action === 'status_changed' && `Changed status from ${activity.old_value} to ${activity.new_value}`}
                        {activity.action === 'disposition_changed' && `Changed disposition from ${activity.old_value} to ${activity.new_value}`}
                        {activity.action === 'comment_added' && activity.comment}
                        {activity.action === 'attachment_added' && activity.comment}
                        {activity.action === 'closed' && `Closed: ${activity.comment}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Actions Tab */}
            <TabsContent value="actions" className="p-4 space-y-6">
              {/* Disposition Approval Workflow */}
              {nc.disposition !== 'pending' && (
                <DispositionApprovalPanel
                  ncId={nc.id}
                  disposition={nc.disposition}
                  severity={nc.severity}
                  estimatedCost={nc.estimated_cost}
                  currentJustification={nc.disposition_justification}
                  isApproved={!!nc.disposition_approved_at}
                  approvedBy={nc.disposition_approved_by}
                  approvedAt={nc.disposition_approved_at}
                />
              )}

              {/* CAPA Escalation */}
              <CAPAEscalationPanel
                ncId={nc.id}
                ncNumber={nc.nc_number}
                ncType={nc.nc_type}
                materialId={nc.material_id}
                discoveredDate={nc.discovered_date}
                severity={nc.severity}
                impactLevel={nc.impact_level}
                estimatedCost={nc.estimated_cost}
                capaId={nc.capa_id}
                capaNumber={nc.capa?.capa_number || null}
                requiresCAPA={nc.requires_capa}
              />

              <Separator />

              {/* Status Change */}
              <div>
                <Label>Change Status</Label>
                <Select 
                  value={nc.status} 
                  onValueChange={(v) => handleStatusChange(v as NCStatus)}
                  disabled={nc.status === 'closed'}
                >
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Disposition Change */}
              <div>
                <Label>Change Disposition</Label>
                <Select 
                  value={nc.disposition} 
                  onValueChange={(v) => handleDispositionChange(v as NCDisposition)}
                  disabled={nc.status === 'closed'}
                >
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DISPOSITION_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Close NC */}
              {nc.status !== 'closed' && (
                <div>
                  {!showCloseForm ? (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setShowCloseForm(true)}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Close Non-Conformity
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <Label>Closure Notes *</Label>
                      <Textarea
                        placeholder="Summary of resolution and any follow-up actions..."
                        value={closureNotes}
                        onChange={(e) => setClosureNotes(e.target.value)}
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => setShowCloseForm(false)}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleClose}
                          disabled={!closureNotes.trim() || closeNC.isPending}
                          className="flex-1"
                        >
                          {closeNC.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-2" />
                          )}
                          Confirm Close
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {nc.status === 'closed' && (
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-primary">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">Closed</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {nc.closure_notes}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Closed on {nc.closed_at && format(new Date(nc.closed_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
