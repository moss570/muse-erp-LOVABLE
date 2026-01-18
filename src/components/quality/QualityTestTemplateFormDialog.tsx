import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  useCreateQualityTestTemplate,
  useUpdateQualityTestTemplate,
  useGenerateTestCode,
  TEST_CATEGORIES,
  PARAMETER_TYPES,
  APPLICABLE_STAGES,
  QualityTestTemplate,
} from '@/hooks/useQualityTests';
import { useProductCategories } from '@/hooks/useProductCategories';
import { useFormDialogUnsavedChanges } from '@/hooks/useFormDialogUnsavedChanges';
import { UnsavedChangesDialog } from '@/components/ui/staged-edit';

const formSchema = z.object({
  test_name: z.string().min(1, 'Test name is required'),
  test_code: z.string().min(1, 'Test code is required'),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  test_method: z.string().nullable().optional(),
  parameter_type: z.string().min(1, 'Parameter type is required'),
  target_value: z.string().nullable().optional(),
  min_value: z.number().nullable().optional(),
  max_value: z.number().nullable().optional(),
  uom: z.string().nullable().optional(),
  required_equipment: z.string().nullable().optional(),
  typical_duration_minutes: z.number().nullable().optional(),
  applicable_stages: z.array(z.string()).nullable().optional(),
  default_for_category_ids: z.array(z.string()).nullable().optional(),
  is_critical: z.boolean().default(false),
  is_active: z.boolean().default(true),
  sort_order: z.number().default(0),
});

type FormData = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: QualityTestTemplate | null;
}

