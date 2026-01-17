import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Pencil, Users } from 'lucide-react';
import { useStagedEditContext } from './StagedEditProvider';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface EditModeIndicatorProps {
  className?: string;
  showOtherEditors?: boolean;
}

/**
 * Shows current editing status and other active editors.
 */
export function EditModeIndicator({ 
  className,
  showOtherEditors = true,
}: EditModeIndicatorProps) {
  const { isEditing, otherEditors, resourceName } = useStagedEditContext();

  if (!isEditing && otherEditors.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {isEditing && (
        <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-800 border-amber-200">
          <Pencil className="h-3 w-3" />
          Editing
        </Badge>
      )}

      {showOtherEditors && otherEditors.length > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="gap-1 cursor-help">
              <Users className="h-3 w-3" />
              {otherEditors.length} other{otherEditors.length > 1 ? 's' : ''} editing
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-medium text-xs">Also editing this {resourceName}:</p>
              {otherEditors.map((editor) => (
                <p key={editor.id} className="text-xs">
                  {editor.profile?.first_name && editor.profile?.last_name
                    ? `${editor.profile.first_name} ${editor.profile.last_name}`
                    : editor.profile?.email || 'Unknown user'}
                </p>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
