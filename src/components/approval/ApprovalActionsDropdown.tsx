import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  MoreHorizontal, 
  SendHorizontal, 
  CheckCircle2, 
  XCircle, 
  Archive,
  RotateCcw
} from 'lucide-react';
import { useApprovalAction, type ApprovalStatus, type ApprovalAction, type RelatedTableName } from '@/hooks/useApprovalEngine';
import { usePermission } from '@/hooks/usePermission';

interface ApprovalActionsDropdownProps {
  recordId: string;
  tableName: RelatedTableName;
  currentStatus: ApprovalStatus | string | null | undefined;
  onActionComplete?: () => void;
}

export function ApprovalActionsDropdown({
  recordId,
  tableName,
  currentStatus,
  onActionComplete,
}: ApprovalActionsDropdownProps) {
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const { mutate: performAction, isPending } = useApprovalAction();
  const { canWrite: canApprove } = usePermission('qa_approval');

  const status = currentStatus || 'Draft';

  const handleAction = (action: ApprovalAction, newStatus: ApprovalStatus, notes?: string) => {
    performAction(
      { recordId, tableName, action, newStatus, notes },
      { onSuccess: () => onActionComplete?.() }
    );
  };

  const handleReject = () => {
    if (!rejectNotes.trim()) return;
    handleAction('Rejected', 'Rejected', rejectNotes);
    setShowRejectDialog(false);
    setRejectNotes('');
  };

  // Define available actions based on current status
  const actions: {
    label: string;
    icon: React.ElementType;
    action: ApprovalAction;
    newStatus: ApprovalStatus;
    requiresNotes?: boolean;
    requiresQARole?: boolean;
    show: boolean;
  }[] = [
    {
      label: 'Submit for QA Review',
      icon: SendHorizontal,
      action: 'Submitted',
      newStatus: 'Pending_QA',
      show: status === 'Draft',
    },
    {
      label: 'Approve',
      icon: CheckCircle2,
      action: 'Approved',
      newStatus: 'Approved',
      requiresQARole: true,
      show: status === 'Pending_QA',
    },
    {
      label: 'Reject',
      icon: XCircle,
      action: 'Rejected',
      newStatus: 'Rejected',
      requiresNotes: true,
      requiresQARole: true,
      show: status === 'Pending_QA',
    },
    {
      label: 'Return to Draft',
      icon: RotateCcw,
      action: 'Restored',
      newStatus: 'Draft',
      show: status === 'Rejected',
    },
    {
      label: 'Archive',
      icon: Archive,
      action: 'Archived',
      newStatus: 'Archived',
      show: status !== 'Archived',
    },
  ];

  const visibleActions = actions.filter((a) => {
    if (!a.show) return false;
    if (a.requiresQARole && !canApprove) return false;
    return true;
  });

  if (visibleActions.length === 0) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={isPending}>
            <MoreHorizontal className="h-4 w-4 mr-1" />
            Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {visibleActions.map((item, index) => {
            const Icon = item.icon;
            const isDestructive = item.action === 'Rejected' || item.action === 'Archived';

            return (
              <div key={item.action}>
                {index > 0 && isDestructive && <DropdownMenuSeparator />}
                <DropdownMenuItem
                  onClick={() => {
                    if (item.requiresNotes) {
                      setShowRejectDialog(true);
                    } else {
                      handleAction(item.action, item.newStatus);
                    }
                  }}
                  className={isDestructive ? 'text-destructive focus:text-destructive' : ''}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.label}
                </DropdownMenuItem>
              </div>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Reject Dialog - requires notes */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Item</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejection. This is required for audit purposes.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="reject-notes">Rejection Reason *</Label>
            <Textarea
              id="reject-notes"
              placeholder="Enter the reason for rejection..."
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              className="mt-2"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectNotes.trim() || isPending}
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
