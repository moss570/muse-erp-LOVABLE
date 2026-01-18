import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AlertTriangle,
  FileWarning,
  Thermometer,
  Package,
  FileText,
  Calendar,
  Hash,
  XCircle,
  MoreHorizontal,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

import { useCreateCapaFromRejection, useCapaSuggestionSettings, useProfiles, buildCapaTitle } from '@/hooks/useReceivingCapa';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import {
  REJECTION_CATEGORY_CONFIG,
  type RejectionCategory,
  type ReceivingRejectionData,
} from '@/types/receiving';
import { CAPA_SEVERITY_CONFIG, type CapaSeverity } from '@/types/capa';

// Icon mapping
const CATEGORY_ICONS: Record<RejectionCategory, React.ComponentType<{ className?: string }>> = {
  temperature: Thermometer,
  contamination: AlertTriangle,
  quality: XCircle,
  specification: FileText,
  documentation: FileText,
  packaging: Package,
  quantity: Hash,
  expiration: Calendar,
  other: MoreHorizontal,
};

// Form schema
const rejectionFormSchema = z.object({
  rejection_category: z.enum([
    'temperature', 'contamination', 'quality', 'specification',
    'documentation', 'packaging', 'quantity', 'expiration', 'other'
  ]),
  rejection_reason: z.string().min(10, 'Please provide a detailed rejection reason (min 10 characters)'),
  quantity_rejected: z.number().optional(),
  
  // CAPA options
  create_capa: z.boolean().default(true),
  capa_severity: z.enum(['minor', 'major', 'critical']).optional(),
  capa_assigned_to: z.string().optional(),
  capa_additional_notes: z.string().optional(),
});

type RejectionFormValues = z.infer<typeof rejectionFormSchema>;

interface RejectLotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receivingData: {
    receiving_lot_id?: string;
    receiving_item_id?: string;
    lot_number: string;
    internal_lot_number?: string;
    supplier_id: string;
    supplier_name: string;
    supplier_code: string;
    material_id: string;
    material_name: string;
    material_code: string;
    quantity_received?: number;
    unit_of_measure?: string;
    po_number?: string;
    po_id?: string;
    temperature_reading?: number;
    temperature_required_min?: number;
    temperature_required_max?: number;
  };
  onConfirm: (data: {
    rejection_category: RejectionCategory;
    rejection_reason: string;
    quantity_rejected?: number;
    capa_id?: string;
  }) => Promise<void>;
}

