import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useCreateCapa } from '@/hooks/useCapa';
import { CAPA_TYPE_CONFIG, CAPA_SEVERITY_CONFIG, type CapaType, type CapaSeverity } from '@/types/capa';

const formSchema = z.object({
  capa_type: z.enum(['supplier', 'equipment', 'material', 'product', 'facility', 'process', 'employee', 'sanitation', 'sop_non_compliance', 'labeling', 'other']),
  severity: z.enum(['minor', 'major', 'critical']),
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  occurrence_date: z.string(),
  discovery_date: z.string().optional(),
  immediate_action: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CapaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEdit?: boolean;
}

export function CapaFormDialog({ open, onOpenChange, canEdit = true }: CapaFormDialogProps) {
  const createCapa = useCreateCapa();
  const isFieldsDisabled = !canEdit;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      capa_type: 'other',
      severity: 'minor',
      title: '',
      description: '',
      occurrence_date: format(new Date(), 'yyyy-MM-dd'),
      discovery_date: format(new Date(), 'yyyy-MM-dd'),
      immediate_action: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        capa_type: 'other',
        severity: 'minor',
        title: '',
        description: '',
        occurrence_date: format(new Date(), 'yyyy-MM-dd'),
        discovery_date: format(new Date(), 'yyyy-MM-dd'),
        immediate_action: '',
      });
    }
  }, [open, form]);

  const onSubmit = async (values: FormValues) => {
    await createCapa.mutateAsync({
      title: values.title,
      description: values.description,
      occurrence_date: values.occurrence_date,
      discovery_date: values.discovery_date,
      immediate_action: values.immediate_action,
      capa_type: values.capa_type as CapaType,
      severity: values.severity as CapaSeverity,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Corrective Action (CAPA)</DialogTitle>
          <DialogDescription>
            Document a new issue that requires corrective and preventive action.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="capa_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isFieldsDisabled}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(CAPA_TYPE_CONFIG).map(([value, config]) => (
                          <SelectItem key={value} value={value}>
                            {config.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="severity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Severity *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isFieldsDisabled}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select severity" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(CAPA_SEVERITY_CONFIG).map(([value, config]) => (
                          <SelectItem key={value} value={value}>
                            <span className={config.color}>{config.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Determines response timeframes
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="Brief description of the issue" {...field} disabled={isFieldsDisabled} />
                    </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Detailed description of the problem, including what happened, who was involved, what was affected..."
                        className="min-h-[100px]"
                        {...field} 
                        disabled={isFieldsDisabled}
                      />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="occurrence_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Occurrence Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} disabled={isFieldsDisabled} />
                    </FormControl>
                    <FormDescription>When did the issue occur?</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="discovery_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discovery Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} disabled={isFieldsDisabled} />
                    </FormControl>
                    <FormDescription>When was it discovered?</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="immediate_action"
              render={({ field }) => (
                  <FormItem>
                    <FormLabel>Immediate/Containment Action</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="What immediate steps were taken to contain the issue?"
                        {...field} 
                        disabled={isFieldsDisabled}
                      />
                  </FormControl>
                  <FormDescription>
                    Optional: Document any containment actions already taken
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createCapa.isPending || isFieldsDisabled}>
                {createCapa.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create CAPA
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
