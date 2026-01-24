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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert, Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PO_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'sent', label: 'Sent' },
  { value: 'partially_received', label: 'Partially Received' },
  { value: 'received', label: 'Received' },
  { value: 'cancelled', label: 'Cancelled' },
];

interface AdminPOStatusOverrideProps {
  poId: string;
  poNumber: string;
  currentStatus: string;
  onSuccess?: () => void;
}

export function AdminPOStatusOverride({ poId, poNumber, currentStatus, onSuccess }: AdminPOStatusOverrideProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [reason, setReason] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const overrideMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Log to admin audit first
      const { error: auditError } = await supabase
        .from('admin_audit_log')
        .insert({
          admin_user_id: user?.id,
          action_type: 'po_status_override',
          action_details: {
            po_id: poId,
            po_number: poNumber,
            previous_status: currentStatus,
            new_status: newStatus,
          },
          justification: reason,
        });
      
      if (auditError) {
        console.warn('Failed to log PO status override:', auditError);
      }

      // Update PO status
      const { error } = await supabase
        .from('purchase_orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', poId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-order', poId] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast({ 
        title: 'Status Updated (Admin Override)', 
        description: `PO ${poNumber} status changed to ${newStatus}` 
      });
      setIsOpen(false);
      setNewStatus('');
      setReason('');
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleOverride = () => {
    if (!newStatus || reason.trim().length < 10) return;
    overrideMutation.mutate();
  };

  const isValid = newStatus && newStatus !== currentStatus && reason.trim().length >= 10;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 border-amber-500 text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950">
          <ShieldAlert className="h-4 w-4" />
          Override Status
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <ShieldAlert className="h-5 w-5" />
            Admin Status Override
          </DialogTitle>
          <DialogDescription>
            Force change the status of PO <span className="font-semibold">{poNumber}</span>.
            This action bypasses normal workflow rules and will be logged.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription className="text-sm">
              Changing status may affect receiving, invoicing, and financial records.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label>Current Status</Label>
            <div className="text-sm font-medium text-muted-foreground capitalize">
              {currentStatus.replace('_', ' ')}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-status">New Status <span className="text-destructive">*</span></Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                {PO_STATUSES.filter(s => s.value !== currentStatus).map(status => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="override-reason">
              Justification <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="override-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this override is necessary (minimum 10 characters)..."
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
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleOverride}
            disabled={!isValid || overrideMutation.isPending}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {overrideMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <ShieldAlert className="h-4 w-4 mr-2" />
                Override Status
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
