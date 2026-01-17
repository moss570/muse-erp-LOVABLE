import React from 'react';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { useStagedEditContext } from './StagedEditProvider';
import { cn } from '@/lib/utils';

interface EditButtonProps {
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
}

/**
 * Edit button that only renders when user has edit permission
 * and is currently in view mode.
 */
export function EditButton({ 
  className, 
  size = 'sm',
  showLabel = true,
}: EditButtonProps) {
  const { isEditing, canEdit, startEdit } = useStagedEditContext();

  // Don't render if no edit permission or already editing
  if (!canEdit || isEditing) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      onClick={startEdit}
      className={cn("gap-1.5", className)}
    >
      <Pencil className="h-4 w-4" />
      {showLabel && <span>Edit</span>}
    </Button>
  );
}
