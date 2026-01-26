import { cn } from '@/lib/utils';
import { Calendar, User, Eye, FileText, MessageSquare, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import type { Policy } from '@/types/policies';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PolicyMetadataBarProps {
  policy: Policy;
  variant?: 'compact' | 'full';
  className?: string;
  showAvatar?: boolean;
}

export function PolicyMetadataBar({
  policy,
  variant = 'full',
  className,
  showAvatar = true,
}: PolicyMetadataBarProps) {
  const isCompact = variant === 'compact';

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return 'N/A';
    try {
      return format(new Date(date), 'MMM dd, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return 'U';
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  return (
    <div
      className={cn(
        'flex items-center gap-4 text-sm text-muted-foreground',
        isCompact ? 'gap-3' : 'gap-4',
        className
      )}
    >
      {/* Owner */}
      {policy.owned_by_profile && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5">
                {showAvatar && (
                  <Avatar className={isCompact ? 'h-5 w-5' : 'h-6 w-6'}>
                    <AvatarImage src={policy.owned_by_profile.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(
                        policy.owned_by_profile.first_name,
                        policy.owned_by_profile.last_name
                      )}
                    </AvatarFallback>
                  </Avatar>
                )}
                {!isCompact && (
                  <span>
                    {policy.owned_by_profile.first_name} {policy.owned_by_profile.last_name}
                  </span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Owner: {policy.owned_by_profile.first_name} {policy.owned_by_profile.last_name}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Version Number */}
      {!isCompact && (
        <div className="flex items-center gap-1.5">
          <FileText className="h-4 w-4" />
          <span>v{policy.version_number}</span>
        </div>
      )}

      {/* Effective Date */}
      {policy.effective_date && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(policy.effective_date)}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Effective Date</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Review Date (if approaching or overdue) */}
      {policy.review_date && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  'flex items-center gap-1.5',
                  new Date(policy.review_date) < new Date()
                    ? 'text-destructive'
                    : new Date(policy.review_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                    ? 'text-amber-600 dark:text-amber-400'
                    : ''
                )}
              >
                <Calendar className="h-4 w-4" />
                <span className={isCompact ? 'hidden sm:inline' : ''}>
                  Review: {formatDate(policy.review_date)}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Next Review Date</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Statistics - Only in full variant */}
      {!isCompact && (
        <>
          {/* Acknowledgements Count */}
          {policy.acknowledgement_count !== undefined && policy.acknowledgement_count > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4" />
                    <span>{policy.acknowledgement_count}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{policy.acknowledgement_count} acknowledgements</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Comments Count */}
          {policy.open_comments_count !== undefined && policy.open_comments_count > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="h-4 w-4" />
                    <span>{policy.open_comments_count}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{policy.open_comments_count} open comments</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </>
      )}
    </div>
  );
}
