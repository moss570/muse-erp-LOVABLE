import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert, Loader2, UserCheck, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ReinstateEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: {
    id: string;
    first_name: string;
    last_name: string;
    employee_number?: string | null;
    termination_date?: string | null;
  };
  onSuccess?: () => void;
}

export function ReinstateEmployeeDialog({ 
  open, 
  onOpenChange, 
  employee,
  onSuccess 
}: ReinstateEmployeeDialogProps) {
  const [reason, setReason] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const reinstateMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Log to admin audit first
      const { error: auditError } = await supabase
        .from('admin_audit_log')
        .insert({
          admin_user_id: user?.id,
          action_type: 'employee_reinstate',
          action_details: {
            employee_id: employee.id,
            employee_number: employee.employee_number,
            employee_name: `${employee.first_name} ${employee.last_name}`,
            previous_termination_date: employee.termination_date,
          },
          justification: reason,
        });
      
      if (auditError) {
        console.warn('Failed to log employee reinstatement:', auditError);
      }

      // Update employee status
      const { error } = await supabase
        .from('employees')
        .update({ 
          employment_status: 'active',
          termination_date: null,
          termination_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', employee.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', employee.id] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({ 
        title: 'Employee Reinstated', 
        description: `${employee.first_name} ${employee.last_name} has been reinstated as an active employee.` 
      });
      onOpenChange(false);
      setReason('');
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleReinstate = () => {
    if (reason.trim().length < 10) return;
    reinstateMutation.mutate();
  };

  const isValid = reason.trim().length >= 10;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <UserCheck className="h-5 w-5" />
            Reinstate Employee
          </DialogTitle>
          <DialogDescription>
            You are about to reinstate{' '}
            <span className="font-semibold">{employee.first_name} {employee.last_name}</span>{' '}
            as an active employee. This action will be logged for audit purposes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Admin Override</AlertTitle>
            <AlertDescription className="text-sm">
              Reinstating a terminated employee will:
              <ul className="list-disc list-inside mt-1">
                <li>Set their status back to Active</li>
                <li>Clear termination date and reason</li>
                <li>They may need a new user account created</li>
              </ul>
            </AlertDescription>
          </Alert>

          {employee.termination_date && (
            <div className="text-sm">
              <span className="text-muted-foreground">Terminated on: </span>
              <span className="font-medium">
                {new Date(employee.termination_date).toLocaleDateString()}
              </span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reinstate-reason">
              Justification <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reinstate-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this employee is being reinstated (minimum 10 characters)..."
              className="min-h-[80px]"
            />
            {reason.length > 0 && reason.trim().length < 10 && (
              <p className="text-xs text-destructive">
                Please provide a more detailed justification
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleReinstate}
            disabled={!isValid || reinstateMutation.isPending}
          >
            {reinstateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Reinstating...
              </>
            ) : (
              <>
                <UserCheck className="h-4 w-4 mr-2" />
                Reinstate Employee
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
