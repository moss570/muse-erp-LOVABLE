import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useCreateNonConformity, useUpdateNonConformity, useNonConformity } from '@/hooks/useNonConformities';
import { NC_TYPE_CONFIG, IMPACT_LEVEL_CONFIG, SEVERITY_CONFIG, DISPOSITION_CONFIG, NCType, ImpactLevel, NCSeverity, NCDisposition } from '@/types/non-conformities';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  nc_type: z.string().min(1, 'Type is required'),
  impact_level: z.string().min(1, 'Impact level is required'),
  severity: z.string().min(1, 'Severity is required'),
  disposition: z.string().optional(),
  disposition_justification: z.string().optional(),
  discovery_location_id: z.string().optional(),
  shift: z.string().optional(),
  specification_reference: z.string().optional(),
  quantity_affected: z.coerce.number().optional(),
  quantity_affected_unit: z.string().optional(),
  material_id: z.string().optional(),
  product_id: z.string().optional(),
  supplier_id: z.string().optional(),
  estimated_cost: z.coerce.number().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface NCFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editId?: string | null;
}

export function NCFormDialog({ open, onOpenChange, editId }: NCFormDialogProps) {
  const createNC = useCreateNonConformity();
  const updateNC = useUpdateNonConformity();
  const { data: existingNC } = useNonConformity(editId || null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      nc_type: '',
      impact_level: '',
      severity: '',
      disposition: 'pending',
      disposition_justification: '',
      discovery_location_id: '',
      shift: '',
      specification_reference: '',
      quantity_affected: undefined,
      quantity_affected_unit: '',
      material_id: '',
      product_id: '',
      supplier_id: '',
      estimated_cost: undefined,
    },
  });

  // Load existing data when editing
  useEffect(() => {
    if (existingNC && editId) {
      form.reset({
        title: existingNC.title,
        description: existingNC.description,
        nc_type: existingNC.nc_type,
        impact_level: existingNC.impact_level,
        severity: existingNC.severity,
        disposition: existingNC.disposition,
        disposition_justification: existingNC.disposition_justification || '',
        discovery_location_id: existingNC.discovery_location_id || '',
        shift: existingNC.shift || '',
        specification_reference: existingNC.specification_reference || '',
        quantity_affected: existingNC.quantity_affected || undefined,
        quantity_affected_unit: existingNC.quantity_affected_unit || '',
        material_id: existingNC.material_id || '',
        product_id: existingNC.product_id || '',
        supplier_id: existingNC.supplier_id || '',
        estimated_cost: existingNC.estimated_cost || undefined,
      });
    }
  }, [existingNC, editId, form]);

  // Fetch reference data
  const { data: locations } = useQuery({
    queryKey: ['locations-list'],
    queryFn: async () => {
      const { data } = await supabase.from('locations').select('id, name').order('name');
      return data || [];
    },
  });

  const { data: materials } = useQuery({
    queryKey: ['materials-list'],
    queryFn: async () => {
      const { data } = await supabase.from('materials').select('id, name, code').order('name').limit(100);
      return data || [];
    },
  });

  const { data: products } = useQuery({
    queryKey: ['products-list'],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('id, name, sku').order('name').limit(100);
      return data || [];
    },
  });

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-list'],
    queryFn: async () => {
      const { data } = await supabase.from('suppliers').select('id, name, code').order('name').limit(100);
      return data || [];
    },
  });

  const onSubmit = async (values: FormValues) => {
    const data = {
      title: values.title,
      description: values.description,
      nc_type: values.nc_type as NCType,
      impact_level: values.impact_level as ImpactLevel,
      severity: values.severity as NCSeverity,
      disposition: (values.disposition || 'pending') as NCDisposition,
      disposition_justification: values.disposition_justification || null,
      discovery_location_id: values.discovery_location_id || null,
      shift: values.shift || null,
      specification_reference: values.specification_reference || null,
      quantity_affected: values.quantity_affected || null,
      quantity_affected_unit: values.quantity_affected_unit || null,
      material_id: values.material_id || null,
      product_id: values.product_id || null,
      supplier_id: values.supplier_id || null,
      estimated_cost: values.estimated_cost || null,
    };

    if (editId) {
      await updateNC.mutateAsync({ id: editId, updates: data });
    } else {
      await createNC.mutateAsync(data);
    }
    onOpenChange(false);
    form.reset();
  };

  const isSubmitting = createNC.isPending || updateNC.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editId ? 'Edit Non-Conformity' : 'Report Non-Conformity'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="Brief description of the issue" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Classification Row */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="nc_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(NC_TYPE_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key}>{config.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="impact_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Impact Level *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select impact" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(IMPACT_LEVEL_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key}>{config.label}</SelectItem>
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select severity" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(SEVERITY_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key}>{config.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Detailed description of the non-conformity..." 
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Location & Shift */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="discovery_location_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {locations?.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="shift"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shift</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select shift" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="day">Day Shift</SelectItem>
                        <SelectItem value="night">Night Shift</SelectItem>
                        <SelectItem value="swing">Swing Shift</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Affected Items */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="material_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Material</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select material" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {materials?.map((mat) => (
                          <SelectItem key={mat.id} value={mat.id}>
                            {mat.code} - {mat.name}
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
                name="product_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {products?.map((prod) => (
                          <SelectItem key={prod.id} value={prod.id}>
                            {prod.sku} - {prod.name}
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
                name="supplier_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select supplier" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {suppliers?.map((sup) => (
                          <SelectItem key={sup.id} value={sup.id}>
                            {sup.code} - {sup.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Quantity & Specification */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="quantity_affected"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity Affected</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantity_affected_unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <FormControl>
                      <Input placeholder="kg, cases, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estimated_cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Cost ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Specification Reference */}
            <FormField
              control={form.control}
              name="specification_reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Specification Reference</FormLabel>
                  <FormControl>
                    <Input placeholder="SOP, specification, or standard violated" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Disposition */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="disposition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Disposition</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select disposition" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(DISPOSITION_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key}>{config.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="disposition_justification"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Disposition Justification</FormLabel>
                    <FormControl>
                      <Input placeholder="Reason for disposition decision" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editId ? 'Update' : 'Create'} Non-Conformity
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
