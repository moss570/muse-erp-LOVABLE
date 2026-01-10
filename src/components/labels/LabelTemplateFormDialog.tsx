import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, QrCode, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  LabelTemplate,
  LabelType,
  useCreateLabelTemplate,
  useUpdateLabelTemplate,
  LABEL_TYPES,
  LABEL_FORMAT_PRESETS,
  BARCODE_TYPES,
} from '@/hooks/useLabelTemplates';
import { LabelDesigner } from './LabelDesigner';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  label_type: z.string().min(1, 'Label type is required'),
  label_format: z.string().min(1, 'Label format is required'),
  width_inches: z.coerce.number().min(0.5).max(12),
  height_inches: z.coerce.number().min(0.5).max(12),
  description: z.string().optional(),
  barcode_type: z.string().default('CODE128'),
  include_barcode: z.boolean().default(true),
  barcode_field: z.string().default('lot_number'),
  is_default: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

interface LabelElement {
  id: string;
  type: 'text' | 'barcode' | 'image' | 'field' | 'date';
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  textAlign?: 'left' | 'center' | 'right';
  barcodeType?: string;
  fieldKey?: string;
}

interface LabelTemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: LabelTemplate | null;
  defaultType: LabelType;
}

const BARCODE_FIELD_OPTIONS = [
  { value: 'lot_number', label: 'Lot Number' },
  { value: 'internal_lot_number', label: 'Internal Lot Number' },
  { value: 'bol_number', label: 'BOL Number' },
  { value: 'location_code', label: 'Location Code' },
  { value: 'material_code', label: 'Material Code' },
  { value: 'product_sku', label: 'Product SKU' },
  { value: 'pallet_number', label: 'Pallet Number' },
];

export function LabelTemplateFormDialog({
  open,
  onOpenChange,
  template,
  defaultType,
}: LabelTemplateFormDialogProps) {
  const [activeTab, setActiveTab] = useState<'settings' | 'design'>('settings');
  const [labelElements, setLabelElements] = useState<LabelElement[]>([]);
  
  const createMutation = useCreateLabelTemplate();
  const updateMutation = useUpdateLabelTemplate();

  const isEditing = !!template?.id;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      label_type: defaultType,
      label_format: '3x2',
      width_inches: 3,
      height_inches: 2,
      description: '',
      barcode_type: 'CODE128',
      include_barcode: true,
      barcode_field: 'lot_number',
      is_default: false,
      is_active: true,
    },
  });

  const labelFormat = form.watch('label_format');
  const includeBarcode = form.watch('include_barcode');
  const widthInches = form.watch('width_inches');
  const heightInches = form.watch('height_inches');
  const barcodeType = form.watch('barcode_type');

  useEffect(() => {
    if (template) {
      form.reset({
        name: template.name,
        label_type: template.label_type,
        label_format: template.label_format,
        width_inches: template.width_inches,
        height_inches: template.height_inches,
        description: template.description || '',
        barcode_type: template.barcode_type,
        include_barcode: template.include_barcode,
        barcode_field: template.barcode_field,
        is_default: template.is_default,
        is_active: template.is_active,
      });
      // Parse fields_config if it exists
      if (template.fields_config) {
        try {
          const config = typeof template.fields_config === 'string' 
            ? JSON.parse(template.fields_config) 
            : template.fields_config;
          if (Array.isArray(config)) {
            setLabelElements(config);
          }
        } catch {
          setLabelElements([]);
        }
      } else {
        setLabelElements([]);
      }
    } else {
      form.reset({
        name: '',
        label_type: defaultType,
        label_format: '3x2',
        width_inches: 3,
        height_inches: 2,
        description: '',
        barcode_type: 'CODE128',
        include_barcode: true,
        barcode_field: 'lot_number',
        is_default: false,
        is_active: true,
      });
      setLabelElements([]);
    }
  }, [template, defaultType, form]);

  // Update dimensions when format changes
  useEffect(() => {
    if (labelFormat && labelFormat !== 'custom') {
      const preset = LABEL_FORMAT_PRESETS[labelFormat as keyof typeof LABEL_FORMAT_PRESETS];
      if (preset) {
        form.setValue('width_inches', preset.width);
        form.setValue('height_inches', preset.height);
      }
    }
  }, [labelFormat, form]);

  const onSubmit = async (data: FormData) => {
    try {
      const fieldsConfig = JSON.stringify(labelElements);
      
      if (isEditing && template) {
        await updateMutation.mutateAsync({
          id: template.id,
          name: data.name,
          label_type: data.label_type,
          label_format: data.label_format,
          width_inches: data.width_inches,
          height_inches: data.height_inches,
          description: data.description,
          barcode_type: data.barcode_type,
          include_barcode: data.include_barcode,
          barcode_field: data.barcode_field,
          is_default: data.is_default,
          fields_config: fieldsConfig,
        });
      } else {
        await createMutation.mutateAsync({
          name: data.name,
          label_type: data.label_type,
          label_format: data.label_format,
          width_inches: data.width_inches,
          height_inches: data.height_inches,
          description: data.description,
          barcode_type: data.barcode_type,
          include_barcode: data.include_barcode,
          barcode_field: data.barcode_field,
          is_default: data.is_default,
          fields_config: fieldsConfig,
        });
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>{isEditing ? 'Edit Label Template' : 'New Label Template'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
              <div className="px-6 pt-4">
                <TabsList>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                  <TabsTrigger value="design">
                    <Palette className="h-4 w-4 mr-1" />
                    Design
                  </TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="h-[60vh]">
                <TabsContent value="settings" className="p-6 pt-4 space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Template Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Receiving Label (3x2)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="label_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Label Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {LABEL_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
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
                      name="label_format"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Label Size</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select size" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(LABEL_FORMAT_PRESETS).map(([key, preset]) => (
                                <SelectItem key={key} value={key}>
                                  {preset.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Custom Dimensions */}
                  {labelFormat === 'custom' && (
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="width_inches"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Width (inches)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.25" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="height_inches"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Height (inches)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.25" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe when this label template should be used..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Barcode Settings */}
                  <div className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <QrCode className="h-5 w-5 text-primary" />
                      <h3 className="font-medium">Barcode Settings</h3>
                    </div>

                    <FormField
                      control={form.control}
                      name="include_barcode"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <FormLabel className="font-medium">Include Barcode</FormLabel>
                            <FormDescription>
                              Add a scannable barcode to this label
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {includeBarcode && (
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="barcode_type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Barcode Type</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {BARCODE_TYPES.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
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
                          name="barcode_field"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Barcode Data Field</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {BARCODE_FIELD_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Which field value to encode in the barcode
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </div>

                  {/* Status */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="is_default"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <FormLabel>Default Template</FormLabel>
                            <FormDescription className="text-xs">
                              Use this as default for its type
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="is_active"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <FormLabel>Active</FormLabel>
                            <FormDescription className="text-xs">
                              Template is available for use
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="design" className="p-6 pt-4">
                  <LabelDesigner
                    widthInches={widthInches}
                    heightInches={heightInches}
                    elements={labelElements}
                    onChange={setLabelElements}
                    barcodeType={barcodeType}
                  />
                </TabsContent>
              </ScrollArea>
            </Tabs>

            {/* Actions */}
            <div className="flex justify-end gap-2 p-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? 'Save Changes' : 'Create Template'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
