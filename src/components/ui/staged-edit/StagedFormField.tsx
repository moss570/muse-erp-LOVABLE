import React, { ReactNode } from 'react';
import { useFormContext, ControllerRenderProps, FieldValues, Path } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { useStagedEditContext } from './StagedEditProvider';
import { cn } from '@/lib/utils';

interface StagedFormFieldProps<T extends FieldValues> {
  name: Path<T>;
  label: string;
  viewRender: (value: any) => ReactNode;
  editRender: (field: ControllerRenderProps<T, Path<T>>) => ReactNode;
  description?: string;
  readOnlyInEdit?: boolean;
  className?: string;
  required?: boolean;
}

/**
 * A form field that switches between view and edit modes.
 * In view mode, displays the value using viewRender.
 * In edit mode, shows an editable input using editRender.
 */
export function StagedFormField<T extends FieldValues>({
  name,
  label,
  viewRender,
  editRender,
  description,
  readOnlyInEdit = false,
  className,
  required = false,
}: StagedFormFieldProps<T>) {
  const { isEditing } = useStagedEditContext();
  const { control, watch } = useFormContext<T>();
  
  const currentValue = watch(name);
  const showAsReadOnly = !isEditing || readOnlyInEdit;

  if (showAsReadOnly) {
    return (
      <div className={cn("space-y-1", className)}>
        <label className="text-sm font-medium text-muted-foreground">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
        <div className="text-sm min-h-[1.5rem] py-1">
          {viewRender(currentValue)}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    );
  }

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </FormLabel>
          <FormControl>
            {editRender(field as ControllerRenderProps<T, Path<T>>)}
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
