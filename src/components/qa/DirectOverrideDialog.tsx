import { useState } from 'react';
import { format, addDays } from 'date-fns';
import { CalendarIcon, ShieldAlert, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useDirectOverride, formatBlockedChecks } from '@/hooks/useOverrideRequests';
import { useConditionalDurationMaterials, useConditionalDurationEntities } from '@/hooks/useQASettings';
import type { QACheckResult } from '@/types/qa-checks';

interface DirectOverrideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordId: string;
  tableName: 'materials' | 'suppliers' | 'products';
  recordName: string;
  blockedChecks: QACheckResult[];
  category?: string;
  onSuccess?: () => void;
}

const OVERRIDE_REASONS = [
  { value: 'emergency_production', label: 'Emergency production need' },
  { value: 'supplier_documentation_pending', label: 'Supplier documentation pending' },
  { value: 'temporary_issue_being_resolved', label: 'Temporary issue being resolved' },
  { value: 'administrative_data_pending', label: 'Administrative data pending' },
  { value: 'other', label: 'Other' },
];

export function DirectOverrideDialog({
  open,
  onOpenChange,
  recordId,
  tableName,
  recordName,
  blockedChecks,
  category,
  onSuccess,
}: DirectOverrideDialogProps) {
  const { user } = useAuth();
  const directOverride = useDirectOverride();
  const materialDurations = useConditionalDurationMaterials();
  const entityDurations = useConditionalDurationEntities();

  const [reason, setReason] = useState<string>('');
  const [justification, setJustification] = useState('');
  const [followUpDate, setFollowUpDate] = useState<Date | undefined>();
  const [overrideType, setOverrideType] = useState<'conditional_approval' | 'full_approval'>('conditional_approval');
  const [acknowledged, setAcknowledged] = useState(false);

  // Calculate conditional duration based on category or entity type
  const getConditionalDays = () => {
    if (tableName === 'materials' && category && materialDurations) {
      return materialDurations[category] || 14;
    }
    if (entityDurations) {
      return entityDurations[tableName] || 30;
    }
    return 14;
  };

  const conditionalDays = getConditionalDays();
  const maxFollowUpDate = addDays(new Date(), 30);
  const minCharacters = 50;
  const isJustificationValid = justification.length >= minCharacters;

  const getExpiresAt = () => {
    if (overrideType === 'full_approval') return null;
    return addDays(new Date(), conditionalDays).toISOString();
  };

  const handleSubmit = async () => {
    if (!user || !reason || !isJustificationValid || !followUpDate || !acknowledged) return;

    const expiresAt = getExpiresAt();

    await directOverride.mutateAsync({
      related_record_id: recordId,
      related_table_name: tableName,
      blocked_checks: formatBlockedChecks(blockedChecks),
      requested_by: user.id,
      override_reason: reason,
      justification,
      follow_up_date: format(followUpDate, 'yyyy-MM-dd'),
      override_type: overrideType,
      expiresAt: expiresAt || format(addDays(new Date(), 365), 'yyyy-MM-dd'),
    });

    onOpenChange(false);
    setReason('');
    setJustification('');
    setFollowUpDate(undefined);
    setOverrideType('conditional_approval');
    setAcknowledged(false);
    onSuccess?.();
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'critical':
        return <span className="text-destructive">🔴</span>;
      case 'important':
        return <span className="text-orange-500">🟠</span>;
      default:
        return <span className="text-yellow-500">🟡</span>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            Direct QA Override (Admin)
          </DialogTitle>
          <DialogDescription>
            As an Admin, you can directly override QA blocks. This action will be logged.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Record Info */}
          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">Overriding for:</p>
            <p className="font-medium">{recordName}</p>
          </div>

          {/* Blocked Checks */}
          <div>
            <Label className="text-sm font-medium">Overriding:</Label>
            <div className="mt-2 space-y-1">
              {blockedChecks.map((check, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  {getTierIcon(check.definition.tier)}
                  <span>{check.definition.check_name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Override Reason */}
          <div className="space-y-2">
            <Label>Override Reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason..." />
              </SelectTrigger>
              <SelectContent>
                {OVERRIDE_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Justification */}
          <div className="space-y-2">
            <Label>Business Justification * (min {minCharacters} characters)</Label>
            <Textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Explain why this override is needed and what steps are being taken to resolve the underlying issues..."
              rows={4}
              className={cn(!isJustificationValid && justification.length > 0 && 'border-destructive')}
            />
            <p className={cn(
              'text-xs',
              isJustificationValid ? 'text-muted-foreground' : 'text-destructive'
            )}>
              {justification.length}/{minCharacters} characters minimum
            </p>
          </div>

          {/* Follow-up Date */}
          <div className="space-y-2">
            <Label>Follow-up Date * (when will this be resolved?)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !followUpDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {followUpDate ? format(followUpDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={followUpDate}
                  onSelect={setFollowUpDate}
                  disabled={(date) => date < new Date() || date > maxFollowUpDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Must be within 30 days
            </p>
          </div>

          {/* Override Type */}
          <div className="space-y-2">
            <Label>Approval Type *</Label>
            <RadioGroup value={overrideType} onValueChange={(v) => setOverrideType(v as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="conditional_approval" id="conditional" />
                <Label htmlFor="conditional" className="font-normal cursor-pointer">
                  Conditional Approval (expires in {conditionalDays} days)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="full_approval" id="full" />
                <Label htmlFor="full" className="font-normal cursor-pointer">
                  Full Approval
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Accountability Acknowledgment */}
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="acknowledged"
                checked={acknowledged}
                onCheckedChange={(checked) => setAcknowledged(checked === true)}
              />
              <Label htmlFor="acknowledged" className="text-sm cursor-pointer leading-relaxed">
                I understand this override will be logged and I am accountable for this decision. 
                I have verified that this override is necessary and appropriate.
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!reason || !isJustificationValid || !followUpDate || !acknowledged || directOverride.isPending}
          >
            {directOverride.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Override and Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
