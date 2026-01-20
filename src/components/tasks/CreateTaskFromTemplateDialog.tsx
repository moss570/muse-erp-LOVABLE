import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTaskTemplate, useCreateTaskFromTemplate } from '@/hooks/useTaskTemplates';
import EmployeeCombobox from '@/components/shared/EmployeeCombobox';
import { Shield, Clock, Camera, FileSignature, FileText, CheckSquare } from 'lucide-react';

const formSchema = z.object({
  title: z.string().optional(),
  assigned_to: z.string().optional(),
  due_date: z.string().optional(),
  due_time: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CreateTaskFromTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: string;
}

const CreateTaskFromTemplateDialog = ({ open, onOpenChange, templateId }: CreateTaskFromTemplateDialogProps) => {
  const { data: template, isLoading } = useTaskTemplate(templateId);
  const createFromTemplate = useCreateTaskFromTemplate();
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      assigned_to: '',
      due_date: new Date().toISOString().split('T')[0],
      due_time: '',
    },
  });
  
  const onSubmit = async (data: FormData) => {
    await createFromTemplate.mutateAsync({
      templateId,
      overrides: {
        title: data.title || undefined,
        assigned_to: data.assigned_to || undefined,
        due_date: data.due_date || undefined,
        due_time: data.due_time || undefined,
      },
    });
    onOpenChange(false);
    form.reset();
  };

  if (isLoading || !template) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Task from Template</DialogTitle>
          <DialogDescription>
            Create a new task based on the "{template.name}" template
          </DialogDescription>
        </DialogHeader>
        
        {/* Template Info */}
        <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium">{template.name}</span>
            <div className="flex items-center gap-2">
              {template.is_food_safety && (
                <Badge variant="destructive" className="gap-1">
                  <Shield className="h-3 w-3" />
                  Food Safety
                </Badge>
              )}
              <Badge variant="secondary">{template.default_priority}</Badge>
            </div>
          </div>
          
          {template.description && (
            <p className="text-sm text-muted-foreground">{template.description}</p>
          )}
          
          <div className="flex flex-wrap gap-3 text-sm">
            {template.estimated_duration_minutes && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-4 w-4" />
                {template.estimated_duration_minutes} min
              </div>
            )}
            {template.requires_photo && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Camera className="h-4 w-4" />
                Photo required
              </div>
            )}
            {template.requires_signature && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <FileSignature className="h-4 w-4" />
                Signature required
              </div>
            )}
            {template.requires_notes && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <FileText className="h-4 w-4" />
                Notes required
              </div>
            )}
            {template.checklist_items?.length > 0 && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <CheckSquare className="h-4 w-4" />
                {template.checklist_items.length} checklist items
              </div>
            )}
          </div>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title (Optional Override)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={template.name}
                      {...field} 
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Leave blank to use the template name
                  </p>
                </FormItem>
              )}
            />
            
            {template.default_assignee_type === 'specific' && (
              <FormField
                control={form.control}
                name="assigned_to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign To (Optional Override)</FormLabel>
                    <EmployeeCombobox
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Use template default"
                    />
                  </FormItem>
                )}
              />
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="due_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createFromTemplate.isPending}>
                {createFromTemplate.isPending ? 'Creating...' : 'Create Task'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTaskFromTemplateDialog;
