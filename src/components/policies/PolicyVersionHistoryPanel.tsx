import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  GitBranch,
  Eye,
  RotateCcw,
  MoreVertical,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { usePolicyVersions, useRestorePolicyVersion } from '@/hooks/usePolicyVersions';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PolicyVersionHistoryPanelProps {
  policyId: string;
  className?: string;
}

export function PolicyVersionHistoryPanel({ policyId, className }: PolicyVersionHistoryPanelProps) {
  const { user } = useAuth();
  const { data: versions, isLoading } = usePolicyVersions(policyId);
  const restoreVersion = useRestorePolicyVersion();

  const handleViewVersion = (versionId: string) => {
    // TODO: Implement version comparison view
    toast.info('Version comparison feature coming soon');
  };

  const handleRestoreVersion = (versionId: string) => {
    if (!user?.id) {
      toast.error('You must be logged in to restore versions');
      return;
    }

    if (confirm('Are you sure you want to restore this version? This will create a new version based on the selected one.')) {
      restoreVersion.mutate({
        versionId,
        userId: user.id,
        versionNotes: 'Restored from previous version',
      });
    }
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return 'U';
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!versions || versions.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <GitBranch className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Version History</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              This policy doesn't have any version history yet.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="pt-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">
            Version History ({versions.length})
          </h3>
          <p className="text-sm text-muted-foreground">
            Track changes and restore previous versions
          </p>
        </div>

        <div className="space-y-4">
          {versions.map((version, index) => {
            const isCurrent = version.version_status === 'current';
            const isSuperseded = version.version_status === 'superseded';
            const isArchived = version.version_status === 'archived';

            return (
              <div
                key={version.id}
                className={cn(
                  'relative flex gap-4 pb-4',
                  index !== versions.length - 1 && 'border-l-2 ml-5'
                )}
              >
                {/* Timeline Dot */}
                <div className="relative">
                  <div
                    className={cn(
                      'absolute -left-[21px] h-10 w-10 rounded-full border-4 border-background flex items-center justify-center',
                      isCurrent && 'bg-primary',
                      isSuperseded && 'bg-muted',
                      isArchived && 'bg-muted-foreground'
                    )}
                  >
                    {isCurrent ? (
                      <CheckCircle className="h-5 w-5 text-primary-foreground" />
                    ) : (
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 pt-1">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {/* Avatar */}
                      {version.created_by_profile && (
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={version.created_by_profile.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(
                              version.created_by_profile.first_name,
                              version.created_by_profile.last_name
                            )}
                          </AvatarFallback>
                        </Avatar>
                      )}

                      {/* Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">
                            Version {version.version_number}
                          </span>
                          {isCurrent && (
                            <Badge variant="default" className="text-xs">
                              Current
                            </Badge>
                          )}
                          {isArchived && (
                            <Badge variant="outline" className="text-xs">
                              Archived
                            </Badge>
                          )}
                        </div>

                        <div className="text-sm text-muted-foreground mb-1">
                          {version.created_by_profile && (
                            <span>
                              by {version.created_by_profile.first_name} {version.created_by_profile.last_name}
                            </span>
                          )}
                          {' · '}
                          <span title={format(new Date(version.created_at), 'PPpp')}>
                            {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
                          </span>
                        </div>

                        {version.version_notes && (
                          <p className="text-sm mt-2 p-2 bg-muted/50 rounded border">
                            {version.version_notes}
                          </p>
                        )}

                        {version.content_word_count && (
                          <div className="text-xs text-muted-foreground mt-2">
                            {version.content_word_count.toLocaleString()} words
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewVersion(version.id)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Version
                        </DropdownMenuItem>
                        {!isCurrent && (
                          <DropdownMenuItem onClick={() => handleRestoreVersion(version.id)}>
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Restore This Version
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
