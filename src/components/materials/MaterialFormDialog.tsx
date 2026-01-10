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
import { X, Plus, Trash2, PlusCircle, Star, Upload, FileText, Download, Eye, AlertTriangle, ImageIcon } from 'lucide-react';
import { CreateUnitDialog } from './CreateUnitDialog';
import type { Tables } from '@/integrations/supabase/types';
import { differenceInMonths } from 'date-fns';

type Material = Tables<'materials'>;
type Unit = Tables<'units_of_measure'>;
type DropdownOption = Tables<'dropdown_options'>;
type ListedMaterial = Tables<'listed_material_names'>;
type Supplier = Tables<'suppliers'>;
type DocumentRequirement = Tables<'document_requirements'>;
type MaterialDocument = Tables<'material_documents'>;

// Category options with their code prefixes
const MATERIAL_CATEGORIES = [
  { value: 'Ingredients', prefix: 'ING' },
  { value: 'Packaging', prefix: 'PAC' },
  { value: 'Boxes', prefix: 'BOX' },
  { value: 'Chemical', prefix: 'CHE' },
  { value: 'Supplies', prefix: 'SUP' },
  { value: 'Maintenance', prefix: 'MAI' },
  { value: 'Direct Sale', prefix: 'DIR' },
] as const;

// Categories that show food-related specs
const FOOD_CATEGORIES = ['Ingredients', 'Direct Sale'];
// Categories that show packaging-related specs  
const PACKAGING_CATEGORIES = ['Packaging', 'Boxes'];
// Categories that show chemical/supply specs
const INDUSTRIAL_CATEGORIES = ['Chemical', 'Supplies', 'Maintenance'];

const materialFormSchema = z.object({
  // Basic Info
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  listed_material_id: z.string().optional().nullable(),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  sub_category: z.string().optional().nullable(),
  base_unit_id: z.string().min(1, 'Purchase unit is required'),
  usage_unit_id: z.string().optional().nullable(),
  usage_unit_conversion: z.coerce.number().min(0).optional().nullable(),
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
  
  // Removed from Basic Info - now on Suppliers tab only
  min_stock_level: z.coerce.number().min(0).optional().nullable(),
});

type MaterialFormData = z.infer<typeof materialFormSchema>;

interface UnitVariant {
  id?: string;
  code: string;
  unit_id: string;
  conversion_to_base: number;
  is_default: boolean;
  item_number?: string;
  photo_path?: string;
  photo_url?: string;
  photo_added_at?: string;
  photo_file?: File;
}

interface MaterialSupplier {
  id?: string;
  supplier_id: string;
  is_primary: boolean;
  supplier_item_number?: string;
  cost_per_unit?: number;
  unit_id?: string;
  purchase_unit_id?: string;
  lead_time_days?: number;
  min_order_quantity?: number;
  notes?: string;
  is_active: boolean;
  is_manufacturer?: boolean;
}

interface DocumentUpload {
  id?: string;
  document_name: string;
  requirement_id?: string;
  file?: File;
  file_path?: string;
  file_url?: string;
  date_published?: string;
  date_reviewed?: string;
  isNew: boolean;
}

interface MaterialFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material?: Material | null;
}

