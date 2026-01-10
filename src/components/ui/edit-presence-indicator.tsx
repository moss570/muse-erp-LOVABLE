import React from 'react';
import { Users, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

interface Editor {
  user_id: string;
  profile?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

interface EditPresenceIndicatorProps {
  editors: Editor[];
  className?: string;
  showWarning?: boolean;
}

export function EditPresenceIndicator({ 
  editors, 
  className,
  showWarning = true,
}: EditPresenceIndicatorProps) {
  if (editors.length === 0) return null;

  const getEditorName = (editor: Editor) => {
    if (editor.profile?.first_name || editor.profile?.last_name) {
      return `${editor.profile.first_name || ''} ${editor.profile.last_name || ''}`.trim();
    }
    return editor.profile?.email || 'Another user';
  };

  const editorNames = editors.map(getEditorName);
  const displayText = editors.length === 1 
    ? `${editorNames[0]} is editing`
    : `${editors.length} users are editing`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={cn(
              "gap-1.5 px-2.5 py-1 bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-300",
              className
            )}
          >
            {showWarning ? (
              <AlertTriangle className="h-3.5 w-3.5" />
            ) : (
              <Users className="h-3.5 w-3.5" />
            )}
            <span className="text-xs font-medium">{displayText}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium text-sm">Active Editors:</p>
            <ul className="text-xs space-y-0.5">
              {editorNames.map((name, index) => (
                <li key={editors[index].user_id}>• {name}</li>
              ))}
            </ul>
            {showWarning && (
              <p className="text-xs text-muted-foreground mt-2">
                Changes may conflict. Save carefully.
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
