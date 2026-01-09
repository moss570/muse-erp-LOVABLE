import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
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
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Plus, Trash2 } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Material = Tables<'materials'>;
type Unit = Tables<'units_of_measure'>;
type DropdownOption = Tables<'dropdown_options'>;
type ListedMaterial = Tables<'listed_material_names'>;

const materialFormSchema = z.object({
  // Basic Info
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  listed_material_id: z.string().optional().nullable(),
  description: z.string().optional(),
  category: z.string().optional(),
  base_unit_id: z.string().min(1, 'Base unit is required'),
  is_active: z.boolean().default(true),
  
  // Specifications Tab
  allergens: z.array(z.string()).default([]),
  food_claims: z.array(z.string()).default([]),
  receiving_temperature_min: z.coerce.number().optional().nullable(),
  receiving_temperature_max: z.coerce.number().optional().nullable(),
  storage_temperature_min: z.coerce.number().optional().nullable(),
  storage_temperature_max: z.coerce.number().optional().nullable(),
  density: z.coerce.number().optional().nullable(),
  label_copy: z.string().optional(),
  
  // Food Safety (VACCP) Tab
  country_of_origin: z.string().optional(),
  manufacturer: z.string().optional(),
  item_number: z.string().optional(),
  fraud_vulnerability_score: z.string().optional(),
  supply_chain_complexity: z.string().optional(),
  authentication_method: z.string().optional(),
  other_hazards: z.string().optional(),
  ca_prop65_prohibited: z.boolean().default(false),
  coa_required: z.boolean().default(false),
  
  // Purchasing Tab
  cost_per_base_unit: z.coerce.number().min(0).optional().nullable(),
  min_stock_level: z.coerce.number().min(0).optional().nullable(),
});

type MaterialFormData = z.infer<typeof materialFormSchema>;

interface PurchaseUnit {
  id?: string;
  unit_id: string;
  conversion_to_base: number;
  is_default: boolean;
  input_qty?: number;
}

interface MaterialFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material?: Material | null;
}