export function QualityTestTemplateFormDialog({ open, onOpenChange, template }: Props) {
  const isEditing = !!template;
  const createTemplate = useCreateQualityTestTemplate();
  const updateTemplate = useUpdateQualityTestTemplate();
  const { activeCategories } = useProductCategories();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      test_name: '',
      test_code: '',
      description: null,
      category: null,
      test_method: null,
      parameter_type: 'numeric',
      target_value: null,
      min_value: null,
      max_value: null,
      uom: null,
      required_equipment: null,
      typical_duration_minutes: null,
      applicable_stages: [],
      default_for_category_ids: [],
      is_critical: false,
      is_active: true,
      sort_order: 0,
    },
  });

  const selectedCategory = form.watch('category');
  const parameterType = form.watch('parameter_type');
  const { data: generatedCode } = useGenerateTestCode(selectedCategory);

  // Auto-fill generated code when category changes
  useEffect(() => {
    if (!isEditing && generatedCode && !form.getValues('test_code')) {
      form.setValue('test_code', generatedCode);
    }
  }, [generatedCode, isEditing, form]);

  // Reset form when template changes
  useEffect(() => {
    if (template) {
      form.reset({
        test_name: template.test_name,
        test_code: template.test_code,
        description: template.description,
        category: template.category,
        test_method: template.test_method,
        parameter_type: template.parameter_type,
        target_value: template.target_value,
        min_value: template.min_value,
        max_value: template.max_value,
        uom: template.uom,
        required_equipment: template.required_equipment,
        typical_duration_minutes: template.typical_duration_minutes,
        applicable_stages: template.applicable_stages || [],
        default_for_category_ids: template.default_for_category_ids || [],
        is_critical: template.is_critical,
        is_active: template.is_active,
        sort_order: template.sort_order,
      });
    } else {
      form.reset({
        test_name: '',
        test_code: '',
        description: null,
        category: null,
        test_method: null,
        parameter_type: 'numeric',
        target_value: null,
        min_value: null,
        max_value: null,
        uom: null,
        required_equipment: null,
        typical_duration_minutes: null,
        applicable_stages: [],
        default_for_category_ids: [],
        is_critical: false,
        is_active: true,
        sort_order: 0,
      });
    }
  }, [template, form]);

  const onSubmit = async (data: FormData) => {
    try {
      if (isEditing && template) {
        await updateTemplate.mutateAsync({ 
          id: template.id, 
          test_name: data.test_name,
          test_code: data.test_code,
          parameter_type: data.parameter_type,
          ...data 
        });
      } else {
        await createTemplate.mutateAsync({
          test_name: data.test_name,
          test_code: data.test_code,
          parameter_type: data.parameter_type,
          ...data
        });
      }
      onOpenChange(false);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleStageToggle = (stage: string) => {
    const current = form.getValues('applicable_stages') || [];
    if (current.includes(stage)) {
      form.setValue('applicable_stages', current.filter((s) => s !== stage));
    } else {
      form.setValue('applicable_stages', [...current, stage]);
    }
  };

  const handleCategoryDefaultToggle = (categoryId: string) => {
    const current = form.getValues('default_for_category_ids') || [];
    if (current.includes(categoryId)) {
      form.setValue('default_for_category_ids', current.filter((id) => id !== categoryId));
    } else {
      form.setValue('default_for_category_ids', [...current, categoryId]);
    }
  };

  const {
    showUnsavedChangesDialog,
    setShowUnsavedChangesDialog,
    handleDialogOpenChange,
    handleDiscardChanges,
    handleSaveAndClose,
  } = useFormDialogUnsavedChanges({
    form,
    onOpenChange,
    onSave: async () => {
      await form.handleSubmit(onSubmit)();
    },
  });

  return (
    <>
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Test Template' : 'Create Test Template'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the quality test template details'
              : 'Create a new reusable quality test template'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Basic Information</h3>
              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="test_name"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Test Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Brix Level Check" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        value={field.value || ''}
                        onValueChange={(value) => field.onChange(value || null)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TEST_CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
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
                  name="test_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Test Code *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., PHY-0001" {...field} />
                      </FormControl>
                      <FormDescription>
                        Auto-generated or enter manually
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Brief description of the test..."
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Test Parameters Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Test Parameters</h3>
              <Separator />

              <FormField
                control={form.control}
                name="parameter_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parameter Type *</FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="grid grid-cols-2 gap-4"
                      >
                        {PARAMETER_TYPES.map((type) => (
                          <div key={type.value} className="flex items-center space-x-2">
                            <RadioGroupItem value={type.value} id={type.value} />
                            <Label htmlFor={type.value}>{type.label}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="target_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Value</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., 32"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {(parameterType === 'numeric' || parameterType === 'range') && (
                  <>
                    <FormField
                      control={form.control}
                      name="min_value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Min Value</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="any"
                              placeholder="e.g., 30"
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value ? parseFloat(e.target.value) : null
                                )
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="max_value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Value</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="any"
                              placeholder="e.g., 34"
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value ? parseFloat(e.target.value) : null
                                )
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                <FormField
                  control={form.control}
                  name="uom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit of Measure</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., °Brix, °F, CFU/g"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Test Execution Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Test Execution</h3>
              <Separator />

              <FormField
                control={form.control}
                name="test_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Test Method / Procedure</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Detailed procedure for conducting the test..."
                        rows={4}
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="required_equipment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Required Equipment</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Refractometer, pH Meter"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="typical_duration_minutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Typical Duration (minutes)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 5"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseInt(e.target.value, 10) : null
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Application Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Application</h3>
              <Separator />

              <FormField
                control={form.control}
                name="applicable_stages"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Applicable Stages</FormLabel>
                    <div className="flex gap-6">
                      {APPLICABLE_STAGES.map((stage) => (
                        <div key={stage.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`stage-${stage.value}`}
                            checked={(field.value || []).includes(stage.value)}
                            onCheckedChange={() => handleStageToggle(stage.value)}
                          />
                          <Label htmlFor={`stage-${stage.value}`}>{stage.label}</Label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Default for Product Categories */}
              <FormField
                control={form.control}
                name="default_for_category_ids"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default for Product Categories</FormLabel>
                    <FormDescription>
                      When products in these categories are created, this test will be suggested as a default
                    </FormDescription>
                    <div className="flex flex-wrap gap-3 mt-2">
                      {activeCategories.map((cat) => (
                        <div key={cat.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`cat-${cat.id}`}
                            checked={(field.value || []).includes(cat.id)}
                            onCheckedChange={() => handleCategoryDefaultToggle(cat.id)}
                          />
                          <Label htmlFor={`cat-${cat.id}`}>{cat.name}</Label>
                        </div>
                      ))}
                      {activeCategories.length === 0 && (
                        <span className="text-sm text-muted-foreground">No product categories available</span>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-8">
                <FormField
                  control={form.control}
                  name="is_critical"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Critical Control Point (CCP)</FormLabel>
                        <FormDescription>
                          Mark if this is a critical safety test
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Active</FormLabel>
                        <FormDescription>
                          Only active tests can be selected
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createTemplate.isPending || updateTemplate.isPending}
              >
                {createTemplate.isPending || updateTemplate.isPending
                  ? 'Saving...'
                  : isEditing
                  ? 'Update Template'
                  : 'Create Template'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
    
    <UnsavedChangesDialog
      open={showUnsavedChangesDialog}
      onOpenChange={setShowUnsavedChangesDialog}
      onDiscard={handleDiscardChanges}
      onKeepEditing={() => setShowUnsavedChangesDialog(false)}
      onSaveAndClose={handleSaveAndClose}
      showSaveOption={true}
      isSaving={createTemplate.isPending || updateTemplate.isPending}
    />
    </>
  );
}
