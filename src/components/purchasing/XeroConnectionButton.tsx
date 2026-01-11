import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Loader2, Link2, Unlink, RefreshCw, CheckCircle } from 'lucide-react';
import { useXeroConnection, useXeroConnect, useXeroDisconnect } from '@/hooks/useXero';
import { format } from 'date-fns';

export function XeroConnectionButton() {
  const { data: connection, isLoading } = useXeroConnection();
  const { connectToXero } = useXeroConnect();
  const disconnectXero = useXeroDisconnect();

  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  if (!connection) {
    return (
      <Button variant="outline" size="sm" onClick={connectToXero}>
        <Link2 className="h-4 w-4 mr-2" />
        Connect to Xero
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <CheckCircle className="h-4 w-4 text-green-500" />
          Xero Connected
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <div className="px-2 py-1.5 text-sm">
          <p className="font-medium">{connection.tenant_name}</p>
          <p className="text-xs text-muted-foreground">
            Connected {format(new Date(connection.updated_at), 'MMM d, yyyy')}
          </p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={connectToXero}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Reconnect
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => disconnectXero.mutate()}
          className="text-destructive"
        >
          <Unlink className="h-4 w-4 mr-2" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface XeroSyncBadgeProps {
  syncStatus?: string | null;
  syncedAt?: string | null;
  syncError?: string | null;
}

export function XeroSyncBadge({ syncStatus, syncedAt, syncError }: XeroSyncBadgeProps) {
  if (!syncStatus) return null;

  switch (syncStatus) {
    case 'synced':
      return (
        <Badge variant="outline" className="gap-1 text-green-600 border-green-200 bg-green-50">
          <CheckCircle className="h-3 w-3" />
          Synced to Xero
          {syncedAt && (
            <span className="text-xs opacity-70">
              ({format(new Date(syncedAt), 'MMM d')})
            </span>
          )}
        </Badge>
      );
    case 'error':
      return (
        <Badge variant="destructive" className="gap-1">
          Xero Error
        </Badge>
      );
    case 'pending':
      return (
        <Badge variant="secondary" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Syncing...
        </Badge>
      );
    default:
      return null;
  }
}