export function MaterialFormDialog({ open, onOpenChange, material }: MaterialFormDialogProps) {
  const [activeTab, setActiveTab] = useState('basic');
  const [purchaseUnits, setPurchaseUnits] = useState<PurchaseUnit[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<MaterialFormData>({
    resolver: zodResolver(materialFormSchema),
    defaultValues: {
      code: '',
      name: '',
      listed_material_id: null,
      description: '',
      category: '',
      base_unit_id: '',
      is_active: true,
      allergens: [],
      food_claims: [],
      receiving_temperature_min: null,
      receiving_temperature_max: null,
      storage_temperature_min: null,
      storage_temperature_max: null,
      density: null,
      label_copy: '',
      country_of_origin: '',
      manufacturer: '',
      item_number: '',
      fraud_vulnerability_score: '',
      supply_chain_complexity: '',
      authentication_method: '',
      other_hazards: '',
      ca_prop65_prohibited: false,
      coa_required: false,
      cost_per_base_unit: null,
      min_stock_level: null,
    },
  });

  // Fetch units
  const { data: units } = useQuery({
    queryKey: ['units'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('units_of_measure')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as Unit[];
    },
  });

  // Fetch dropdown options
  const { data: dropdownOptions } = useQuery({
    queryKey: ['dropdown-options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dropdown_options')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as DropdownOption[];
    },
  });

  // Fetch listed material names
  const { data: listedMaterials } = useQuery({
    queryKey: ['listed-material-names'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listed_material_names')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as ListedMaterial[];
    },
  });

  // Fetch existing purchase units for editing
  const { data: existingPurchaseUnits } = useQuery({
    queryKey: ['material-purchase-units', material?.id],
    queryFn: async () => {
      if (!material?.id) return [];
      const { data, error } = await supabase
        .from('material_purchase_units')
        .select('*, units_of_measure:unit_id(*)')
        .eq('material_id', material.id)
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
    enabled: !!material?.id,
  });

  // Group dropdown options by type
  const allergenOptions = dropdownOptions?.filter(o => o.dropdown_type === 'allergen') || [];
  const foodClaimOptions = dropdownOptions?.filter(o => o.dropdown_type === 'food_claim') || [];
  const fraudVulnerabilityOptions = dropdownOptions?.filter(o => o.dropdown_type === 'fraud_vulnerability') || [];
  const supplyChainOptions = dropdownOptions?.filter(o => o.dropdown_type === 'supply_chain_complexity') || [];
  const authMethodOptions = dropdownOptions?.filter(o => o.dropdown_type === 'authentication_method') || [];

  // Reset form when material changes
  useEffect(() => {
    if (material) {
      form.reset({
        code: material.code,
        name: material.name,
        listed_material_id: material.listed_material_id || null,
        description: material.description || '',
        category: material.category || '',
        base_unit_id: material.base_unit_id,
        is_active: material.is_active ?? true,
        allergens: material.allergens || [],
        food_claims: material.food_claims || [],
        receiving_temperature_min: material.receiving_temperature_min ?? null,
        receiving_temperature_max: material.receiving_temperature_max ?? null,
        storage_temperature_min: material.storage_temperature_min ?? null,
        storage_temperature_max: material.storage_temperature_max ?? null,
        density: material.density ?? null,
        label_copy: material.label_copy || '',
        country_of_origin: material.country_of_origin || '',
        manufacturer: material.manufacturer || '',
        item_number: material.item_number || '',
        fraud_vulnerability_score: material.fraud_vulnerability_score || '',
        supply_chain_complexity: material.supply_chain_complexity || '',
        authentication_method: material.authentication_method || '',
        other_hazards: material.other_hazards || '',
        ca_prop65_prohibited: material.ca_prop65_prohibited ?? false,
        coa_required: material.coa_required ?? false,
        cost_per_base_unit: material.cost_per_base_unit ?? null,
        min_stock_level: material.min_stock_level ?? null,
      });
    } else {
      form.reset();
      setPurchaseUnits([]);
    }
    setActiveTab('basic');
  }, [material, form, open]);

  // Load existing purchase units
  useEffect(() => {
    if (existingPurchaseUnits) {
      setPurchaseUnits(existingPurchaseUnits.map(pu => ({
        id: pu.id,
        unit_id: pu.unit_id,
        conversion_to_base: Number(pu.conversion_to_base),
        is_default: pu.is_default ?? false,
      })));
    }
  }, [existingPurchaseUnits]);

  const createMutation = useMutation({
    mutationFn: async (data: MaterialFormData) => {
      const { data: newMaterial, error } = await supabase
        .from('materials')
        .insert([{
          code: data.code,
          name: data.name,
          listed_material_id: data.listed_material_id || null,
          description: data.description || null,
          category: data.category || null,
          base_unit_id: data.base_unit_id,
          is_active: data.is_active,
          allergens: data.allergens.length > 0 ? data.allergens : null,
          food_claims: data.food_claims.length > 0 ? data.food_claims : null,
          receiving_temperature_min: data.receiving_temperature_min || null,
          receiving_temperature_max: data.receiving_temperature_max || null,
          storage_temperature_min: data.storage_temperature_min || null,
          storage_temperature_max: data.storage_temperature_max || null,
          density: data.density || null,
          label_copy: data.label_copy || null,
          country_of_origin: data.country_of_origin || null,
          manufacturer: data.manufacturer || null,
          item_number: data.item_number || null,
          fraud_vulnerability_score: data.fraud_vulnerability_score || null,
          supply_chain_complexity: data.supply_chain_complexity || null,
          authentication_method: data.authentication_method || null,
          other_hazards: data.other_hazards || null,
          ca_prop65_prohibited: data.ca_prop65_prohibited,
          coa_required: data.coa_required,
          cost_per_base_unit: data.cost_per_base_unit || null,
          min_stock_level: data.min_stock_level || null,
        }])
        .select()
        .single();
      if (error) throw error;
      
      // Insert purchase units
      if (purchaseUnits.length > 0 && newMaterial) {
        const { error: puError } = await supabase
          .from('material_purchase_units')
          .insert(purchaseUnits.map(pu => ({
            material_id: newMaterial.id,
            unit_id: pu.unit_id,
            conversion_to_base: pu.conversion_to_base,
            is_default: pu.is_default,
          })));
        if (puError) throw puError;
      }
      
      return newMaterial;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      toast({ title: 'Material created successfully' });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating material', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: MaterialFormData) => {
      if (!material) throw new Error('No material to update');
      
      const { error } = await supabase
        .from('materials')
        .update({
          code: data.code,
          name: data.name,
          listed_material_id: data.listed_material_id || null,
          description: data.description || null,
          category: data.category || null,
          base_unit_id: data.base_unit_id,
          is_active: data.is_active,
          allergens: data.allergens.length > 0 ? data.allergens : null,
          food_claims: data.food_claims.length > 0 ? data.food_claims : null,
          receiving_temperature_min: data.receiving_temperature_min || null,
          receiving_temperature_max: data.receiving_temperature_max || null,
          storage_temperature_min: data.storage_temperature_min || null,
          storage_temperature_max: data.storage_temperature_max || null,
          density: data.density || null,
          label_copy: data.label_copy || null,
          country_of_origin: data.country_of_origin || null,
          manufacturer: data.manufacturer || null,
          item_number: data.item_number || null,
          fraud_vulnerability_score: data.fraud_vulnerability_score || null,
          supply_chain_complexity: data.supply_chain_complexity || null,
          authentication_method: data.authentication_method || null,
          other_hazards: data.other_hazards || null,
          ca_prop65_prohibited: data.ca_prop65_prohibited,
          coa_required: data.coa_required,
          cost_per_base_unit: data.cost_per_base_unit || null,
          min_stock_level: data.min_stock_level || null,
        })
        .eq('id', material.id);
      if (error) throw error;
      
      // Update purchase units - delete removed, insert new, update existing
      const existingIds = existingPurchaseUnits?.map(pu => pu.id) || [];
      const currentIds = purchaseUnits.filter(pu => pu.id).map(pu => pu.id!);
      const toDelete = existingIds.filter(id => !currentIds.includes(id));
      
      if (toDelete.length > 0) {
        await supabase.from('material_purchase_units').delete().in('id', toDelete);
      }
      
      for (const pu of purchaseUnits) {
        if (pu.id) {
          await supabase.from('material_purchase_units').update({
            unit_id: pu.unit_id,
            conversion_to_base: pu.conversion_to_base,
            is_default: pu.is_default,
          }).eq('id', pu.id);
        } else {
          await supabase.from('material_purchase_units').insert({
            material_id: material.id,
            unit_id: pu.unit_id,
            conversion_to_base: pu.conversion_to_base,
            is_default: pu.is_default,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['material-purchase-units'] });
      toast({ title: 'Material updated successfully' });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating material', description: error.message, variant: 'destructive' });
    },
  });

  const onSubmit = (data: MaterialFormData) => {
    if (material) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const addPurchaseUnit = () => {
    setPurchaseUnits([...purchaseUnits, { unit_id: '', conversion_to_base: 1, is_default: false }]);
  };

  const removePurchaseUnit = (index: number) => {
    setPurchaseUnits(purchaseUnits.filter((_, i) => i !== index));
  };

  const updatePurchaseUnit = (index: number, field: keyof PurchaseUnit, value: string | number | boolean) => {
    setPurchaseUnits(purchaseUnits.map((pu, i) => 
      i === index ? { ...pu, [field]: value } : pu
    ));
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{material ? 'Edit Material' : 'Add New Material'}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="specifications">Specifications</TabsTrigger>
                <TabsTrigger value="food-safety">Food Safety</TabsTrigger>
                <TabsTrigger value="purchasing">Purchasing</TabsTrigger>
              </TabsList>

              {/* Basic Info Tab */}
              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Code *</FormLabel>
                        <FormControl>
                          <Input placeholder="MAT-001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Material name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="listed_material_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Listed Material Name</FormLabel>
                      <Select 
                        onValueChange={(val) => field.onChange(val === '__none__' ? null : val)} 
                        value={field.value || '__none__'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select listed material (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {listedMaterials?.map((lm) => (
                            <SelectItem key={lm.id} value={lm.id}>
                              {lm.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Link to a standardized material name for reporting
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Material description..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <FormControl>
                          <Input placeholder="Dairy, Packaging, etc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="base_unit_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Purchase Unit *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {units?.map((unit) => (
                              <SelectItem key={unit.id} value={unit.id}>
                                {unit.name} ({unit.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Unit used when purchasing from suppliers and receiving inventory
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="!mt-0">Active</FormLabel>
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* Specifications Tab */}
              <TabsContent value="specifications" className="space-y-6 mt-4">
                {/* Allergens */}
                <FormField
                  control={form.control}
                  name="allergens"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Allergens</FormLabel>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {allergenOptions.map((option) => (
                          <label
                            key={option.id}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border cursor-pointer transition-colors ${
                              field.value.includes(option.value)
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-card hover:bg-accent border-border'
                            }`}
                          >
                            <Checkbox
                              checked={field.value.includes(option.value)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  field.onChange([...field.value, option.value]);
                                } else {
                                  field.onChange(field.value.filter((v: string) => v !== option.value));
                                }
                              }}
                              className="sr-only"
                            />
                            <span className="text-sm">{option.label}</span>
                          </label>
                        ))}
                      </div>
                      {field.value.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {field.value.map((val: string) => {
                            const option = allergenOptions.find(o => o.value === val);
                            return (
                              <Badge key={val} variant="secondary" className="gap-1">
                                {option?.label || val}
                                <X
                                  className="h-3 w-3 cursor-pointer"
                                  onClick={() => field.onChange(field.value.filter((v: string) => v !== val))}
                                />
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                    </FormItem>
                  )}
                />

                {/* Food Claims */}
                <FormField
                  control={form.control}
                  name="food_claims"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Food Claims</FormLabel>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {foodClaimOptions.map((option) => (
                          <label
                            key={option.id}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border cursor-pointer transition-colors ${
                              field.value.includes(option.value)
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-card hover:bg-accent border-border'
                            }`}
                          >
                            <Checkbox
                              checked={field.value.includes(option.value)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  field.onChange([...field.value, option.value]);
                                } else {
                                  field.onChange(field.value.filter((v: string) => v !== option.value));
                                }
                              }}
                              className="sr-only"
                            />
                            <span className="text-sm">{option.label}</span>
                          </label>
                        ))}
                      </div>
                    </FormItem>
                  )}
                />

                {/* Temperature Controls */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">Receiving Temperature (°F)</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={form.control}
                        name="receiving_temperature_min"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">Min</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="Min" {...field} value={field.value ?? ''} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="receiving_temperature_max"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">Max</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="Max" {...field} value={field.value ?? ''} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">Storage Temperature (°F)</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={form.control}
                        name="storage_temperature_min"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">Min</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="Min" {...field} value={field.value ?? ''} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="storage_temperature_max"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">Max</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="Max" {...field} value={field.value ?? ''} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="density"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Density (g/mL)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.001" placeholder="1.000" {...field} value={field.value ?? ''} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="label_copy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Label Copy / Ingredient Statement</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Text as it appears on ingredient label..." {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* Food Safety (VACCP) Tab */}
              <TabsContent value="food-safety" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="country_of_origin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country of Origin</FormLabel>
                        <FormControl>
                          <Input placeholder="USA" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="manufacturer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Manufacturer</FormLabel>
                        <FormControl>
                          <Input placeholder="Manufacturer name" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="item_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manufacturer Item Number</FormLabel>
                      <FormControl>
                        <Input placeholder="MFR-12345" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="fraud_vulnerability_score"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fraud Vulnerability Score</FormLabel>
                        <Select 
                          onValueChange={(val) => field.onChange(val === '__none__' ? '' : val)} 
                          value={field.value || '__none__'}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select score" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none__">None</SelectItem>
                            {fraudVulnerabilityOptions.map((option) => (
                              <SelectItem key={option.id} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="supply_chain_complexity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Supply Chain Complexity</FormLabel>
                        <Select 
                          onValueChange={(val) => field.onChange(val === '__none__' ? '' : val)} 
                          value={field.value || '__none__'}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select complexity" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none__">None</SelectItem>
                            {supplyChainOptions.map((option) => (
                              <SelectItem key={option.id} value={option.value}>
                                {option.label}
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
                  name="authentication_method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Authentication Method</FormLabel>
                      <Select 
                        onValueChange={(val) => field.onChange(val === '__none__' ? '' : val)} 
                        value={field.value || '__none__'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {authMethodOptions.map((option) => (
                            <SelectItem key={option.id} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="other_hazards"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Other Hazards / Notes</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Any other food safety concerns..." {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex flex-wrap gap-6">
                  <FormField
                    control={form.control}
                    name="ca_prop65_prohibited"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="!mt-0">CA Prop 65 Prohibited</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="coa_required"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="!mt-0">COA Required on Receipt</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* Purchasing Tab */}
              <TabsContent value="purchasing" className="space-y-6 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="cost_per_base_unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cost per Base Unit ($)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="min_stock_level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum Stock Level</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" {...field} value={field.value ?? ''} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Purchase Units */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Purchase Units</h4>
                      <p className="text-sm text-muted-foreground">
                        Define how this material can be purchased and the conversion to inventory unit
                      </p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addPurchaseUnit}>
                      <Plus className="h-4 w-4 mr-1" /> Add Unit
                    </Button>
                  </div>

                  {purchaseUnits.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border rounded-md bg-muted/20">
                      No purchase units defined. Click "Add Unit" to add one.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {purchaseUnits.map((pu, index) => {
                        const selectedUnit = units?.find(u => u.id === pu.unit_id);
                        const baseUnit = units?.find(u => u.id === form.watch('base_unit_id'));
                        const isWeightUnit = selectedUnit?.unit_type === 'weight';
                        const baseIsKg = baseUnit?.code === 'KG';
                        
                        // Weight conversion factors to KG
                        const weightToKg: Record<string, number> = {
                          'LB': 0.453592,
                          'OZ': 0.0283495,
                          'G': 0.001,
                          'KG': 1,
                        };
                        
                        const canAutoConvert = isWeightUnit && baseIsKg && selectedUnit?.code && weightToKg[selectedUnit.code];
                        
                        return (
                          <div key={index} className="flex flex-col gap-2 p-3 border rounded-md bg-card">
                            <div className="flex items-center gap-3">
                              <Select
                                value={pu.unit_id}
                                onValueChange={(value) => {
                                  const newUnit = units?.find(u => u.id === value);
                                  updatePurchaseUnit(index, 'unit_id', value);
                                  
                                  // Auto-calculate conversion if weight unit to KG
                                  if (newUnit?.unit_type === 'weight' && baseIsKg && newUnit.code && weightToKg[newUnit.code]) {
                                    updatePurchaseUnit(index, 'conversion_to_base', weightToKg[newUnit.code]);
                                  }
                                }}
                              >
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue placeholder="Select unit" />
                                </SelectTrigger>
                                <SelectContent>
                                  {units?.map((unit) => (
                                    <SelectItem key={unit.id} value={unit.id}>
                                      {unit.name} ({unit.code})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <span className="text-muted-foreground">=</span>
                              {canAutoConvert ? (
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    step="0.001"
                                    className="w-24"
                                    placeholder="Qty"
                                    value={pu.input_qty || 1}
                                    onChange={(e) => {
                                      const qty = parseFloat(e.target.value) || 1;
                                      updatePurchaseUnit(index, 'input_qty', qty);
                                      const factor = weightToKg[selectedUnit!.code!] || 1;
                                      updatePurchaseUnit(index, 'conversion_to_base', qty * factor);
                                    }}
                                  />
                                  <span className="text-muted-foreground text-sm">{selectedUnit?.code}</span>
                                  <span className="text-muted-foreground">=</span>
                                  <span className="font-medium text-sm min-w-[60px]">
                                    {pu.conversion_to_base?.toFixed(4)} {baseUnit?.code}
                                  </span>
                                </div>
                              ) : (
                                <>
                                  <Input
                                    type="number"
                                    step="0.001"
                                    className="w-24"
                                    value={pu.conversion_to_base}
                                    onChange={(e) => updatePurchaseUnit(index, 'conversion_to_base', parseFloat(e.target.value) || 0)}
                                  />
                                  <span className="text-muted-foreground text-sm">
                                    {baseUnit?.code || 'base units'}
                                  </span>
                                </>
                              )}
                              <label className="flex items-center gap-1.5 ml-auto">
                                <Checkbox
                                  checked={pu.is_default}
                                  onCheckedChange={(checked) => updatePurchaseUnit(index, 'is_default', !!checked)}
                                />
                                <span className="text-sm">Default</span>
                              </label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => removePurchaseUnit(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            {canAutoConvert && (
                              <p className="text-xs text-muted-foreground ml-1">
                                Auto-calculated: 1 {selectedUnit?.code} = {weightToKg[selectedUnit!.code!]} KG
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {material ? 'Update' : 'Create'} Material
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
