import { useState } from 'react';
import { Shield, AlertCircle, CheckCircle, Camera } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { useRecordCCPVerification } from '@/hooks/useHACCPCCPs';
import { toast } from 'sonner';
import type { HACCPCCP } from '@/types/haccp';
import { cn } from '@/lib/utils';

interface CCPVerificationCardProps {
  ccp: HACCPCCP;
  productionLotId?: string;
  haccpPlanId: string;
  onVerified?: () => void;
}

export function CCPVerificationCard({
  ccp,
  productionLotId,
  haccpPlanId,
  onVerified,
}: CCPVerificationCardProps) {
  const [measuredValue, setMeasuredValue] = useState('');
  const [notes, setNotes] = useState('');
  const [isWithinLimits, setIsWithinLimits] = useState<boolean | null>(null);

  const recordVerification = useRecordCCPVerification();

  const handleVerify = async () => {
    if (!measuredValue) {
      toast.error('Please enter a measured value');
      return;
    }

    const value = parseFloat(measuredValue);
    let withinLimits = true;

    // Check against critical limits
    if (ccp.critical_limit_min !== null && value < ccp.critical_limit_min) {
      withinLimits = false;
    }
    if (ccp.critical_limit_max !== null && value > ccp.critical_limit_max) {
      withinLimits = false;
    }

    setIsWithinLimits(withinLimits);

    if (!withinLimits) {
      // Show alert but allow recording
      toast.warning('Value exceeds critical limits! Corrective action required.');
    }

    try {
      await recordVerification.mutateAsync({
        ccp_id: ccp.id,
        haccp_plan_id: haccpPlanId,
        production_lot_id: productionLotId || null,
        parameter_measured: ccp.critical_limit_parameter || null,
        measured_value: value,
        unit_of_measure: ccp.unit_of_measure || null,
        notes: notes || null,
      });

      toast.success('CCP verification recorded successfully');
      setMeasuredValue('');
      setNotes('');
      onVerified?.();
    } catch (error: any) {
      toast.error(`Failed to record verification: ${error.message}`);
    }
  };

  return (
    <Card
      className={cn(
        'border-2',
        isWithinLimits === true && 'border-green-500',
        isWithinLimits === false && 'border-red-500'
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              {ccp.ccp_number}: {ccp.ccp_name}
            </CardTitle>
            {ccp.description && (
              <CardDescription className="mt-1">{ccp.description}</CardDescription>
            )}
          </div>
          <Badge variant={ccp.ccp_type === 'CCP' ? 'destructive' : 'secondary'}>
            {ccp.ccp_type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Critical Limit Display */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Critical Limit</AlertTitle>
          <AlertDescription className="font-mono text-base font-medium">
            {ccp.critical_limit_value ||
             (ccp.critical_limit_min && ccp.critical_limit_max
               ? `${ccp.critical_limit_min} - ${ccp.critical_limit_max} ${ccp.unit_of_measure}`
               : 'Not specified')}
          </AlertDescription>
        </Alert>

        {/* Measurement Input */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`measured-${ccp.id}`}>
              Measured Value <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id={`measured-${ccp.id}`}
                type="number"
                step="0.01"
                value={measuredValue}
                onChange={(e) => setMeasuredValue(e.target.value)}
                placeholder="Enter value"
                className="flex-1"
              />
              {ccp.unit_of_measure && (
                <span className="flex items-center px-3 bg-muted rounded text-sm font-medium">
                  {ccp.unit_of_measure}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Monitoring Method</Label>
            <p className="text-sm text-muted-foreground pt-2">
              {ccp.monitoring_method || 'See monitoring procedure'}
            </p>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor={`notes-${ccp.id}`}>Notes (Optional)</Label>
          <Textarea
            id={`notes-${ccp.id}`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any observations or comments..."
            rows={2}
          />
        </div>

        {/* Monitoring Procedure */}
        <details className="text-sm">
          <summary className="cursor-pointer text-primary hover:underline">
            View Monitoring Procedure
          </summary>
          <div className="mt-2 p-3 bg-muted rounded text-sm whitespace-pre-wrap">
            {ccp.monitoring_procedure}
          </div>
        </details>

        {/* Verify Button */}
        <Button
          onClick={handleVerify}
          disabled={!measuredValue || recordVerification.isPending}
          className="w-full"
        >
          {recordVerification.isPending ? (
            'Recording...'
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Record Verification
            </>
          )}
        </Button>

        {/* Out of Limit Warning */}
        {isWithinLimits === false && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Critical Limit Exceeded!</AlertTitle>
            <AlertDescription className="space-y-2">
              <p className="font-medium">Corrective Action Required:</p>
              <p className="text-sm">{ccp.corrective_action_procedure}</p>
            </AlertDescription>
          </Alert>
        )}

        {/* Success Indicator */}
        {isWithinLimits === true && (
          <Alert className="border-green-500 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-900">Within Limits</AlertTitle>
            <AlertDescription className="text-green-800">
              Verification recorded successfully
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