export function MaterialFormDialog({ open, onOpenChange, material }: MaterialFormDialogProps) {
  const [activeTab, setActiveTab] = useState('basic');
  const [unitVariants, setUnitVariants] = useState<UnitVariant[]>([]);
  const [materialSuppliers, setMaterialSuppliers] = useState<MaterialSupplier[]>([]);
  const [documents, setDocuments] = useState<DocumentUpload[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [createUnitOpen, setCreateUnitOpen] = useState(false);
  const [pendingUnitField, setPendingUnitField] = useState<'base_unit_id' | 'usage_unit_id' | 'supplier' | number | null>(null);
  const [pendingSupplierIndex, setPendingSupplierIndex] = useState<number | null>(null);
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
      sub_category: null,
      base_unit_id: '',
      usage_unit_id: null,
      usage_unit_conversion: null,
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

  // Fetch suppliers (all active for supplier assignment)
  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as Supplier[];
    },
  });

  // Fetch manufacturers (suppliers that are manufacturer or manufacturer_distributor)
  const { data: manufacturers } = useQuery({
    queryKey: ['suppliers-manufacturers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('is_active', true)
        .in('supplier_type', ['manufacturer', 'manufacturer_distributor'])
        .order('name');
      if (error) throw error;
      return data as Supplier[];
    },
  });

  // Fetch sub-categories
  const { data: subCategories } = useQuery({
    queryKey: ['material-sub-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('material_sub_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
        .order('name');
      if (error) throw error;
      return data as { id: string; category: string; name: string }[];
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

  // Fetch existing material suppliers for editing
  const { data: existingMaterialSuppliers } = useQuery({
    queryKey: ['material-suppliers', material?.id],
    queryFn: async () => {
      if (!material?.id) return [];
      const { data, error } = await supabase
        .from('material_suppliers')
        .select('*')
        .eq('material_id', material.id)
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
    enabled: !!material?.id,
  });

  // Fetch document requirements
  const { data: documentRequirements } = useQuery({
    queryKey: ['document-requirements', 'materials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_requirements')
        .select('*')
        .contains('areas', ['materials'])
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  // Fetch existing material documents for editing
  const { data: existingDocuments } = useQuery({
    queryKey: ['material-documents', material?.id],
    queryFn: async () => {
      if (!material?.id) return [];
      const { data, error } = await supabase
        .from('material_documents')
        .select('*')
        .eq('material_id', material.id);
      if (error) throw error;
      return data as MaterialDocument[];
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
        sub_category: (material as any).sub_category || null,
        base_unit_id: material.base_unit_id,
        usage_unit_id: material.usage_unit_id || null,
        usage_unit_conversion: material.usage_unit_conversion ?? null,
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
        min_stock_level: material.min_stock_level ?? null,
      });
    } else {
      form.reset({
        ...form.formState.defaultValues,
        code: '',
        category: '',
      } as MaterialFormData);
      setUnitVariants([]);
      setMaterialSuppliers([]);
      setDocuments([]);
    }
    setActiveTab('basic');
  }, [material, form, open]);

  // Load existing unit variants (purchase units)
  useEffect(() => {
    if (existingPurchaseUnits) {
      setUnitVariants(existingPurchaseUnits.map(pu => ({
        id: pu.id,
        code: (pu as any).code || '',
        unit_id: pu.unit_id,
        conversion_to_base: Number(pu.conversion_to_base),
        is_default: pu.is_default ?? false,
        item_number: (pu as any).item_number || undefined,
        photo_path: (pu as any).photo_path || undefined,
        photo_url: (pu as any).photo_url || undefined,
        photo_added_at: (pu as any).photo_added_at || undefined,
      })));
    }
  }, [existingPurchaseUnits]);

  // Load existing material suppliers
  useEffect(() => {
    if (existingMaterialSuppliers) {
      setMaterialSuppliers(existingMaterialSuppliers.map(ms => ({
        id: ms.id,
        supplier_id: ms.supplier_id,
        is_primary: ms.is_primary ?? false,
        supplier_item_number: ms.supplier_item_number || undefined,
        cost_per_unit: ms.cost_per_unit ? Number(ms.cost_per_unit) : undefined,
        unit_id: ms.unit_id || undefined,
        purchase_unit_id: (ms as any).purchase_unit_id || undefined,
        lead_time_days: ms.lead_time_days ?? undefined,
        min_order_quantity: ms.min_order_quantity ? Number(ms.min_order_quantity) : undefined,
        notes: ms.notes || undefined,
        is_active: ms.is_active ?? true,
      })));
    }
  }, [existingMaterialSuppliers]);

  // Load existing documents
  useEffect(() => {
    if (existingDocuments) {
      setDocuments(existingDocuments.map(doc => ({
        id: doc.id,
        document_name: doc.document_name,
        requirement_id: doc.requirement_id || undefined,
        file_path: doc.file_path || undefined,
        file_url: doc.file_url || undefined,
        date_published: doc.date_published || undefined,
        date_reviewed: doc.date_reviewed || undefined,
        isNew: false,
      })));
    }
  }, [existingDocuments]);

  // Auto-populate suppliers when manufacturer is selected (Logic A)
  const autoPopulateSuppliersForManufacturer = (manufacturerId: string, manufacturerItemNumber: string | undefined) => {
    const manufacturer = suppliers?.find(s => s.id === manufacturerId);
    if (!manufacturer || manufacturer.supplier_type !== 'manufacturer_distributor') return;

    // Get the base unit and all unit variants
    const baseUnitId = form.getValues('base_unit_id');
    const mainItemNumber = form.getValues('item_number');

    // Remove any existing entries for this manufacturer
    const filteredSuppliers = materialSuppliers.filter(ms => ms.supplier_id !== manufacturerId);
    
    const newSupplierEntries: MaterialSupplier[] = [];

    // Add entry for default unit (no purchase_unit_id means default)
    newSupplierEntries.push({
      supplier_id: manufacturerId,
      is_primary: filteredSuppliers.length === 0,
      supplier_item_number: mainItemNumber || manufacturerItemNumber,
      unit_id: baseUnitId || undefined,
      purchase_unit_id: undefined,
      is_active: true,
      is_manufacturer: true,
    });

    // Add entries for each unit variant
    unitVariants.forEach(uv => {
      newSupplierEntries.push({
        supplier_id: manufacturerId,
        is_primary: false,
        supplier_item_number: uv.item_number || mainItemNumber || manufacturerItemNumber,
        unit_id: uv.unit_id || undefined,
        purchase_unit_id: uv.id,
        is_active: true,
        is_manufacturer: true,
      });
    });

    setMaterialSuppliers([...filteredSuppliers, ...newSupplierEntries]);
  };

  const uploadUnitVariantPhotos = async (materialId: string) => {
    for (let i = 0; i < unitVariants.length; i++) {
      const uv = unitVariants[i];
      if (!uv.photo_file) continue;

      const fileExt = uv.photo_file.name.split('.').pop();
      const filePath = `${materialId}/${Date.now()}-${uv.code}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('material-photos')
        .upload(filePath, uv.photo_file);

      if (uploadError) {
        toast({ title: 'Error uploading photo', description: uploadError.message, variant: 'destructive' });
        continue;
      }

      const { data: urlData } = supabase.storage
        .from('material-photos')
        .getPublicUrl(filePath);

      unitVariants[i] = {
        ...uv,
        photo_path: filePath,
        photo_url: urlData.publicUrl,
        photo_added_at: new Date().toISOString(),
        photo_file: undefined,
      };
    }
  };

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
          sub_category: data.sub_category || null,
          base_unit_id: data.base_unit_id,
          usage_unit_id: data.usage_unit_id || null,
          usage_unit_conversion: data.usage_unit_conversion || null,
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
          cost_per_base_unit: null, // Cost is now on suppliers
          min_stock_level: data.min_stock_level || null,
        }])
        .select()
        .single();
      if (error) throw error;
      
      // Upload photos first
      await uploadUnitVariantPhotos(newMaterial.id);
      
      // Insert unit variants (purchase units)
      if (unitVariants.length > 0 && newMaterial) {
        const { error: puError } = await supabase
          .from('material_purchase_units')
          .insert(unitVariants.map(uv => ({
            material_id: newMaterial.id,
            code: uv.code,
            unit_id: uv.unit_id,
            conversion_to_base: uv.conversion_to_base,
            is_default: uv.is_default,
            item_number: uv.item_number || null,
            photo_path: uv.photo_path || null,
            photo_url: uv.photo_url || null,
            photo_added_at: uv.photo_added_at || null,
          })));
        if (puError) throw puError;
      }
      
      // Insert material suppliers
      if (materialSuppliers.length > 0 && newMaterial) {
        const { error: msError } = await supabase
          .from('material_suppliers')
          .insert(materialSuppliers.map(ms => ({
            material_id: newMaterial.id,
            supplier_id: ms.supplier_id,
            is_primary: ms.is_primary,
            supplier_item_number: ms.supplier_item_number || null,
            cost_per_unit: ms.cost_per_unit ?? null,
            unit_id: ms.unit_id || null,
            purchase_unit_id: ms.purchase_unit_id || null,
            lead_time_days: ms.lead_time_days ?? null,
            min_order_quantity: ms.min_order_quantity ?? null,
            notes: ms.notes || null,
            is_active: ms.is_active,
          })));
        if (msError) throw msError;
      }
      
      // Upload documents
      if (documents.length > 0 && newMaterial) {
        await uploadDocuments(newMaterial.id);
      }
      
      return newMaterial;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['material-documents'] });
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
          sub_category: data.sub_category || null,
          base_unit_id: data.base_unit_id,
          usage_unit_id: data.usage_unit_id || null,
          usage_unit_conversion: data.usage_unit_conversion || null,
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
          cost_per_base_unit: null, // Cost is now on suppliers
          min_stock_level: data.min_stock_level || null,
        })
        .eq('id', material.id);
      if (error) throw error;
      
      // Upload photos first
      await uploadUnitVariantPhotos(material.id);
      
      // Update unit variants - delete removed, insert new, update existing
      const existingIds = existingPurchaseUnits?.map(pu => pu.id) || [];
      const currentIds = unitVariants.filter(uv => uv.id).map(uv => uv.id!);
      const toDelete = existingIds.filter(id => !currentIds.includes(id));
      
      if (toDelete.length > 0) {
        await supabase.from('material_purchase_units').delete().in('id', toDelete);
      }
      
      for (const uv of unitVariants) {
        if (uv.id) {
          await supabase.from('material_purchase_units').update({
            code: uv.code,
            unit_id: uv.unit_id,
            conversion_to_base: uv.conversion_to_base,
            is_default: uv.is_default,
            item_number: uv.item_number || null,
            photo_path: uv.photo_path || null,
            photo_url: uv.photo_url || null,
            photo_added_at: uv.photo_added_at || null,
          }).eq('id', uv.id);
        } else {
          await supabase.from('material_purchase_units').insert({
            material_id: material.id,
            code: uv.code,
            unit_id: uv.unit_id,
            conversion_to_base: uv.conversion_to_base,
            is_default: uv.is_default,
            item_number: uv.item_number || null,
            photo_path: uv.photo_path || null,
            photo_url: uv.photo_url || null,
            photo_added_at: uv.photo_added_at || null,
          });
        }
      }
      
      // Update material suppliers - delete removed, insert new, update existing
      const existingSupplierIds = existingMaterialSuppliers?.map(ms => ms.id) || [];
      const currentSupplierIds = materialSuppliers.filter(ms => ms.id).map(ms => ms.id!);
      const suppliersToDelete = existingSupplierIds.filter(id => !currentSupplierIds.includes(id));
      
      if (suppliersToDelete.length > 0) {
        await supabase.from('material_suppliers').delete().in('id', suppliersToDelete);
      }
      
      for (const ms of materialSuppliers) {
        if (ms.id) {
          await supabase.from('material_suppliers').update({
            supplier_id: ms.supplier_id,
            is_primary: ms.is_primary,
            supplier_item_number: ms.supplier_item_number || null,
            cost_per_unit: ms.cost_per_unit ?? null,
            unit_id: ms.unit_id || null,
            purchase_unit_id: ms.purchase_unit_id || null,
            lead_time_days: ms.lead_time_days ?? null,
            min_order_quantity: ms.min_order_quantity ?? null,
            notes: ms.notes || null,
            is_active: ms.is_active,
          }).eq('id', ms.id);
        } else {
          await supabase.from('material_suppliers').insert({
            material_id: material.id,
            supplier_id: ms.supplier_id,
            is_primary: ms.is_primary,
            supplier_item_number: ms.supplier_item_number || null,
            cost_per_unit: ms.cost_per_unit ?? null,
            unit_id: ms.unit_id || null,
            purchase_unit_id: ms.purchase_unit_id || null,
            lead_time_days: ms.lead_time_days ?? null,
            min_order_quantity: ms.min_order_quantity ?? null,
            notes: ms.notes || null,
            is_active: ms.is_active,
          });
        }
      }
      
      // Upload/update documents
      await uploadDocuments(material.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['material-purchase-units'] });
      queryClient.invalidateQueries({ queryKey: ['material-suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['material-documents'] });
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

  const addUnitVariant = () => {
    const baseCode = form.getValues('code');
    const mainItemNumber = form.getValues('item_number');
    const suffixLetter = String.fromCharCode(65 + unitVariants.length);
    const newCode = `${baseCode}${suffixLetter}`;
    setUnitVariants([...unitVariants, { 
      code: newCode, 
      unit_id: '', 
      conversion_to_base: 1, 
      is_default: false,
      item_number: mainItemNumber || '',
    }]);
  };

  const removeUnitVariant = (index: number) => {
    setUnitVariants(unitVariants.filter((_, i) => i !== index));
  };

  const updateUnitVariant = (index: number, field: keyof UnitVariant, value: string | number | boolean | File | undefined) => {
    setUnitVariants(unitVariants.map((uv, i) => 
      i === index ? { ...uv, [field]: value } : uv
    ));
  };

  const handleUnitVariantPhotoUpload = (index: number, file: File | undefined) => {
    if (!file) return;
    setUnitVariants(unitVariants.map((uv, i) => 
      i === index ? { ...uv, photo_file: file } : uv
    ));
  };

  // Material Supplier helper functions
  const addMaterialSupplier = () => {
    const isPrimary = materialSuppliers.length === 0;
    setMaterialSuppliers([...materialSuppliers, { 
      supplier_id: '', 
      is_primary: isPrimary, 
      is_active: true 
    }]);
  };

  const removeMaterialSupplier = (index: number) => {
    const removed = materialSuppliers[index];
    const updated = materialSuppliers.filter((_, i) => i !== index);
    if (removed.is_primary && updated.length > 0) {
      updated[0].is_primary = true;
    }
    setMaterialSuppliers(updated);
  };

  const updateMaterialSupplier = (index: number, field: keyof MaterialSupplier, value: string | number | boolean | undefined) => {
    setMaterialSuppliers(materialSuppliers.map((ms, i) => {
      if (i !== index) {
        if (field === 'is_primary' && value === true) {
          return { ...ms, is_primary: false };
        }
        return ms;
      }
      return { ...ms, [field]: value };
    }));
  };

  // Document helper functions
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setDocuments(documents.map((doc, i) => 
      i === index ? { ...doc, file, document_name: doc.document_name || file.name } : doc
    ));
  };

  const addDocument = () => {
    setDocuments([...documents, { 
      document_name: '', 
      isNew: true 
    }]);
  };

  const removeDocument = async (index: number) => {
    const doc = documents[index];
    
    if (doc.file_path && doc.id) {
      const { error } = await supabase.storage
        .from('material-documents')
        .remove([doc.file_path]);
      
      if (error) {
        toast({ title: 'Error deleting file', description: error.message, variant: 'destructive' });
        return;
      }
      
      await supabase.from('material_documents').delete().eq('id', doc.id);
    }
    
    setDocuments(documents.filter((_, i) => i !== index));
  };

  const updateDocument = (index: number, field: keyof DocumentUpload, value: string | undefined) => {
    setDocuments(documents.map((doc, i) => 
      i === index ? { ...doc, [field]: value } : doc
    ));
  };

  const uploadDocuments = async (materialId: string) => {
    const newDocs = documents.filter(doc => doc.isNew && doc.file);
    
    for (const doc of newDocs) {
      if (!doc.file) continue;
      
      const fileExt = doc.file.name.split('.').pop();
      const filePath = `${materialId}/${Date.now()}-${doc.document_name}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('material-documents')
        .upload(filePath, doc.file);
      
      if (uploadError) {
        toast({ title: 'Error uploading file', description: uploadError.message, variant: 'destructive' });
        continue;
      }
      
      const { data: urlData } = supabase.storage
        .from('material-documents')
        .getPublicUrl(filePath);
      
      await supabase.from('material_documents').insert({
        material_id: materialId,
        document_name: doc.document_name,
        requirement_id: doc.requirement_id || null,
        file_path: filePath,
        file_url: urlData.publicUrl,
        date_published: doc.date_published || null,
        date_reviewed: doc.date_reviewed || null,
      });
    }
    
    const existingDocs = documents.filter(doc => !doc.isNew && doc.id);
    for (const doc of existingDocs) {
      await supabase.from('material_documents').update({
        document_name: doc.document_name,
        requirement_id: doc.requirement_id || null,
        date_published: doc.date_published || null,
        date_reviewed: doc.date_reviewed || null,
      }).eq('id', doc.id);
    }
  };

  const downloadDocument = async (doc: DocumentUpload) => {
    if (!doc.file_path) return;
    
    const { data, error } = await supabase.storage
      .from('material-documents')
      .download(doc.file_path);
    
    if (error) {
      toast({ title: 'Error downloading file', description: error.message, variant: 'destructive' });
      return;
    }
    
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.document_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Check if photo is older than 10 months
  const isPhotoStale = (photoAddedAt: string | undefined): boolean => {
    if (!photoAddedAt) return false;
    const addedDate = new Date(photoAddedAt);
    const monthsDiff = differenceInMonths(new Date(), addedDate);
    return monthsDiff >= 10;
  };

  // Get calculated cost per usage unit for a supplier entry
  const getCalculatedUsageCost = (costPerUnit: number | undefined, purchaseUnitId: string | undefined): number | null => {
    if (!costPerUnit) return null;
    
    const usageConversion = form.watch('usage_unit_conversion');
    
    if (purchaseUnitId) {
      // Find the unit variant's conversion
      const variant = unitVariants.find(uv => uv.id === purchaseUnitId);
      if (variant && variant.conversion_to_base > 0) {
        return costPerUnit / variant.conversion_to_base;
      }
    }
    
    // For default unit, use the usage_unit_conversion
    if (usageConversion && usageConversion > 0) {
      return costPerUnit / usageConversion;
    }
    
    return null;
  };

  const isLoading = createMutation.isPending || updateMutation.isPending || isUploading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{material ? 'Edit Material' : 'Add New Material'}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="specifications">Specifications</TabsTrigger>
                <TabsTrigger value="food-safety">Food Safety</TabsTrigger>
                <TabsTrigger value="unit-variants">Unit Variants</TabsTrigger>
                <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
              </TabsList>

              {/* Basic Info Tab */}
              <TabsContent value="basic" className="space-y-4 mt-4">
                {/* Category - Required First */}
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <Select 
                        onValueChange={async (value) => {
                          field.onChange(value);
                          form.setValue('sub_category', null);
                          if (!material) {
                            const { data, error } = await supabase.rpc('generate_material_code', { 
                              p_category: value 
                            });
                            if (!error && data) {
                              form.setValue('code', data);
                              setUnitVariants(prev => prev.map((uv, idx) => ({
                                ...uv,
                                code: `${data}${String.fromCharCode(65 + idx)}`
                              })));
                            }
                          }
                        }}
                        value={field.value || ''}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category (required)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {MATERIAL_CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        This determines the material code prefix and available specifications
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Sub-Category */}
                <FormField
                  control={form.control}
                  name="sub_category"
                  render={({ field }) => {
                    const selectedCategory = form.watch('category');
                    const filteredSubCategories = subCategories?.filter(
                      sc => sc.category === selectedCategory
                    ) || [];
                    
                    return (
                      <FormItem>
                        <FormLabel>Sub-Category</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(value === '__none__' ? null : value)} 
                          value={field.value || '__none__'}
                          disabled={!selectedCategory}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={selectedCategory ? "Select sub-category" : "Select a category first"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none__">-- None --</SelectItem>
                            {filteredSubCategories.map((sc) => (
                              <SelectItem key={sc.id} value={sc.name}>
                                {sc.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Material Code *</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly className="font-mono bg-muted" />
                        </FormControl>
                        <FormDescription>Auto-generated based on category</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Material Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Internal description" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Manufacturer & Item Number */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="manufacturer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Manufacturer</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            const newValue = value === '__none__' ? '' : value;
                            field.onChange(newValue);
                            
                            // Auto-populate suppliers if manufacturer is also distributor
                            if (newValue) {
                              const selectedManufacturer = manufacturers?.find(m => m.name === newValue);
                              if (selectedManufacturer && selectedManufacturer.supplier_type === 'manufacturer_distributor') {
                                autoPopulateSuppliersForManufacturer(selectedManufacturer.id, form.getValues('item_number'));
                              }
                            }
                          }} 
                          value={field.value || '__none__'}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select manufacturer" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none__">None</SelectItem>
                            {manufacturers?.map((manufacturer) => (
                              <SelectItem key={manufacturer.id} value={manufacturer.name}>
                                {manufacturer.name}
                                {manufacturer.supplier_type === 'manufacturer_distributor' && (
                                  <span className="text-muted-foreground ml-1">(Mfr & Dist)</span>
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Who makes this material
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="item_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Manufacturer Item Number</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="ID used on PO" 
                            {...field} 
                            onChange={(e) => {
                              field.onChange(e);
                              // Sync to manufacturer supplier entries
                              const manufacturerName = form.getValues('manufacturer');
                              if (manufacturerName && manufacturerName !== '__none__') {
                                const selectedManufacturer = manufacturers?.find(m => m.name === manufacturerName);
                                if (selectedManufacturer) {
                                  setMaterialSuppliers(prev => prev.map(ms => 
                                    ms.supplier_id === selectedManufacturer.id && ms.is_manufacturer
                                      ? { ...ms, supplier_item_number: e.target.value || undefined }
                                      : ms
                                  ));
                                }
                              }
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          The ID that appears on Purchase Orders
                        </FormDescription>
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
                    name="base_unit_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Purchase Unit *</FormLabel>
                        <div className="flex gap-2">
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="flex-1">
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
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setPendingUnitField('base_unit_id');
                              setCreateUnitOpen(true);
                            }}
                            title="Create custom unit"
                          >
                            <PlusCircle className="h-4 w-4" />
                          </Button>
                        </div>
                        <FormDescription>
                          Unit used when purchasing from suppliers
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="usage_unit_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Usage Unit</FormLabel>
                        <div className="flex gap-2">
                          <Select 
                            onValueChange={(val) => field.onChange(val === '__none__' ? null : val)} 
                            value={field.value || '__none__'}
                          >
                            <FormControl>
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Select usage unit (optional)" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="__none__">Same as Purchase Unit</SelectItem>
                              {units?.map((unit) => (
                                <SelectItem key={unit.id} value={unit.id}>
                                  {unit.name} ({unit.code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setPendingUnitField('usage_unit_id');
                              setCreateUnitOpen(true);
                            }}
                            title="Create custom unit"
                          >
                            <PlusCircle className="h-4 w-4" />
                          </Button>
                        </div>
                        <FormDescription>
                          Unit for issuing to production
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="usage_unit_conversion"
                    render={({ field }) => {
                      const usageUnitId = form.watch('usage_unit_id');
                      const purchaseUnitId = form.watch('base_unit_id');
                      const usageUnit = units?.find(u => u.id === usageUnitId);
                      const purchaseUnit = units?.find(u => u.id === purchaseUnitId);
                      
                      return (
                        <FormItem>
                          <FormLabel>Usage Units per Purchase Unit</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              placeholder="e.g., 22.68"
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                              disabled={!usageUnitId}
                            />
                          </FormControl>
                          <FormDescription>
                            {usageUnitId && purchaseUnit && usageUnit 
                              ? `1 ${purchaseUnit.code} = ${field.value || '?'} ${usageUnit.code}`
                              : 'Select a usage unit first'}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
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
                {(() => {
                  const category = form.watch('category');
                  const isFood = FOOD_CATEGORIES.includes(category);
                  const isPackaging = PACKAGING_CATEGORIES.includes(category);
                  const isIndustrial = INDUSTRIAL_CATEGORIES.includes(category);
                  
                  if (!category) {
                    return (
                      <div className="text-center py-12 text-muted-foreground border rounded-md bg-muted/20">
                        <p>Please select a Category on the Basic Info tab first.</p>
                        <p className="text-xs mt-1">Specifications will vary based on material category.</p>
                      </div>
                    );
                  }
                  
                  return (
                    <>
                      {isFood && (
                        <>
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
                                            field.onChange(field.value.filter(v => v !== option.value));
                                          }
                                        }}
                                        className="sr-only"
                                      />
                                      <span className="text-sm">{option.label}</span>
                                    </label>
                                  ))}
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

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
                                            field.onChange(field.value.filter(v => v !== option.value));
                                          }
                                        }}
                                        className="sr-only"
                                      />
                                      <span className="text-sm">{option.label}</span>
                                    </label>
                                  ))}
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="label_copy"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Label Copy</FormLabel>
                                <FormControl>
                                  <Textarea placeholder="Ingredient declaration text..." {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="density"
                            render={({ field }) => (
                              <FormItem className="max-w-xs">
                                <FormLabel>Density (lbs/gal)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    step="0.01"
                                    placeholder="e.g., 8.34"
                                    {...field}
                                    value={field.value ?? ''}
                                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

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
                        </>
                      )}

                      {isPackaging && (
                        <div className="p-4 border rounded-md bg-muted/30">
                          <p className="text-sm text-muted-foreground">
                            Additional packaging specifications (dimensions, materials, etc.) can be added in future updates.
                          </p>
                        </div>
                      )}

                      {isIndustrial && (
                        <div className="space-y-4">
                          <div className="p-4 border rounded-md bg-amber-500/10 border-amber-500/30">
                            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                              ⚠️ Industrial / Chemical Materials
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Ensure SDS (Safety Data Sheets) are uploaded in the Documents section.
                            </p>
                          </div>
                          <FormField
                            control={form.control}
                            name="other_hazards"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Safety Notes / Hazards</FormLabel>
                                <FormControl>
                                  <Textarea placeholder="Special handling requirements, hazards, PPE needed..." {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </>
                  );
                })()}
              </TabsContent>

              {/* Food Safety (VACCP) Tab */}
              <TabsContent value="food-safety" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="country_of_origin"
                  render={({ field }) => (
                    <FormItem className="max-w-xs">
                      <FormLabel>Country of Origin</FormLabel>
                      <FormControl>
                        <Input placeholder="USA" {...field} />
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

              {/* Unit Variants Tab */}
              <TabsContent value="unit-variants" className="space-y-6 mt-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Unit Variants (Pack Sizes)</h4>
                      <p className="text-sm text-muted-foreground">
                        Different pack sizes/variants produced by the manufacturer
                      </p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addUnitVariant}>
                      <Plus className="h-4 w-4 mr-1" /> Add Variant
                    </Button>
                  </div>

                  {/* Default unit info */}
                  {(() => {
                    const baseUnitId = form.watch('base_unit_id');
                    const baseUnit = units?.find(u => u.id === baseUnitId);
                    const mainCode = form.watch('code');
                    const mainItemNumber = form.watch('item_number');
                    const usageUnitId = form.watch('usage_unit_id');
                    const usageUnit = units?.find(u => u.id === usageUnitId);
                    const usageConversion = form.watch('usage_unit_conversion');
                    
                    return (
                      <div className="p-4 border rounded-md bg-primary/5 border-primary/20">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="default">Default</Badge>
                              <span className="font-mono text-sm font-medium">{mainCode}</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {baseUnit?.name} ({baseUnit?.code})
                              {usageUnit && usageConversion && (
                                <span className="ml-2">
                                  → {usageConversion} {usageUnit.code}
                                </span>
                              )}
                            </p>
                            {mainItemNumber && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Manufacturer Item #: {mainItemNumber}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">From Basic Info</span>
                        </div>
                      </div>
                    );
                  })()}

                  {unitVariants.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground border rounded-md bg-muted/20">
                      <p>No alternative pack sizes defined.</p>
                      <p className="text-xs mt-1">Click "Add Variant" to add different pack sizes.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {unitVariants.map((uv, index) => {
                        const selectedUnit = units?.find(u => u.id === uv.unit_id);
                        const usageUnitId = form.watch('usage_unit_id');
                        const usageUnit = units?.find(u => u.id === usageUnitId);
                        const baseUnitId = form.watch('base_unit_id');
                        const baseUnit = units?.find(u => u.id === baseUnitId);
                        const displayUnit = usageUnit || baseUnit;
                        const photoStale = isPhotoStale(uv.photo_added_at);
                        
                        return (
                          <div key={index} className="p-4 border rounded-md bg-card space-y-3">
                            <div className="flex items-start gap-3">
                              <div className="flex-1 space-y-3">
                                <div className="grid grid-cols-4 gap-3">
                                  <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                                      Code
                                    </label>
                                    <Input
                                      value={uv.code}
                                      onChange={(e) => updateUnitVariant(index, 'code', e.target.value)}
                                      placeholder="Material code"
                                      className="font-mono"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                                      Manufacturer Item #
                                    </label>
                                    <Input
                                      value={uv.item_number || ''}
                                      onChange={(e) => updateUnitVariant(index, 'item_number', e.target.value)}
                                      placeholder="Item number"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                                      Pack Size / Unit
                                    </label>
                                    <div className="flex gap-1">
                                      <Select
                                        value={uv.unit_id}
                                        onValueChange={(value) => updateUnitVariant(index, 'unit_id', value)}
                                      >
                                        <SelectTrigger className="flex-1">
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
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="shrink-0"
                                        onClick={() => {
                                          setPendingUnitField(index);
                                          setCreateUnitOpen(true);
                                        }}
                                        title="Create custom unit"
                                      >
                                        <PlusCircle className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                                      {displayUnit ? `${displayUnit.code} per pack` : 'Conversion'}
                                    </label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={uv.conversion_to_base}
                                      onChange={(e) => updateUnitVariant(index, 'conversion_to_base', parseFloat(e.target.value) || 0)}
                                      placeholder="e.g., 22.68"
                                    />
                                  </div>
                                </div>

                                {/* Photo Upload Section */}
                                <div className="flex items-center gap-4 pt-2 border-t">
                                  <div className="flex-1">
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                                      Product Photo
                                    </label>
                                    <div className="flex items-center gap-2">
                                      <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleUnitVariantPhotoUpload(index, e.target.files?.[0])}
                                        className="flex-1"
                                      />
                                      {uv.photo_file && (
                                        <span className="text-xs text-green-600">New file selected</span>
                                      )}
                                    </div>
                                  </div>
                                  {uv.photo_url && (
                                    <div className="flex items-center gap-2">
                                      <img 
                                        src={uv.photo_url} 
                                        alt="Product" 
                                        className="h-12 w-12 rounded object-cover border"
                                      />
                                      {photoStale && (
                                        <div className="flex items-center gap-1 text-amber-600">
                                          <AlertTriangle className="h-4 w-4" />
                                          <span className="text-xs">Review needed (10+ months)</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  {!uv.photo_url && !uv.photo_file && (
                                    <div className="h-12 w-12 rounded border border-dashed flex items-center justify-center text-muted-foreground">
                                      <ImageIcon className="h-5 w-5" />
                                    </div>
                                  )}
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive shrink-0 mt-5"
                                onClick={() => removeUnitVariant(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Suppliers Tab */}
              <TabsContent value="suppliers" className="space-y-6 mt-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Approved Suppliers</h4>
                      <p className="text-sm text-muted-foreground">
                        Link this material to vendors with specific pricing
                      </p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addMaterialSupplier}>
                      <Plus className="h-4 w-4 mr-1" /> Add Supplier
                    </Button>
                  </div>

                  {materialSuppliers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border rounded-md bg-muted/20">
                      <p>No suppliers linked.</p>
                      <p className="text-xs mt-1">Click "Add Supplier" to link approved vendors.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {materialSuppliers.map((ms, index) => {
                        const selectedSupplier = suppliers?.find(s => s.id === ms.supplier_id);
                        const baseUnitId = form.watch('base_unit_id');
                        const baseUnit = units?.find(u => u.id === baseUnitId);
                        const usageConversion = form.watch('usage_unit_conversion');
                        const usageUnitId = form.watch('usage_unit_id');
                        const usageUnit = units?.find(u => u.id === usageUnitId);
                        
                        // Build unit options: default + variants
                        const unitOptions = [
                          { id: '__default__', label: `Default (${baseUnit?.code || 'Base Unit'})` },
                          ...unitVariants.filter(uv => uv.id).map(uv => ({
                            id: uv.id!,
                            label: `${uv.code} - ${units?.find(u => u.id === uv.unit_id)?.code || 'Unit'}`
                          }))
                        ];

                        const calculatedUsageCost = getCalculatedUsageCost(ms.cost_per_unit, ms.purchase_unit_id);
                        
                        return (
                          <div key={index} className="p-4 border rounded-md bg-card space-y-4">
                            <div className="flex items-start gap-3">
                              <div className="flex-1 space-y-4">
                                {/* Supplier Selection Row */}
                                <div className="grid grid-cols-3 gap-3">
                                  <div className="col-span-2">
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                                      Supplier *
                                    </label>
                                    <div className="flex items-center gap-2">
                                      {ms.is_primary && (
                                        <Star className="h-4 w-4 text-amber-500 shrink-0" />
                                      )}
                                      <Select
                                        value={ms.supplier_id}
                                        onValueChange={(value) => updateMaterialSupplier(index, 'supplier_id', value)}
                                      >
                                        <SelectTrigger className="flex-1">
                                          <SelectValue placeholder="Select supplier" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {suppliers?.filter(s => s.approval_status === 'approved').map((supplier) => (
                                            <SelectItem key={supplier.id} value={supplier.id}>
                                              {supplier.name} ({supplier.code})
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      {!ms.is_primary && materialSuppliers.length > 1 && (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => updateMaterialSupplier(index, 'is_primary', true)}
                                          className="shrink-0"
                                        >
                                          Set Primary
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                                      Unit Variant
                                    </label>
                                    <Select
                                      value={ms.purchase_unit_id || '__default__'}
                                      onValueChange={(value) => updateMaterialSupplier(index, 'purchase_unit_id', value === '__default__' ? undefined : value)}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select unit variant" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {unitOptions.map((opt) => (
                                          <SelectItem key={opt.id} value={opt.id}>
                                            {opt.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                {/* Supplier Item Number Row */}
                                <div className="grid grid-cols-3 gap-3">
                                  <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                                      Supplier Item Number
                                    </label>
                                    <Input
                                      value={ms.supplier_item_number || ''}
                                      onChange={(e) => updateMaterialSupplier(index, 'supplier_item_number', e.target.value)}
                                      placeholder="Vendor's item #"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                                      Cost Per Purchase Unit ($) *
                                    </label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={ms.cost_per_unit ?? ''}
                                      onChange={(e) => updateMaterialSupplier(index, 'cost_per_unit', e.target.value ? parseFloat(e.target.value) : undefined)}
                                      placeholder="0.00"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                                      Cost Per Usage Unit ($)
                                    </label>
                                    <div className="flex items-center h-10 px-3 rounded-md border bg-muted">
                                      <span className="text-sm font-medium">
                                        {calculatedUsageCost !== null 
                                          ? `$${calculatedUsageCost.toFixed(4)}` 
                                          : '—'}
                                      </span>
                                      {usageUnit && (
                                        <span className="text-xs text-muted-foreground ml-1">
                                          /{usageUnit.code}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Additional Fields Row */}
                                <div className="grid grid-cols-3 gap-3">
                                  <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                                      Lead Time (Days)
                                    </label>
                                    <Input
                                      type="number"
                                      value={ms.lead_time_days ?? ''}
                                      onChange={(e) => updateMaterialSupplier(index, 'lead_time_days', e.target.value ? parseInt(e.target.value) : undefined)}
                                      placeholder="7"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                                      Min Order Qty
                                    </label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={ms.min_order_quantity ?? ''}
                                      onChange={(e) => updateMaterialSupplier(index, 'min_order_quantity', e.target.value ? parseFloat(e.target.value) : undefined)}
                                      placeholder="1"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                                      Notes
                                    </label>
                                    <Input
                                      value={ms.notes || ''}
                                      onChange={(e) => updateMaterialSupplier(index, 'notes', e.target.value)}
                                      placeholder="Special instructions..."
                                    />
                                  </div>
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive shrink-0"
                                onClick={() => removeMaterialSupplier(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            {selectedSupplier && (
                              <p className="text-xs text-muted-foreground border-t pt-2">
                                {selectedSupplier.contact_name && <span>Contact: {selectedSupplier.contact_name}</span>}
                                {selectedSupplier.email && <span className="ml-3">Email: {selectedSupplier.email}</span>}
                                {selectedSupplier.phone && <span className="ml-3">Phone: {selectedSupplier.phone}</span>}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent value="documents" className="space-y-6 mt-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Material Documents</h4>
                      <p className="text-sm text-muted-foreground">
                        Upload specifications, COAs, SDS sheets, and other documents
                      </p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addDocument}>
                      <Plus className="h-4 w-4 mr-1" /> Add Document
                    </Button>
                  </div>

                  {!material && (
                    <div className="p-4 border rounded-md bg-amber-500/10 border-amber-500/30">
                      <p className="text-sm text-amber-700 dark:text-amber-400">
                        💡 Save the material first to upload documents.
                      </p>
                    </div>
                  )}

                  {documents.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border rounded-md bg-muted/20">
                      <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No documents uploaded.</p>
                      <p className="text-xs mt-1">Click "Add Document" to upload specs, COAs, or SDS sheets.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {documents.map((doc, index) => {
                        const requirement = documentRequirements?.find(r => r.id === doc.requirement_id);
                        
                        return (
                          <div key={index} className="p-4 border rounded-md bg-card space-y-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                                      Document Name *
                                    </label>
                                    <Input
                                      value={doc.document_name}
                                      onChange={(e) => updateDocument(index, 'document_name', e.target.value)}
                                      placeholder="e.g., Product Specification"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                                      Document Type
                                    </label>
                                    <Select
                                      value={doc.requirement_id || '__none__'}
                                      onValueChange={(value) => updateDocument(index, 'requirement_id', value === '__none__' ? undefined : value)}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select type (optional)" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="__none__">Other / Custom</SelectItem>
                                        {documentRequirements?.map((req) => (
                                          <SelectItem key={req.id} value={req.id}>
                                            {req.document_name} {req.is_required && '*'}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                                      {doc.file_path ? 'Replace File' : 'Upload File'}
                                    </label>
                                    <div className="flex gap-2">
                                      <Input
                                        type="file"
                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                                        onChange={(e) => handleFileUpload(e, index)}
                                        disabled={!material}
                                        className="flex-1"
                                      />
                                    </div>
                                    {doc.file && (
                                      <p className="text-xs text-green-600 mt-1">
                                        ✓ New file selected: {doc.file.name}
                                      </p>
                                    )}
                                  </div>
                                  <div>
                                    {doc.file_path && (
                                      <div>
                                        <label className="text-xs font-medium text-muted-foreground mb-1 block">
                                          Current File
                                        </label>
                                        <div className="flex gap-2">
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => downloadDocument(doc)}
                                            className="gap-1"
                                          >
                                            <Download className="h-3 w-3" /> Download
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                                      Date Published
                                    </label>
                                    <Input
                                      type="date"
                                      value={doc.date_published || ''}
                                      onChange={(e) => updateDocument(index, 'date_published', e.target.value || undefined)}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                                      Date Reviewed
                                    </label>
                                    <Input
                                      type="date"
                                      value={doc.date_reviewed || ''}
                                      onChange={(e) => updateDocument(index, 'date_reviewed', e.target.value || undefined)}
                                    />
                                  </div>
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive shrink-0"
                                onClick={() => removeDocument(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            {requirement && (
                              <p className="text-xs text-muted-foreground">
                                {requirement.description}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {documentRequirements && documentRequirements.filter(r => r.is_required).length > 0 && (
                    <div className="pt-4 border-t">
                      <h5 className="text-sm font-medium mb-2">Required Documents</h5>
                      <div className="space-y-1">
                        {documentRequirements.filter(r => r.is_required).map((req) => {
                          const hasDoc = documents.some(d => d.requirement_id === req.id && (d.file_path || d.file));
                          return (
                            <div key={req.id} className="flex items-center gap-2 text-sm">
                              {hasDoc ? (
                                <span className="text-green-600">✓</span>
                              ) : (
                                <span className="text-muted-foreground">○</span>
                              )}
                              <span className={hasDoc ? 'text-foreground' : 'text-muted-foreground'}>
                                {req.document_name}
                              </span>
                            </div>
                          );
                        })}
                      </div>
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

        <CreateUnitDialog
          open={createUnitOpen}
          onOpenChange={setCreateUnitOpen}
          onUnitCreated={(unitId) => {
            if (pendingUnitField === 'base_unit_id') {
              form.setValue('base_unit_id', unitId);
            } else if (pendingUnitField === 'usage_unit_id') {
              form.setValue('usage_unit_id', unitId);
            } else if (pendingUnitField === 'supplier' && pendingSupplierIndex !== null) {
              updateMaterialSupplier(pendingSupplierIndex, 'unit_id', unitId);
              setPendingSupplierIndex(null);
            } else if (typeof pendingUnitField === 'number') {
              updateUnitVariant(pendingUnitField, 'unit_id', unitId);
            }
            setPendingUnitField(null);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
