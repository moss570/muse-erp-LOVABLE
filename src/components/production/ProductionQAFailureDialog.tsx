import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AlertTriangle,
  FileWarning,
  Thermometer,
  Wind,
  Scale,
  Eye,
  Layers,
  Cherry,
  Bug,
  Package,
  Tag,
  Wrench,
  GitBranch,
  Beaker,
  MoreHorizontal,
  Loader2,
  CheckCircle2,
  Pause,
  XCircle,
  FileCheck,
  LucideIcon,
} from 'lucide-react';

import { useCreateCapaFromProduction, useProductionCapaSettings } from '@/hooks/useProductionCapa';
import { useProfiles } from '@/hooks/useReceivingCapa';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import {
  PRODUCTION_FAILURE_CONFIG,
  type ProductionFailureCategory,
  type ProductionQAFailureData,
} from '@/types/production-qa';
import { CAPA_SEVERITY_CONFIG, CAPA_TYPE_CONFIG } from '@/types/capa';
import type { CapaSeverity, CapaType } from '@/types/capa';

// Icon mapping
const CATEGORY_ICONS: Record<ProductionFailureCategory, LucideIcon> = {
  temperature: Thermometer,
  overrun: Wind,
  weight: Scale,
  appearance: Eye,
  texture: Layers,
  flavor: Cherry,
  contamination: AlertTriangle,
  micro: Bug,
  packaging: Package,
  labeling: Tag,
  equipment: Wrench,
  process: GitBranch,
  ingredient: Beaker,
  other: MoreHorizontal,
};

const failureFormSchema = z.object({
  failure_category: z.enum([
    'temperature', 'overrun', 'weight', 'appearance', 'texture', 'flavor',
    'contamination', 'micro', 'packaging', 'labeling', 'equipment', 'process',
    'ingredient', 'other'
  ] as const),
  failure_reason: z.string().min(10, 'Please provide detailed failure description'),
  action_type: z.enum(['hold', 'reject', 'release_with_deviation']),
  quantity_affected: z.number().optional(),
  
  // CAPA
  create_capa: z.boolean().default(true),
  capa_severity: z.enum(['minor', 'major', 'critical'] as const).optional(),
  capa_type: z.enum(['supplier', 'equipment', 'material', 'product', 'facility', 'process', 'employee', 'sanitation', 'sop_non_compliance', 'labeling', 'other'] as const).optional(),
  capa_assigned_to: z.string().optional(),
  capa_additional_notes: z.string().optional(),
});

type FailureFormValues = z.infer<typeof failureFormSchema>;

interface ProductionQAFailureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productionData: {
    production_lot_id: string;
    lot_number: string;
    product_id: string;
    product_name: string;
    product_sku: string;
    production_date: string;
    batch_size?: number;
    line_id?: string;
    line_name?: string;
    machine_id?: string;
    machine_name?: string;
    operator_id?: string;
    operator_name?: string;
    // For test failures
    test_id?: string;
    test_name?: string;
    test_type?: string;
    expected_value?: string;
    actual_value?: string;
    unit_of_measure?: string;
  };
  defaultAction?: 'hold' | 'reject';
  onConfirm: (data: {
    action_type: 'hold' | 'reject' | 'release_with_deviation';
    failure_category: ProductionFailureCategory;
    failure_reason: string;
    quantity_affected?: number;
    capa_id?: string;
  }) => Promise<void>;
}