export function RejectLotDialog({
  open,
  onOpenChange,
  receivingData,
  onConfirm,
}: RejectLotDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCapaNumber, setCreatedCapaNumber] = useState<string | null>(null);

  const { data: settings } = useCapaSuggestionSettings();
  const { data: profiles } = useProfiles();
  const createCapa = useCreateCapaFromRejection();

  const form = useForm<RejectionFormValues>({
    resolver: zodResolver(rejectionFormSchema),
    defaultValues: {
      rejection_category: 'other',
      rejection_reason: '',
      create_capa: true,
    },
  });

  // Reset create_capa when settings load
  useEffect(() => {
    if (settings?.auto_suggest_capa_on_rejection !== undefined) {
      form.setValue('create_capa', settings.auto_suggest_capa_on_rejection);
    }
  }, [settings, form]);

  // Watch category to update severity suggestion
  const watchedCategory = form.watch('rejection_category');
  const watchedCreateCapa = form.watch('create_capa');

  // Auto-set severity based on category
  useEffect(() => {
    if (watchedCategory) {
      const categoryConfig = REJECTION_CATEGORY_CONFIG[watchedCategory];
      if (categoryConfig) {
        form.setValue('capa_severity', categoryConfig.defaultSeverity);
      }
    }
  }, [watchedCategory, form]);

  // Auto-detect temperature rejection
  useEffect(() => {
    if (receivingData.temperature_reading !== undefined &&
        receivingData.temperature_required_min !== undefined &&
        receivingData.temperature_required_max !== undefined) {
      const isOutOfRange = 
        receivingData.temperature_reading < receivingData.temperature_required_min ||
        receivingData.temperature_reading > receivingData.temperature_required_max;
      
      if (isOutOfRange) {
        form.setValue('rejection_category', 'temperature');
        form.setValue('rejection_reason', 
          `Temperature reading of ${receivingData.temperature_reading}°F is outside the acceptable range of ${receivingData.temperature_required_min}°F - ${receivingData.temperature_required_max}°F.`
        );
      }
    }
  }, [receivingData, form]);

  const handleSubmit = async (values: RejectionFormValues) => {
    setIsSubmitting(true);
    try {
      let capaId: string | undefined;

      // Create CAPA if requested
      if (values.create_capa) {
        const rejectionData: ReceivingRejectionData = {
          ...receivingData,
          rejection_category: values.rejection_category,
          rejection_reason: values.rejection_reason,
          quantity_rejected: values.quantity_rejected,
        };

        const capa = await createCapa.mutateAsync({
          rejectionData,
          severity: values.capa_severity,
          additionalNotes: values.capa_additional_notes,
          assignTo: values.capa_assigned_to,
        });

        capaId = capa.id;
        setCreatedCapaNumber(capa.capa_number);
      }

      // Confirm the rejection
      await onConfirm({
        rejection_category: values.rejection_category,
        rejection_reason: values.rejection_reason,
        quantity_rejected: values.quantity_rejected,
        capa_id: capaId,
      });

      // If we created a CAPA, show success state briefly before closing
      if (capaId) {
        setTimeout(() => {
          onOpenChange(false);
          setCreatedCapaNumber(null);
          form.reset();
        }, 2000);
      } else {
        onOpenChange(false);
        form.reset();
      }
    } catch (error) {
      console.error('Rejection failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoryConfig = REJECTION_CATEGORY_CONFIG[watchedCategory];
  const CategoryIcon = CATEGORY_ICONS[watchedCategory];

  // Check if CAPA is required
  const capaRequired = settings?.require_capa_for_rejection;

  // Build preview title
  const previewTitle = buildCapaTitle({
    ...receivingData,
    rejection_category: watchedCategory,
    rejection_reason: '',
  } as ReceivingRejectionData);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Reject Receiving Lot
          </DialogTitle>
          <DialogDescription>
            Document the rejection reason and optionally create a CAPA for tracking.
          </DialogDescription>
        </DialogHeader>

        {/* Success State */}
        {createdCapaNumber && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">CAPA Created Successfully</AlertTitle>
            <AlertDescription className="text-green-700">
              {createdCapaNumber} has been created and linked to this rejection.
            </AlertDescription>
          </Alert>
        )}

        {!createdCapaNumber && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Receiving Info Summary */}
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lot Number:</span>
                    <span className="font-medium">{receivingData.lot_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Material:</span>
                    <span className="font-medium">{receivingData.material_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Supplier:</span>
                    <span className="font-medium">{receivingData.supplier_name}</span>
                  </div>
                  {receivingData.quantity_received && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Qty Received:</span>
                      <span className="font-medium">
                        {receivingData.quantity_received} {receivingData.unit_of_measure}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Rejection Category */}
              <FormField
                control={form.control}
                name="rejection_category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rejection Category *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select rejection category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(REJECTION_CATEGORY_CONFIG).map(([value, config]) => {
                          const Icon = CATEGORY_ICONS[value as RejectionCategory];
                          return (
                            <SelectItem key={value} value={value}>
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4" />
                                {config.label}
                                <Badge variant="outline" className="ml-2 text-xs">
                                  {config.defaultSeverity}
                                </Badge>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {categoryConfig && (
                      <FormDescription>{categoryConfig.description}</FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Rejection Reason */}
              <FormField
                control={form.control}
                name="rejection_reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rejection Reason *</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Describe the reason for rejection in detail..."
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Quantity Rejected (optional) */}
              {receivingData.quantity_received && (
                <FormField
                  control={form.control}
                  name="quantity_rejected"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity Rejected</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            placeholder="Enter quantity"
                            value={field.value || ''}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            className="w-32"
                          />
                          <span className="text-sm text-muted-foreground">
                            of {receivingData.quantity_received} {receivingData.unit_of_measure}
                          </span>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Leave blank if rejecting the entire lot
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <Separator />

              {/* CAPA Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileWarning className="h-5 w-5 text-amber-500" />
                    <span className="font-medium">Corrective Action (CAPA)</span>
                  </div>
                  {capaRequired && (
                    <Badge variant="destructive">Required</Badge>
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="create_capa"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={capaRequired}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Create CAPA for this rejection
                        </FormLabel>
                        <FormDescription>
                          A CAPA will be created and linked to this receiving lot, with the supplier assigned for follow-up.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {/* CAPA Options (shown when create_capa is checked) */}
                {watchedCreateCapa && (
                  <div className="ml-7 space-y-4 p-4 bg-muted/50 rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="capa_severity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Severity</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select severity" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Object.entries(CAPA_SEVERITY_CONFIG).map(([value, config]) => (
                                  <SelectItem key={value} value={value}>
                                    <div className="flex items-center gap-2">
                                      <span className={cn('w-2 h-2 rounded-full', config.bgColor)} />
                                      {config.label}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Based on category: {categoryConfig?.defaultSeverity}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="capa_assigned_to"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Assign To</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select assignee" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="">Unassigned</SelectItem>
                                {profiles?.map((profile) => (
                                  <SelectItem key={profile.id} value={profile.id}>
                                    {profile.first_name} {profile.last_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="capa_additional_notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional CAPA Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Any additional context or investigation notes for the CAPA..."
                              rows={2}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Preview what will be created */}
                    <div className="text-xs text-muted-foreground p-2 bg-background rounded">
                      <strong>CAPA Preview:</strong>
                      <br />
                      Title: {previewTitle}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={isSubmitting}
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {watchedCreateCapa ? 'Reject & Create CAPA' : 'Confirm Rejection'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
