import React from 'react';
import { AlertTriangle, RefreshCw, Save } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface ConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceName?: string;
  onKeepLocal: () => void;
  onAcceptServer: () => void;
  serverUpdatedAt?: string;
}

export function ConflictDialog({
  open,
  onOpenChange,
  resourceName = 'record',
  onKeepLocal,
  onAcceptServer,
  serverUpdatedAt,
}: ConflictDialogProps) {
  const formattedTime = serverUpdatedAt 
    ? new Date(serverUpdatedAt).toLocaleString()
    : 'recently';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <AlertDialogTitle>Conflict Detected</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2">
            This {resourceName} was modified by another user at {formattedTime}.
            Your changes may overwrite their updates.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="space-y-3 py-4">
          <div className="rounded-lg border p-3 bg-muted/50">
            <p className="text-sm font-medium mb-1">What would you like to do?</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• <strong>Keep my changes:</strong> Your edits will be saved, potentially overwriting the other user's changes.</li>
              <li>• <strong>Reload latest:</strong> Discard your changes and load the most recent version.</li>
            </ul>
          </div>
        </div>

        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel asChild>
            <Button variant="outline" onClick={onAcceptServer}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload Latest
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button onClick={onKeepLocal}>
              <Save className="h-4 w-4 mr-2" />
              Keep My Changes
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
