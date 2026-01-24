import { useState } from 'react';
import { format } from 'date-fns';
import { useMutation } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Package,
  Factory,
  Truck,
  CalendarIcon,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { useEndOfDayBlockers } from '@/hooks/useApprovalEngine';
import { usePermissions } from '@/hooks/usePermission';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function CloseDay() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isForceCloseDialogOpen, setIsForceCloseDialogOpen] = useState(false);
  const [forceCloseConfirmed, setForceCloseConfirmed] = useState(false);
  const [forceCloseReason, setForceCloseReason] = useState('');
  const dateString = format(selectedDate, 'yyyy-MM-dd');
  
  const { data: blockers, isLoading, refetch } = useEndOfDayBlockers(dateString);
  const { isAdmin } = usePermissions();

  const closeDayMutation = useMutation({
    mutationFn: async ({ force, reason }: { force: boolean; reason?: string }) => {
      // Log to admin audit if force closing
      if (force) {
        const { error: auditError } = await supabase
          .from('admin_audit_log')
          .insert({
            admin_user_id: (await supabase.auth.getUser()).data.user?.id,
            action_type: 'force_close_day',
            action_details: {
              date: dateString,
              blockers_ignored: {
                receiving_sessions: blockers?.receivingSessions.length || 0,
                production_lots: blockers?.productionLots.length || 0,
                bills_of_lading: blockers?.billsOfLading.length || 0,
              },
            },
            justification: reason,
          });
        
        if (auditError) {
          console.warn('Failed to log force close to audit:', auditError);
        }
      }
      
      // TODO: Implement actual day close logic (create accounting_periods record, etc.)
      return { success: true, force };
    },
    onSuccess: (result) => {
      if (result.force) {
        toast.success(`Force closed ${format(selectedDate, 'MMMM d, yyyy')} (Admin Override)`);
      } else {
        toast.success(`Successfully closed ${format(selectedDate, 'MMMM d, yyyy')}`);
      }
      setIsForceCloseDialogOpen(false);
      setForceCloseConfirmed(false);
      setForceCloseReason('');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to close day');
    },
  });

  const handleCloseDay = () => {
    if (blockers && blockers.totalBlockers > 0) {
      toast.error('Cannot close day with open transactions. Please resolve all blockers first.');
      return;
    }
    closeDayMutation.mutate({ force: false });
  };

  const handleForceClose = () => {
    if (!forceCloseConfirmed || forceCloseReason.trim().length < 10) {
      return;
    }
    closeDayMutation.mutate({ force: true, reason: forceCloseReason });
  };

  const canCloseDay = !blockers || blockers.totalBlockers === 0;
  const canForceClose = isAdmin && forceCloseConfirmed && forceCloseReason.trim().length >= 10;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <CalendarDays className="h-8 w-8 text-primary" />
              Close Day
            </h1>
            <p className="text-muted-foreground mt-1">
              Finalize daily operations and close the financial day
            </p>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {format(selectedDate, 'MMMM d, yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                disabled={(date) => date > new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Status Card */}
        <Card className={cn(
          'border-2',
          canCloseDay ? 'border-emerald-500 bg-emerald-500/5' : 'border-amber-500 bg-amber-500/5'
        )}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {canCloseDay ? (
                  <div className="p-3 rounded-full bg-emerald-500/10">
                    <Unlock className="h-8 w-8 text-emerald-600" />
                  </div>
                ) : (
                  <div className="p-3 rounded-full bg-amber-500/10">
                    <Lock className="h-8 w-8 text-amber-600" />
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-semibold">
                    {canCloseDay ? 'Ready to Close' : 'Blockers Detected'}
                  </h2>
                  <p className="text-muted-foreground">
                    {canCloseDay
                      ? 'All transactions are complete. You can close this day.'
                      : `${blockers?.totalBlockers || 0} open transaction(s) must be resolved before closing.`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Admin Force Close Button */}
                {isAdmin && !canCloseDay && (
                  <Button
                    variant="outline"
                    className="border-amber-500 text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950"
                    onClick={() => setIsForceCloseDialogOpen(true)}
                  >
                    <ShieldAlert className="h-5 w-5 mr-2" />
                    Force Close (Admin)
                  </Button>
                )}
                <Button
                  size="lg"
                  disabled={!canCloseDay || isLoading || closeDayMutation.isPending}
                  onClick={handleCloseDay}
                  className={cn(
                    canCloseDay && 'bg-emerald-600 hover:bg-emerald-700'
                  )}
                >
                  {closeDayMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Closing...
                    </>
                  ) : canCloseDay ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      Close Day
                    </>
                  ) : (
                    <>
                      <Lock className="h-5 w-5 mr-2" />
                      Cannot Close
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Blockers Alert */}
        {blockers && blockers.totalBlockers > 0 && (
          <Alert variant="destructive" className="border-amber-500 bg-amber-500/10 text-amber-800 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>End-of-Day Blockers</AlertTitle>
            <AlertDescription>
              The following transactions must be completed or cancelled before closing the day.
            </AlertDescription>
          </Alert>
        )}

        {/* Blockers Grid */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Open Receiving Sessions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4" />
                Open Receiving
              </CardTitle>
              <Badge variant={blockers?.receivingSessions.length ? 'destructive' : 'secondary'}>
                {blockers?.receivingSessions.length || 0}
              </Badge>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : !blockers?.receivingSessions.length ? (
                <div className="text-center py-4 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                  <p className="text-sm">All receiving complete</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {blockers.receivingSessions.slice(0, 5).map((session: { id: string; receiving_number?: string; status?: string }) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-2 rounded bg-muted"
                    >
                      <span className="text-sm font-medium">
                        {session.receiving_number || 'Unknown'}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {session.status}
                      </Badge>
                    </div>
                  ))}
                  {blockers.receivingSessions.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{blockers.receivingSessions.length - 5} more
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Open Production Lots */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Factory className="h-4 w-4" />
                Open Production
              </CardTitle>
              <Badge variant={blockers?.productionLots.length ? 'destructive' : 'secondary'}>
                {blockers?.productionLots.length || 0}
              </Badge>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : !blockers?.productionLots.length ? (
                <div className="text-center py-4 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                  <p className="text-sm">All production complete</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {blockers.productionLots.slice(0, 5).map((lot: { id: string; lot_number?: string; status?: string }) => (
                    <div
                      key={lot.id}
                      className="flex items-center justify-between p-2 rounded bg-muted"
                    >
                      <span className="text-sm font-medium">
                        {lot.lot_number || 'Unknown'}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {lot.status}
                      </Badge>
                    </div>
                  ))}
                  {blockers.productionLots.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{blockers.productionLots.length - 5} more
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Open BOLs */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Open Shipments
              </CardTitle>
              <Badge variant={blockers?.billsOfLading.length ? 'destructive' : 'secondary'}>
                {blockers?.billsOfLading.length || 0}
              </Badge>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : !blockers?.billsOfLading.length ? (
                <div className="text-center py-4 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                  <p className="text-sm">All shipments complete</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {blockers.billsOfLading.slice(0, 5).map((bol: { id: string; bol_number?: string; status?: string }) => (
                    <div
                      key={bol.id}
                      className="flex items-center justify-between p-2 rounded bg-muted"
                    >
                      <span className="text-sm font-medium">
                        {bol.bol_number || 'Unknown'}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {bol.status}
                      </Badge>
                    </div>
                  ))}
                  {blockers.billsOfLading.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{blockers.billsOfLading.length - 5} more
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">About Day Close</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Closing a day ensures all operational transactions are finalized and ready for financial reconciliation.
              This is required for accurate cost tracking and SQF compliance.
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>All receiving sessions must be marked as completed</li>
              <li>All production runs must be finished or cancelled</li>
              <li>All shipments must be confirmed as delivered or returned</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Force Close Dialog */}
      <Dialog open={isForceCloseDialogOpen} onOpenChange={setIsForceCloseDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <ShieldAlert className="h-5 w-5" />
              Admin Force Close
            </DialogTitle>
            <DialogDescription>
              You are about to force close {format(selectedDate, 'MMMM d, yyyy')} with{' '}
              <span className="font-semibold text-destructive">{blockers?.totalBlockers || 0}</span> unresolved blockers.
              This action will be logged for audit purposes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                Force closing with open transactions may cause:
                <ul className="list-disc list-inside mt-2 text-sm">
                  <li>Incomplete receiving sessions to be orphaned</li>
                  <li>Production lot costs to be inaccurate</li>
                  <li>Shipment tracking discrepancies</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="force-close-confirm"
                checked={forceCloseConfirmed}
                onCheckedChange={(checked) => setForceCloseConfirmed(checked === true)}
                className="mt-1"
              />
              <div className="space-y-1">
                <Label htmlFor="force-close-confirm" className="font-medium cursor-pointer">
                  I understand the implications and want to proceed
                </Label>
              </div>
            </div>

            {forceCloseConfirmed && (
              <div className="space-y-2">
                <Label htmlFor="force-reason">
                  Justification <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="force-reason"
                  value={forceCloseReason}
                  onChange={(e) => setForceCloseReason(e.target.value)}
                  placeholder="Explain why this force close is necessary (minimum 10 characters)..."
                  className="min-h-[80px]"
                />
                {forceCloseReason.length > 0 && forceCloseReason.trim().length < 10 && (
                  <p className="text-xs text-destructive">
                    Please provide a more detailed justification
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsForceCloseDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!canForceClose || closeDayMutation.isPending}
              onClick={handleForceClose}
            >
              {closeDayMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Closing...
                </>
              ) : (
                <>
                  <ShieldAlert className="h-4 w-4 mr-2" />
                  Force Close Day
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
