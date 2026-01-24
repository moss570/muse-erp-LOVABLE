import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  AlertTriangle,
  FileWarning,
  Loader2,
  Save,
  CheckCircle2,
} from 'lucide-react';

import {
  useCreateFinding,
  useUpdateFinding,
  useCreateCapaFromFinding,
  FINDING_TYPE_CONFIG,
  FINDING_CATEGORY_CONFIG,
} from '@/hooks/useAudits';
import { useProfiles } from '@/hooks/useComplaints';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

import type {
  FindingType,
  FindingSeverity,
  FindingCategory,
  FindingStatus,
  AuditFinding,
} from '@/types/audits';
import { CAPA_SEVERITY_CONFIG } from '@/types/capa';

interface FindingFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  auditId: string;
  auditNumber: string;
  finding?: AuditFinding | null;
  canEdit?: boolean;
}

export function FindingFormDialog({
  open,
  onOpenChange,
  auditId,
  auditNumber,
  finding,
  canEdit = true,
}: FindingFormDialogProps) {
  const { data: profiles } = useProfiles();
  const createFinding = useCreateFinding();
  const updateFinding = useUpdateFinding();
  const createCapa = useCreateCapaFromFinding();

  const isEditMode = !!finding;
  const isFieldsDisabled = !canEdit;
  const [activeTab, setActiveTab] = useState('details');
  const [formData, setFormData] = useState({
    finding_type: 'non_conformance' as FindingType,
    severity: '' as FindingSeverity | '',
    category: 'other' as FindingCategory,
    title: '',
    description: '',
    evidence: '',
    location: '',
    requirement: '',
    assigned_to: '',
    response: '',
    verification_notes: '',
  });

  // Load existing finding data
  useEffect(() => {
    if (finding) {
      setFormData({
        finding_type: finding.finding_type,
        severity: finding.severity || '',
        category: finding.category,
        title: finding.title,
        description: finding.description,
        evidence: finding.evidence || '',
        location: finding.location || '',
        requirement: finding.requirement || '',
        assigned_to: finding.assigned_to || '',
        response: finding.response || '',
        verification_notes: finding.verification_notes || '',
      });
    } else {
      // Reset form for new finding
      setFormData({
        finding_type: 'non_conformance',
        severity: '',
        category: 'other',
        title: '',
        description: '',
        evidence: '',
        location: '',
        requirement: '',
        assigned_to: '',
        response: '',
        verification_notes: '',
      });
    }
  }, [finding]);

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (isEditMode && finding) {
      await updateFinding.mutateAsync({
        id: finding.id,
        ...formData,
        severity: formData.severity || undefined,
        assigned_to: formData.assigned_to || undefined,
      });
    } else {
      await createFinding.mutateAsync({
        audit_id: auditId,
        ...formData,
        severity: formData.severity || undefined,
        assigned_to: formData.assigned_to || undefined,
      });
    }
    onOpenChange(false);
  };

  const handleStatusChange = async (newStatus: FindingStatus) => {
    if (!finding) return;
    await updateFinding.mutateAsync({
      id: finding.id,
      status: newStatus,
      ...(newStatus === 'response_submitted' ? { response_date: new Date().toISOString() } : {}),
      ...(newStatus === 'verified' ? { verified_date: new Date().toISOString() } : {}),
    });
  };

  const handleCreateCapa = async () => {
    if (!finding) return;
    await createCapa.mutateAsync({
      findingId: finding.id,
    });
  };

  const isSubmitting = createFinding.isPending || updateFinding.isPending;
  const typeConfig = FINDING_TYPE_CONFIG[formData.finding_type];
  const requiresSeverity = formData.finding_type === 'non_conformance';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {isEditMode ? `Edit Finding ${finding.finding_number}` : 'Add New Finding'}
          </DialogTitle>
          {isEditMode && finding && (
            <div className="flex items-center gap-2 mt-2">
              <Badge className={cn(typeConfig.bgColor, typeConfig.color)}>
                {typeConfig.label}
              </Badge>
              {finding.severity && (
                <Badge className={cn(CAPA_SEVERITY_CONFIG[finding.severity].bgColor, CAPA_SEVERITY_CONFIG[finding.severity].color)}>
                  {CAPA_SEVERITY_CONFIG[finding.severity].label}
                </Badge>
              )}
              <Badge variant="outline" className="capitalize">{finding.status.replace('_', ' ')}</Badge>
            </div>
          )}
        </DialogHeader>

        {/* CAPA Required Warning */}
        {isEditMode && finding?.capa_required && !finding.capa_id && (
          <Alert className="mx-6 mb-2 border-amber-300 bg-amber-50">
            <FileWarning className="h-4 w-4 text-amber-600" />
            <AlertDescription className="flex items-center justify-between">
              This finding requires a CAPA to be created.
              <Button size="sm" variant="outline" onClick={handleCreateCapa} disabled={createCapa.isPending}>
                {createCapa.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create CAPA
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex-1 min-h-0 px-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            <TabsList className="flex-shrink-0 mb-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              {isEditMode && <TabsTrigger value="response">Response</TabsTrigger>}
            </TabsList>

            <ScrollArea className="flex-1 min-h-0 pb-6">
              <TabsContent value="details" className="space-y-4 mt-0 pr-4">
                {/* Classification */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Finding Type *</Label>
                    <Select
                      value={formData.finding_type}
                      onValueChange={(v) => handleFieldChange('finding_type', v)}
                      disabled={isEditMode || isFieldsDisabled}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(FINDING_TYPE_CONFIG).map(([value, config]) => (
                          <SelectItem key={value} value={value}>
                            <div className="flex items-center gap-2">
                              <span className={cn('w-2 h-2 rounded-full', config.bgColor)} />
                              {config.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {requiresSeverity && (
                    <div className="space-y-2">
                      <Label>Severity *</Label>
                      <Select
                        value={formData.severity || 'none'}
                        onValueChange={(v) => handleFieldChange('severity', v === 'none' ? '' : v)}
                        disabled={isFieldsDisabled}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select severity" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none" disabled>Select severity</SelectItem>
                          {(['critical', 'major', 'minor'] as const).map((sev) => (
                            <SelectItem key={sev} value={sev}>
                              <div className="flex items-center gap-2">
                                <span className={cn('w-2 h-2 rounded-full', CAPA_SEVERITY_CONFIG[sev].bgColor)} />
                                {CAPA_SEVERITY_CONFIG[sev].label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(v) => handleFieldChange('category', v)}
                      disabled={isFieldsDisabled}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(FINDING_CATEGORY_CONFIG).map(([value, config]) => (
                          <SelectItem key={value} value={value}>
                            {config.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Title & Description */}
                <div className="space-y-2">
                  <Label>Finding Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => handleFieldChange('title', e.target.value)}
                    placeholder="Brief description of the finding"
                    disabled={isFieldsDisabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                    placeholder="Detailed description of what was observed..."
                    rows={4}
                    disabled={isFieldsDisabled}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input
                      value={formData.location}
                      onChange={(e) => handleFieldChange('location', e.target.value)}
                      placeholder="Where was this observed?"
                      disabled={isFieldsDisabled}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Requirement Reference</Label>
                    <Input
                      value={formData.requirement}
                      onChange={(e) => handleFieldChange('requirement', e.target.value)}
                      placeholder="e.g., SQF 2.5.1, 21 CFR 110"
                      disabled={isFieldsDisabled}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Evidence</Label>
                  <Textarea
                    value={formData.evidence}
                    onChange={(e) => handleFieldChange('evidence', e.target.value)}
                    placeholder="Document the evidence supporting this finding..."
                    rows={3}
                    disabled={isFieldsDisabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Assigned To</Label>
                  <Select
                    value={formData.assigned_to || 'unassigned'}
                    onValueChange={(v) => handleFieldChange('assigned_to', v === 'unassigned' ? '' : v)}
                    disabled={isFieldsDisabled}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Assign responsibility" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {profiles?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.first_name} {p.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              {/* RESPONSE TAB (edit mode only) */}
              {isEditMode && (
                <TabsContent value="response" className="space-y-4 mt-0 pr-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Response & Corrective Action</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Response Due:</span>
                        <span className="font-medium">
                          {finding.response_due_date
                            ? format(new Date(finding.response_due_date), 'MMM d, yyyy')
                            : '-'}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <Label>Response</Label>
                        <Textarea
                          value={formData.response}
                          onChange={(e) => handleFieldChange('response', e.target.value)}
                          placeholder="Describe the corrective actions taken..."
                          rows={4}
                          disabled={isFieldsDisabled}
                        />
                      </div>
                      {finding.status === 'open' && (
                        <Button
                          variant="outline"
                          onClick={() => handleStatusChange('response_submitted')}
                          disabled={!formData.response || isFieldsDisabled}
                        >
                          Submit Response
                        </Button>
                      )}
                    </CardContent>
                  </Card>

                  {finding.status === 'response_submitted' && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Verification</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>Verification Notes</Label>
                          <Textarea
                            value={formData.verification_notes}
                            onChange={(e) => handleFieldChange('verification_notes', e.target.value)}
                            placeholder="Document verification of corrective actions..."
                            rows={3}
                            disabled={isFieldsDisabled}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleStatusChange('verified')}
                            disabled={!formData.verification_notes || isFieldsDisabled}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Verify & Accept
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleStatusChange('open')}
                          >
                            Reject - Reopen
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {finding.status === 'verified' && (
                    <Card className="bg-green-50 border-green-200">
                      <CardContent className="py-4 flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <span className="text-green-700 font-medium">
                          Finding verified and closed
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-auto"
                          onClick={() => handleStatusChange('closed')}
                        >
                          Close Finding
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              )}
            </ScrollArea>
          </Tabs>
        </div>

        <DialogFooter className="flex-shrink-0 px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              !formData.title ||
              !formData.description ||
              (requiresSeverity && !formData.severity) ||
              isFieldsDisabled
            }
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            {isEditMode ? 'Save Changes' : 'Add Finding'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