export function ProductionQAFailureDialog({
  open,
  onOpenChange,
  productionData,
  defaultAction = 'hold',
  onConfirm,
}: ProductionQAFailureDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCapaNumber, setCreatedCapaNumber] = useState<string | null>(null);

  const { data: settings } = useProductionCapaSettings();
  const { data: profiles } = useProfiles();
  const createCapa = useCreateCapaFromProduction();

  const form = useForm<FailureFormValues>({
    resolver: zodResolver(failureFormSchema),
    defaultValues: {
      failure_category: 'other',
      failure_reason: '',
      action_type: defaultAction,
      create_capa: true,
    },
  });

  const watchedCategory = form.watch('failure_category');
  const watchedAction = form.watch('action_type');
  const watchedCreateCapa = form.watch('create_capa');

  // Determine if CAPA is required
  const capaRequired = 
    (watchedAction === 'reject' && settings?.require_capa_for_batch_rejection) ||
    (watchedAction === 'hold' && settings?.require_capa_for_batch_hold);

  // Auto-set severity and CAPA type based on category
  useEffect(() => {
    if (watchedCategory) {
      const config = PRODUCTION_FAILURE_CONFIG[watchedCategory];
      if (config) {
        form.setValue('capa_severity', config.defaultSeverity);
        form.setValue('capa_type', config.defaultCapaType as CapaType);
      }
    }
  }, [watchedCategory, form]);

  // Force CAPA checkbox if required
  useEffect(() => {
    if (capaRequired) {
      form.setValue('create_capa', true);
    }
  }, [capaRequired, form]);

  const handleSubmit = async (values: FailureFormValues) => {
    setIsSubmitting(true);
    try {
      let capaId: string | undefined;

      if (values.create_capa) {
        const failureData: ProductionQAFailureData = {
          ...productionData,
          failure_category: values.failure_category,
          failure_reason: values.failure_reason,
          quantity_affected: values.quantity_affected,
        };

        const capa = await createCapa.mutateAsync({
          failureData,
          severity: values.capa_severity,
          capaType: values.capa_type,
          additionalNotes: values.capa_additional_notes,
          assignTo: values.capa_assigned_to,
        });

        capaId = capa.id;
        setCreatedCapaNumber(capa.capa_number);
      }

      await onConfirm({
        action_type: values.action_type,
        failure_category: values.failure_category,
        failure_reason: values.failure_reason,
        quantity_affected: values.quantity_affected,
        capa_id: capaId,
      });

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
      console.error('Failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoryConfig = PRODUCTION_FAILURE_CONFIG[watchedCategory];
  const CategoryIcon = CATEGORY_ICONS[watchedCategory];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Production QA {watchedAction === 'reject' ? 'Rejection' : watchedAction === 'hold' ? 'Hold' : 'Deviation'}
          </DialogTitle>
          <DialogDescription>
            Document the quality issue for lot {productionData.lot_number}
          </DialogDescription>
        </DialogHeader>

        {createdCapaNumber && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">CAPA Created</AlertTitle>
            <AlertDescription className="text-green-700">
              {createdCapaNumber} has been created and linked to this batch.
            </AlertDescription>
          </Alert>
        )}

        {!createdCapaNumber && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Production Info */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Product:</span>
                    <span className="font-medium">{productionData.product_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lot:</span>
                    <span className="font-medium">{productionData.lot_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Production Date:</span>
                    <span className="font-medium">{productionData.production_date}</span>
                  </div>
                  {productionData.batch_size && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Batch Size:</span>
                      <span className="font-medium">{productionData.batch_size}</span>
                    </div>
                  )}
                  {productionData.test_name && (
                    <>
                      <div className="flex justify-between col-span-2">
                        <span className="text-muted-foreground">Failed Test:</span>
                        <span className="font-medium">{productionData.test_name}</span>
                      </div>
                      {productionData.expected_value && productionData.actual_value && (
                        <div className="col-span-2 text-xs text-muted-foreground">
                          Expected: {productionData.expected_value} {productionData.unit_of_measure} | 
                          Actual: {productionData.actual_value} {productionData.unit_of_measure}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Action Type */}
              <FormField
                control={form.control}
                name="action_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Action *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="hold">
                          <div className="flex items-center gap-2">
                            <Pause className="h-4 w-4 text-amber-500" />
                            Place on Hold - Pending Investigation
                          </div>
                        </SelectItem>
                        <SelectItem value="reject">
                          <div className="flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-destructive" />
                            Reject Batch - Do Not Release
                          </div>
                        </SelectItem>
                        <SelectItem value="release_with_deviation">
                          <div className="flex items-center gap-2">
                            <FileCheck className="h-4 w-4 text-blue-500" />
                            Release with Deviation - Document Only
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Failure Category */}
              <FormField
                control={form.control}
                name="failure_category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Failure Category *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(PRODUCTION_FAILURE_CONFIG).map(([value, config]) => {
                          const Icon = CATEGORY_ICONS[value as ProductionFailureCategory];
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

              {/* Failure Reason */}
              <FormField
                control={form.control}
                name="failure_reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Failure Description *</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Describe what was observed, when it was discovered, and any immediate actions taken..."
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Quantity Affected */}
              {productionData.batch_size && (
                <FormField
                  control={form.control}
                  name="quantity_affected"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity Affected</FormLabel>
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
                            of {productionData.batch_size} total
                          </span>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Leave blank if entire batch is affected
                      </FormDescription>
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
                    <Badge variant="destructive">Required for {watchedAction}</Badge>
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
                          disabled={!!capaRequired}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Create CAPA for this issue</FormLabel>
                        <FormDescription>
                          Document root cause analysis and corrective actions
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

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
                                  <SelectValue />
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
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="capa_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CAPA Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
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
                          </FormItem>
                        )}
                      />
                    </div>

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
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="capa_additional_notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional CAPA Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Initial investigation notes, suspected root cause, etc..."
                              rows={2}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant={watchedAction === 'reject' ? 'destructive' : 'default'}
                  disabled={isSubmitting}
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {watchedAction === 'reject' ? 'Reject Batch' : 
                   watchedAction === 'hold' ? 'Place on Hold' : 
                   'Document Deviation'}
                  {watchedCreateCapa && ' & Create CAPA'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
