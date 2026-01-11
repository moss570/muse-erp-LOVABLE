import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, RefreshCw, Loader2, Archive } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useRenewComplianceDocument } from '@/hooks/useComplianceDocuments';
import { Alert, AlertDescription } from '@/components/ui/alert';

const formSchema = z.object({
  document_name: z.string().min(1, 'Document name is required'),
  file_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  expiration_date: z.date().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface DocumentRenewalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentName: string;
  documentType: string;
}

export function DocumentRenewalDialog({
  open,
  onOpenChange,
  documentId,
  documentName,
  documentType,
}: DocumentRenewalDialogProps) {
  const { mutate: renewDocument, isPending } = useRenewComplianceDocument();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      document_name: '',
      file_url: '',
      notes: '',
    },
  });

  const onSubmit = (values: FormValues) => {
    renewDocument(
      {
        oldDocumentId: documentId,
        document_name: values.document_name,
        file_url: values.file_url || undefined,
        expiration_date: values.expiration_date?.toISOString().split('T')[0],
        notes: values.notes,
      },
      {
        onSuccess: () => {
          form.reset();
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Renew Document
          </DialogTitle>
          <DialogDescription>
            Upload a new version of "{documentName}"
          </DialogDescription>
        </DialogHeader>

        <Alert className="bg-amber-500/10 border-amber-500/30">
          <Archive className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            The current document will be automatically archived when you upload the renewal.
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Document Type:</span>{' '}
                {documentType.replace(/_/g, ' ')}
              </p>
            </div>

            <FormField
              control={form.control}
              name="document_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Document Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., 2026 Certificate of Insurance"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="file_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://drive.google.com/..."
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Link to the new document (Google Drive, Dropbox, etc.)
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expiration_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>New Expiration Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP')
                          ) : (
                            <span>Select new expiration date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any notes about this renewal..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Upload Renewal
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
