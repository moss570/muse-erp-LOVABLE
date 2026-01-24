import { useState } from 'react';
import { format, addDays } from 'date-fns';
import { ClipboardCheck, Calendar, User, Building, Loader2 } from 'lucide-react';

import { useCreateAudit, AUDIT_TYPE_CONFIG } from '@/hooks/useAudits';
import { useProfiles } from '@/hooks/useComplaints';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { AuditType } from '@/types/audits';

interface AuditFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEdit?: boolean;
}

export function AuditFormDialog({ open, onOpenChange, canEdit = true }: AuditFormDialogProps) {
  const { data: profiles } = useProfiles();
  const createAudit = useCreateAudit();
  const isFieldsDisabled = !canEdit;

  const [formData, setFormData] = useState({
    title: '',
    audit_type: '' as AuditType | '',
    scheduled_date: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    end_date: '',
    auditor_type: 'internal' as 'internal' | 'external',
    lead_auditor_id: '',
    external_auditor_name: '',
    external_auditor_org: '',
    scope: '',
    description: '',
  });

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    await createAudit.mutateAsync({
      title: formData.title,
      audit_type: formData.audit_type as AuditType,
      audit_date: formData.scheduled_date,
      audit_end_date: formData.end_date || undefined,
      auditor_type: formData.auditor_type,
      lead_auditor_id: formData.auditor_type === 'internal' ? formData.lead_auditor_id || undefined : undefined,
      auditor_name: formData.auditor_type === 'external' ? formData.external_auditor_name || undefined : undefined,
      auditor_organization: formData.auditor_type === 'external' ? formData.external_auditor_org || undefined : undefined,
      audit_scope: formData.scope || undefined,
      description: formData.description || undefined,
    });

    onOpenChange(false);
    // Reset form
    setFormData({
      title: '',
      audit_type: '',
      scheduled_date: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
      end_date: '',
      auditor_type: 'internal',
      lead_auditor_id: '',
      external_auditor_name: '',
      external_auditor_org: '',
      scope: '',
      description: '',
    });
  };

  const selectedTypeConfig = formData.audit_type ? AUDIT_TYPE_CONFIG[formData.audit_type] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Schedule New Audit
          </DialogTitle>
          <DialogDescription>
            Create a new audit or inspection event
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>Audit Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                placeholder="e.g., Q1 2025 Internal Food Safety Audit"
                disabled={isFieldsDisabled}
              />
            </div>

            <div className="space-y-2">
              <Label>Audit Type *</Label>
              <Select
                value={formData.audit_type || 'none'}
                onValueChange={(v) => handleFieldChange('audit_type', v === 'none' ? '' : v)}
                disabled={isFieldsDisabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" disabled>Select type</SelectItem>
                  {Object.entries(AUDIT_TYPE_CONFIG).map(([value, config]) => (
                    <SelectItem key={value} value={value}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTypeConfig && (
                <p className="text-xs text-muted-foreground">{selectedTypeConfig.description}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Scheduled Date *</Label>
              <Input
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => handleFieldChange('scheduled_date', e.target.value)}
                disabled={isFieldsDisabled}
              />
            </div>

            <div className="space-y-2">
              <Label>End Date (if multi-day)</Label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => handleFieldChange('end_date', e.target.value)}
                min={formData.scheduled_date}
                disabled={isFieldsDisabled}
              />
            </div>
          </div>

          {/* Auditor Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Auditor Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup
                value={formData.auditor_type}
                onValueChange={(v) => handleFieldChange('auditor_type', v)}
                className="flex gap-4"
                disabled={isFieldsDisabled}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="internal" id="internal" disabled={isFieldsDisabled} />
                  <Label htmlFor="internal" className="flex items-center gap-1 cursor-pointer">
                    <User className="h-4 w-4" />
                    Internal Auditor
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="external" id="external" disabled={isFieldsDisabled} />
                  <Label htmlFor="external" className="flex items-center gap-1 cursor-pointer">
                    <Building className="h-4 w-4" />
                    External Auditor
                  </Label>
                </div>
              </RadioGroup>

              {formData.auditor_type === 'internal' ? (
                <div className="space-y-2">
                  <Label>Lead Auditor</Label>
                  <Select
                    value={formData.lead_auditor_id || 'unassigned'}
                    onValueChange={(v) => handleFieldChange('lead_auditor_id', v === 'unassigned' ? '' : v)}
                    disabled={isFieldsDisabled}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select auditor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Select auditor</SelectItem>
                      {profiles?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.first_name} {p.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Auditor Name</Label>
                    <Input
                      value={formData.external_auditor_name}
                      onChange={(e) => handleFieldChange('external_auditor_name', e.target.value)}
                      placeholder="Auditor's full name"
                      disabled={isFieldsDisabled}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Organization</Label>
                    <Input
                      value={formData.external_auditor_org}
                      onChange={(e) => handleFieldChange('external_auditor_org', e.target.value)}
                      placeholder="Auditing organization"
                      disabled={isFieldsDisabled}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Scope & Description */}
          <div className="space-y-2">
            <Label>Audit Scope</Label>
            <Textarea
              value={formData.scope}
              onChange={(e) => handleFieldChange('scope', e.target.value)}
              placeholder="Define the scope of this audit (areas, processes, departments to be audited)..."
              rows={3}
              disabled={isFieldsDisabled}
            />
          </div>

          <div className="space-y-2">
            <Label>Additional Notes</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder="Any additional information or preparation notes..."
              rows={2}
              disabled={isFieldsDisabled}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createAudit.isPending || !formData.title || !formData.audit_type || isFieldsDisabled}
          >
            {createAudit.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Audit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
