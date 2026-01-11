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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { X, Plus, Trash2, PlusCircle, Star, Upload, FileText, Download, Eye, EyeOff, AlertTriangle, ImageIcon, ShieldCheck, Archive, ArchiveRestore } from 'lucide-react';
import {
  ApprovalStatusBadge,
  ApprovalActionsDropdown,
  ApprovalHistoryPanel,
  DocumentComplianceSummary,
  DocumentExpiryBadge,
} from '@/components/approval';
import { CreateUnitDialog } from './CreateUnitDialog';
import type { Tables, Json } from '@/integrations/supabase/types';
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

// QA Approval Statuses for Materials
const QA_APPROVAL_STATUSES = [
  { value: 'Draft', label: 'Draft' },
  { value: 'Pending_QA', label: 'Pending QA' },
  { value: 'Probation', label: 'Probation' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'Archived', label: 'Archived' },
] as const;

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
  
  // QA Workflow
  approval_status: z.string().default('Draft'),
  
  // Specifications Tab
  allergens: z.array(z.string()).default([]),
  food_claims: z.array(z.string()).default([]),
  receiving_temperature_min: z.coerce.number().optional().nullable(),
  receiving_temperature_max: z.coerce.number().optional().nullable(),
  storage_temperature_min: z.coerce.number().optional().nullable(),
  storage_temperature_max: z.coerce.number().optional().nullable(),
  density: z.coerce.number().optional().nullable(),
  label_copy: z.string().min(1, 'Label Copy is required'),
  
  // Packaging Specifications
  pkg_fda_food_contact: z.boolean().default(false),
  pkg_material_type: z.string().optional().nullable(),
  pkg_weight_kg: z.coerce.number().optional().nullable(),
  pkg_volume: z.coerce.number().optional().nullable(),
  pkg_volume_uom_id: z.string().optional().nullable(),
  pkg_recyclable: z.boolean().default(false),
  
  // Food Safety (VACCP) Tab
  country_of_origin: z.string().optional(),
  manufacturer: z.string().optional(),
  item_number: z.string().optional(),
  fraud_vulnerability_score: z.string().optional(),
  supply_chain_complexity: z.string().optional(),
  authentication_method: z.array(z.string()).default([]),
  other_hazards: z.string().optional(),
  ca_prop65_prohibited: z.boolean().default(false),
  coa_required: z.boolean().default(false),
  
  // HACCP Tab
  haccp_kill_step_applied: z.boolean().optional().nullable(),
  haccp_rte_or_kill_step: z.string().optional().nullable(),
  haccp_new_allergen: z.boolean().optional().nullable(),
  haccp_new_allergen_name: z.string().optional().nullable(),
  haccp_heavy_metal_limits: z.boolean().optional().nullable(),
  haccp_foreign_material_controls: z.array(z.string()).default([]),
  
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
  expiry_date?: string;
  is_archived?: boolean;
  archived_at?: string;
  archive_reason?: string;
  isNew: boolean;
}

interface CoaLimit {
  id: string;
  parameter: string;
  target_spec: string;
  min: string;
  max: string;
  uom: string;
  method: string;
}

const DEFAULT_COA_PARAMETERS = [
  { parameter: 'Moisture', uom: '%' },
  { parameter: 'Water Activity', uom: 'Aw' },
  { parameter: 'pH', uom: '' },
  { parameter: 'Fat', uom: '%' },
  { parameter: 'Micro(APC)', uom: 'CFU/g' },
  { parameter: 'Total Plate Count', uom: 'CFU/g' },
  { parameter: 'Yeast & Mold', uom: 'CFU/g' },
  { parameter: 'Coliform', uom: 'CFU/g' },
  { parameter: 'E. coli', uom: 'CFU/g' },
  { parameter: 'Salmonella', uom: '/25g' },
  { parameter: 'Listeria', uom: '/25g' },
];

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
  const [coaLimits, setCoaLimits] = useState<CoaLimit[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showArchivedDocs, setShowArchivedDocs] = useState(false);
  const [documentToArchive, setDocumentToArchive] = useState<{ index: number; name: string; isExpired: boolean } | null>(null);
  const [createUnitOpen, setCreateUnitOpen] = useState(false);
  const [pendingUnitField, setPendingUnitField] = useState<'base_unit_id' | 'usage_unit_id' | 'supplier' | number | null>(null);
  const [pendingSupplierIndex, setPendingSupplierIndex] = useState<number | null>(null);
  
  // Default item photo state
  const [defaultPhotoFile, setDefaultPhotoFile] = useState<File | null>(null);
  const [defaultPhotoPath, setDefaultPhotoPath] = useState<string | undefined>();
  const [defaultPhotoUrl, setDefaultPhotoUrl] = useState<string | undefined>();
  const [defaultPhotoAddedAt, setDefaultPhotoAddedAt] = useState<string | undefined>();
  
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
      authentication_method: [],
      other_hazards: '',
      ca_prop65_prohibited: false,
      coa_required: false,
      min_stock_level: null,
      // HACCP defaults
      haccp_kill_step_applied: null,
      haccp_rte_or_kill_step: null,
      haccp_new_allergen: null,
      haccp_new_allergen_name: null,
      haccp_heavy_metal_limits: null,
      haccp_foreign_material_controls: [],
      // Packaging defaults
      pkg_fda_food_contact: false,
      pkg_material_type: null,
      pkg_weight_kg: null,
      pkg_volume: null,
      pkg_volume_uom_id: null,
      pkg_recyclable: false,
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
        authentication_method: (material.authentication_method as string[]) || [],
        other_hazards: material.other_hazards || '',
        ca_prop65_prohibited: material.ca_prop65_prohibited ?? false,
        coa_required: material.coa_required ?? false,
        min_stock_level: material.min_stock_level ?? null,
        approval_status: (material as any).approval_status || 'Draft',
        // HACCP fields
        haccp_kill_step_applied: (material as any).haccp_kill_step_applied ?? null,
        haccp_rte_or_kill_step: (material as any).haccp_rte_or_kill_step || null,
        haccp_new_allergen: (material as any).haccp_new_allergen ?? null,
        haccp_new_allergen_name: (material as any).haccp_new_allergen_name || null,
        haccp_heavy_metal_limits: (material as any).haccp_heavy_metal_limits ?? null,
        haccp_foreign_material_controls: (material as any).haccp_foreign_material_controls || [],
        // Packaging fields
        pkg_fda_food_contact: (material as any).pkg_fda_food_contact ?? false,
        pkg_material_type: (material as any).pkg_material_type || null,
        pkg_weight_kg: (material as any).pkg_weight_kg ?? null,
        pkg_volume: (material as any).pkg_volume ?? null,
        pkg_volume_uom_id: (material as any).pkg_volume_uom_id || null,
        pkg_recyclable: (material as any).pkg_recyclable ?? false,
      });
      // Load default photo state
      setDefaultPhotoPath((material as any).photo_path || undefined);
      setDefaultPhotoUrl((material as any).photo_url || undefined);
      setDefaultPhotoAddedAt((material as any).photo_added_at || undefined);
      setDefaultPhotoFile(null);
      // Load COA limits
      const existingCoaLimits = (material as any).coa_critical_limits;
      if (existingCoaLimits && Array.isArray(existingCoaLimits) && existingCoaLimits.length > 0) {
        setCoaLimits(existingCoaLimits as CoaLimit[]);
      } else {
        // Initialize with default parameters
        setCoaLimits(DEFAULT_COA_PARAMETERS.map((p, i) => ({
          id: `new-${i}`,
          parameter: p.parameter,
          target_spec: '',
          min: '',
          max: '',
          uom: p.uom,
          method: '',
        })));
      }
    } else {
      form.reset({
        ...form.formState.defaultValues,
        code: '',
        category: '',
      } as MaterialFormData);
      setUnitVariants([]);
      setMaterialSuppliers([]);
      setDocuments([]);
      // Reset default photo state
      setDefaultPhotoPath(undefined);
      setDefaultPhotoUrl(undefined);
      setDefaultPhotoAddedAt(undefined);
      setDefaultPhotoFile(null);
      // Reset COA limits to defaults
      setCoaLimits(DEFAULT_COA_PARAMETERS.map((p, i) => ({
        id: `new-${i}`,
        parameter: p.parameter,
        target_spec: '',
        min: '',
        max: '',
        uom: p.uom,
        method: '',
      })));
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
        expiry_date: (doc as any).expiry_date || undefined,
        is_archived: (doc as any).is_archived || false,
        archived_at: (doc as any).archived_at || undefined,
        archive_reason: (doc as any).archive_reason || undefined,
        isNew: false,
      })));
    }
  }, [existingDocuments]);

  // Auto-populate suppliers when existing material with manufacturer_distributor loads
  useEffect(() => {
    // Only run when we have loaded the material, suppliers data, and unit variants
    if (!material || !suppliers || !manufacturers || !existingPurchaseUnits) return;
    
    const manufacturerName = material.manufacturer;
    if (!manufacturerName) return;
    
    const selectedManufacturer = manufacturers.find(m => m.name === manufacturerName);
    if (!selectedManufacturer || selectedManufacturer.supplier_type !== 'manufacturer_distributor') return;
    
    // If there are no existing supplier entries for this manufacturer, auto-populate
    const hasManufacturerEntries = existingMaterialSuppliers?.some(ms => ms.supplier_id === selectedManufacturer.id);
    if (!hasManufacturerEntries) {
      // Wait a tick for unitVariants state to be set from existingPurchaseUnits
      setTimeout(() => {
        autoPopulateSuppliersForManufacturer(selectedManufacturer.id, material.item_number || undefined);
      }, 100);
    }
  }, [material, suppliers, manufacturers, existingPurchaseUnits, existingMaterialSuppliers]);

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

  // Upload default item photo and return photo data
  const uploadDefaultPhoto = async (materialId: string): Promise<{ photo_path?: string; photo_url?: string; photo_added_at?: string }> => {
    if (!defaultPhotoFile) {
      return { photo_path: defaultPhotoPath, photo_url: defaultPhotoUrl, photo_added_at: defaultPhotoAddedAt };
    }

    const fileExt = defaultPhotoFile.name.split('.').pop();
    const filePath = `${materialId}/${Date.now()}-default.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('material-photos')
      .upload(filePath, defaultPhotoFile);

    if (uploadError) {
      toast({ title: 'Error uploading default photo', description: uploadError.message, variant: 'destructive' });
      return {};
    }

    const { data: urlData } = supabase.storage
      .from('material-photos')
      .getPublicUrl(filePath);

    const newPhotoAddedAt = new Date().toISOString();
    setDefaultPhotoPath(filePath);
    setDefaultPhotoUrl(urlData.publicUrl);
    setDefaultPhotoAddedAt(newPhotoAddedAt);
    setDefaultPhotoFile(null);

    return {
      photo_path: filePath,
      photo_url: urlData.publicUrl,
      photo_added_at: newPhotoAddedAt,
    };
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
          authentication_method: data.authentication_method.length > 0 ? data.authentication_method : null,
          other_hazards: data.other_hazards || null,
          ca_prop65_prohibited: data.ca_prop65_prohibited,
          coa_required: data.coa_required,
          cost_per_base_unit: null, // Cost is now on suppliers
          min_stock_level: data.min_stock_level || null,
          approval_status: data.approval_status || 'Draft',
          // HACCP fields
          haccp_kill_step_applied: data.haccp_kill_step_applied ?? null,
          haccp_rte_or_kill_step: data.haccp_rte_or_kill_step || null,
          haccp_new_allergen: data.haccp_new_allergen ?? null,
          haccp_new_allergen_name: data.haccp_new_allergen_name || null,
          haccp_heavy_metal_limits: data.haccp_heavy_metal_limits ?? null,
          haccp_foreign_material_controls: data.haccp_foreign_material_controls.length > 0 ? data.haccp_foreign_material_controls : null,
          // Packaging fields
          pkg_fda_food_contact: data.pkg_fda_food_contact ?? false,
          pkg_material_type: data.pkg_material_type || null,
          pkg_weight_kg: data.pkg_weight_kg ?? null,
          pkg_volume: data.pkg_volume ?? null,
          pkg_volume_uom_id: data.pkg_volume_uom_id || null,
          pkg_recyclable: data.pkg_recyclable ?? false,
          // COA Limits
          coa_critical_limits: coaLimits.filter(l => l.parameter || l.target_spec || l.min || l.max) as unknown as Json,
        }])
        .select()
        .single();
      if (error) throw error;
      
      // Upload default photo and update material
      const defaultPhotoData = await uploadDefaultPhoto(newMaterial.id);
      if (defaultPhotoData.photo_path) {
        await supabase.from('materials').update({
          photo_path: defaultPhotoData.photo_path,
          photo_url: defaultPhotoData.photo_url,
          photo_added_at: defaultPhotoData.photo_added_at,
        }).eq('id', newMaterial.id);
      }
      
      // Upload unit variant photos
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
          authentication_method: data.authentication_method.length > 0 ? data.authentication_method : null,
          other_hazards: data.other_hazards || null,
          ca_prop65_prohibited: data.ca_prop65_prohibited,
          coa_required: data.coa_required,
          cost_per_base_unit: null, // Cost is now on suppliers
          min_stock_level: data.min_stock_level || null,
          approval_status: data.approval_status || 'Draft',
          // HACCP fields
          haccp_kill_step_applied: data.haccp_kill_step_applied ?? null,
          haccp_rte_or_kill_step: data.haccp_rte_or_kill_step || null,
          haccp_new_allergen: data.haccp_new_allergen ?? null,
          haccp_new_allergen_name: data.haccp_new_allergen_name || null,
          haccp_heavy_metal_limits: data.haccp_heavy_metal_limits ?? null,
          haccp_foreign_material_controls: data.haccp_foreign_material_controls.length > 0 ? data.haccp_foreign_material_controls : null,
          // Packaging fields
          pkg_fda_food_contact: data.pkg_fda_food_contact ?? false,
          pkg_material_type: data.pkg_material_type || null,
          pkg_weight_kg: data.pkg_weight_kg ?? null,
          pkg_volume: data.pkg_volume ?? null,
          pkg_volume_uom_id: data.pkg_volume_uom_id || null,
          pkg_recyclable: data.pkg_recyclable ?? false,
          // COA Limits
          coa_critical_limits: coaLimits.filter(l => l.parameter || l.target_spec || l.min || l.max) as unknown as Json,
        })
        .eq('id', material.id);
      if (error) throw error;
      
      // Upload default photo and update material
      const defaultPhotoData = await uploadDefaultPhoto(material.id);
      if (defaultPhotoData.photo_path) {
        await supabase.from('materials').update({
          photo_path: defaultPhotoData.photo_path,
          photo_url: defaultPhotoData.photo_url,
          photo_added_at: defaultPhotoData.photo_added_at,
        }).eq('id', material.id);
      }
      
      // Upload unit variant photos
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

  const handleArchiveClick = (index: number, docName: string, expiryDate: string | undefined) => {
    const isExpired = expiryDate ? new Date(expiryDate) < new Date() : false;
    if (isExpired) {
      // If expired, archive directly
      archiveDocument(index);
    } else {
      // Show confirmation dialog for non-expired documents
      setDocumentToArchive({ index, name: docName, isExpired });
    }
  };

  const archiveDocument = async (index: number) => {
    const doc = documents[index];
    if (!doc.id) return;
    
    const { error } = await supabase
      .from('material_documents')
      .update({
        is_archived: true,
        archived_at: new Date().toISOString(),
      })
      .eq('id', doc.id);
    if (error) {
      toast({ title: 'Error archiving document', description: error.message, variant: 'destructive' });
      return;
    }
    setDocuments(documents.map((d, i) => 
      i === index ? { ...d, is_archived: true, archived_at: new Date().toISOString() } : d
    ));
    toast({ title: 'Document archived' });
  };

  const restoreDocument = async (index: number) => {
    const doc = documents[index];
    if (!doc.id) return;
    
    const { error } = await supabase
      .from('material_documents')
      .update({
        is_archived: false,
        archived_at: null,
      })
      .eq('id', doc.id);
    if (error) {
      toast({ title: 'Error restoring document', description: error.message, variant: 'destructive' });
      return;
    }
    setDocuments(documents.map((d, i) => 
      i === index ? { ...d, is_archived: false, archived_at: undefined } : d
    ));
    toast({ title: 'Document restored' });
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
        expiry_date: doc.expiry_date || null,
      });
    }
    
    const existingDocs = documents.filter(doc => !doc.isNew && doc.id);
    for (const doc of existingDocs) {
      await supabase.from('material_documents').update({
        document_name: doc.document_name,
        requirement_id: doc.requirement_id || null,
        date_published: doc.date_published || null,
        date_reviewed: doc.date_reviewed || null,
        expiry_date: doc.expiry_date || null,
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
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{material ? 'Edit Material' : 'Add New Material'}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-9">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="specifications">Specs</TabsTrigger>
                <TabsTrigger value="food-safety">Food Safety</TabsTrigger>
                <TabsTrigger value="haccp">HACCP</TabsTrigger>
                <TabsTrigger value="coa-limits">COA Limits</TabsTrigger>
                <TabsTrigger value="unit-variants">Units</TabsTrigger>
                <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="qa-workflow" className="flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  QA
                </TabsTrigger>
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
                        <div className="space-y-4">
                          <FormField
                            control={form.control}
                            name="pkg_fda_food_contact"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Approved by FDA for food contact</FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="pkg_material_type"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Material Type</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="e.g., Plastic, Glass, Metal" 
                                    {...field} 
                                    value={field.value || ''} 
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="pkg_weight_kg"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Weight of Packaging (KG)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    step="0.001"
                                    placeholder="0.000"
                                    {...field}
                                    value={field.value ?? ''}
                                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="pkg_volume"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Volume of Container</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      step="0.001"
                                      placeholder="0.000"
                                      {...field}
                                      value={field.value ?? ''}
                                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="pkg_volume_uom_id"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>UOM of Volume</FormLabel>
                                  <Select 
                                    onValueChange={(val) => field.onChange(val === '__none__' ? null : val)} 
                                    value={field.value || '__none__'}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select UOM" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="__none__">Select UOM</SelectItem>
                                      {units?.filter(u => u.unit_type === 'volume').map((unit) => (
                                        <SelectItem key={unit.id} value={unit.id}>
                                          {unit.name} ({unit.code})
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
                            name="pkg_recyclable"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Can be recycled</FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
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
                      <FormLabel>Authentication Method (select all that apply)</FormLabel>
                      <div className="flex flex-wrap gap-4 pt-2">
                        {authMethodOptions.map((option) => (
                          <label key={option.id} className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={(field.value || []).includes(option.value)}
                              onCheckedChange={(checked) => {
                                const currentValues = field.value || [];
                                if (checked) {
                                  field.onChange([...currentValues, option.value]);
                                } else {
                                  field.onChange(currentValues.filter((v: string) => v !== option.value));
                                }
                              }}
                            />
                            <span className="text-sm">{option.label}</span>
                          </label>
                        ))}
                      </div>
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

              {/* HACCP Tab */}
              <TabsContent value="haccp" className="space-y-6 mt-4">
                {/* Biological Hazards Section */}
                <div className="space-y-4">
                  <div className="border-b pb-2">
                    <h4 className="font-medium text-base">Biological Hazards</h4>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="haccp_kill_step_applied"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Does the manufacturer apply a validated kill step?</FormLabel>
                        <FormControl>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="haccp_kill_step"
                                checked={field.value === true}
                                onChange={() => field.onChange(true)}
                                className="h-4 w-4"
                              />
                              <span>Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="haccp_kill_step"
                                checked={field.value === false}
                                onChange={() => field.onChange(false)}
                                className="h-4 w-4"
                              />
                              <span>No</span>
                            </label>
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {form.watch('haccp_kill_step_applied') === false && (
                    <FormField
                      control={form.control}
                      name="haccp_rte_or_kill_step"
                      render={({ field }) => (
                        <FormItem className="ml-4 border-l-2 border-muted pl-4">
                          <FormLabel>Is this ingredient considered "Ready-to-Eat" (RTE) or will we apply a kill step?</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value || ''}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select option" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="RTE">Ready-to-Eat (RTE)</SelectItem>
                              <SelectItem value="KILL_STEP">We will apply a kill step</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                {/* Chemical Hazards & Allergens Section */}
                <div className="space-y-4">
                  <div className="border-b pb-2">
                    <h4 className="font-medium text-base">Chemical Hazards & Allergens</h4>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="haccp_new_allergen"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Does this material introduce a NEW allergen to our facility?</FormLabel>
                        <FormControl>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="haccp_new_allergen"
                                checked={field.value === true}
                                onChange={() => field.onChange(true)}
                                className="h-4 w-4"
                              />
                              <span>Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="haccp_new_allergen"
                                checked={field.value === false}
                                onChange={() => field.onChange(false)}
                                className="h-4 w-4"
                              />
                              <span>No</span>
                            </label>
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {form.watch('haccp_new_allergen') === true && (
                    <FormField
                      control={form.control}
                      name="haccp_new_allergen_name"
                      render={({ field }) => (
                        <FormItem className="ml-4 border-l-2 border-muted pl-4">
                          <FormLabel>What is that allergen?</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter allergen name..." 
                              {...field} 
                              value={field.value || ''} 
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="haccp_heavy_metal_limits"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Are there specific limits for heavy metals, pesticides, or mycotoxins?</FormLabel>
                        <FormControl>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="haccp_heavy_metal_limits"
                                checked={field.value === true}
                                onChange={() => field.onChange(true)}
                                className="h-4 w-4"
                              />
                              <span>Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="haccp_heavy_metal_limits"
                                checked={field.value === false}
                                onChange={() => field.onChange(false)}
                                className="h-4 w-4"
                              />
                              <span>No</span>
                            </label>
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Physical Hazards Section */}
                <div className="space-y-4">
                  <div className="border-b pb-2">
                    <h4 className="font-medium text-base">Physical Hazards</h4>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="haccp_foreign_material_controls"
                    render={({ field }) => {
                      const controlOptions = [
                        { value: 'Metal Detection', label: 'Metal Detection' },
                        { value: 'X-Ray', label: 'X-Ray' },
                        { value: 'Sieves/Screens', label: 'Sieves/Screens' },
                      ];
                      
                      return (
                        <FormItem className="space-y-3">
                          <FormLabel>Foreign Material Control used by manufacturer</FormLabel>
                          <FormDescription>Select all that apply</FormDescription>
                          <div className="flex flex-wrap gap-4">
                            {controlOptions.map((option) => {
                              const isChecked = (field.value || []).includes(option.value);
                              return (
                                <label 
                                  key={option.value} 
                                  className="flex items-center gap-2 cursor-pointer"
                                >
                                  <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={(checked) => {
                                      const currentValues = field.value || [];
                                      if (checked) {
                                        field.onChange([...currentValues, option.value]);
                                      } else {
                                        field.onChange(currentValues.filter(v => v !== option.value));
                                      }
                                    }}
                                  />
                                  <span>{option.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        </FormItem>
                      );
                    }}
                  />
                </div>
              </TabsContent>

              {/* COA Critical Limits Tab */}
              <TabsContent value="coa-limits" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Critical Limits for Certificate of Analysis (COA)</h4>
                      <p className="text-sm text-muted-foreground">
                        Enter the specification data from the manufacturer's COA
                      </p>
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCoaLimits([...coaLimits, {
                        id: `new-${Date.now()}`,
                        parameter: '',
                        target_spec: '',
                        min: '',
                        max: '',
                        uom: '',
                        method: '',
                      }])}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add Parameter
                    </Button>
                  </div>

                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-2 text-sm font-medium w-[180px]">Parameter</th>
                          <th className="text-left p-2 text-sm font-medium w-[120px]">Target/Spec</th>
                          <th className="text-left p-2 text-sm font-medium w-[90px]">Min</th>
                          <th className="text-left p-2 text-sm font-medium w-[90px]">Max</th>
                          <th className="text-left p-2 text-sm font-medium w-[80px]">UOM</th>
                          <th className="text-left p-2 text-sm font-medium">Method</th>
                          <th className="w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {coaLimits.map((limit, index) => (
                          <tr key={limit.id} className="border-t">
                            <td className="p-1">
                              <Input
                                value={limit.parameter}
                                onChange={(e) => {
                                  const updated = [...coaLimits];
                                  updated[index] = { ...limit, parameter: e.target.value };
                                  setCoaLimits(updated);
                                }}
                                placeholder="e.g., Moisture"
                                className="h-8 text-sm"
                              />
                            </td>
                            <td className="p-1">
                              <Input
                                value={limit.target_spec}
                                onChange={(e) => {
                                  const updated = [...coaLimits];
                                  updated[index] = { ...limit, target_spec: e.target.value };
                                  setCoaLimits(updated);
                                }}
                                placeholder="e.g., ≤5%"
                                className="h-8 text-sm"
                              />
                            </td>
                            <td className="p-1">
                              <Input
                                value={limit.min}
                                onChange={(e) => {
                                  const updated = [...coaLimits];
                                  updated[index] = { ...limit, min: e.target.value };
                                  setCoaLimits(updated);
                                }}
                                placeholder="Min"
                                className="h-8 text-sm"
                              />
                            </td>
                            <td className="p-1">
                              <Input
                                value={limit.max}
                                onChange={(e) => {
                                  const updated = [...coaLimits];
                                  updated[index] = { ...limit, max: e.target.value };
                                  setCoaLimits(updated);
                                }}
                                placeholder="Max"
                                className="h-8 text-sm"
                              />
                            </td>
                            <td className="p-1">
                              <Input
                                value={limit.uom}
                                onChange={(e) => {
                                  const updated = [...coaLimits];
                                  updated[index] = { ...limit, uom: e.target.value };
                                  setCoaLimits(updated);
                                }}
                                placeholder="e.g., %"
                                className="h-8 text-sm"
                              />
                            </td>
                            <td className="p-1">
                              <Input
                                value={limit.method}
                                onChange={(e) => {
                                  const updated = [...coaLimits];
                                  updated[index] = { ...limit, method: e.target.value };
                                  setCoaLimits(updated);
                                }}
                                placeholder="Test method"
                                className="h-8 text-sm"
                              />
                            </td>
                            <td className="p-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => setCoaLimits(coaLimits.filter((_, i) => i !== index))}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {coaLimits.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground border rounded-md bg-muted/20">
                      <p>No COA parameters defined.</p>
                      <p className="text-xs mt-1">Click "Add Parameter" to define critical limits.</p>
                    </div>
                  )}
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
                    const defaultPhotoStale = isPhotoStale(defaultPhotoAddedAt);

                    // Calculate expiry date (10 months from upload)
                    const getExpiryDate = (addedAt: string | undefined) => {
                      if (!addedAt) return null;
                      const date = new Date(addedAt);
                      date.setMonth(date.getMonth() + 10);
                      return date;
                    };
                    const expiryDate = getExpiryDate(defaultPhotoAddedAt);
                    
                    return (
                      <div className="p-4 border rounded-md bg-primary/5 border-primary/20 space-y-4">
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

                        {/* Default Item Photo Upload */}
                        <div className="border-t pt-4">
                          <div className="flex items-start gap-4">
                            <div className="flex-1 space-y-2">
                              <label className="text-xs font-medium text-muted-foreground block">
                                Default Item Photo
                              </label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) setDefaultPhotoFile(file);
                                  }}
                                  className="flex-1"
                                />
                                {defaultPhotoFile && (
                                  <span className="text-xs text-green-600">New file selected</span>
                                )}
                              </div>
                              {/* Photo Dates */}
                              {defaultPhotoAddedAt && (
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span>
                                    Uploaded: {new Date(defaultPhotoAddedAt).toLocaleDateString()}
                                  </span>
                                  {expiryDate && (
                                    <span className={defaultPhotoStale ? 'text-amber-600 font-medium' : ''}>
                                      Expires: {expiryDate.toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            {defaultPhotoUrl && (
                              <div className="flex items-center gap-2">
                                <img 
                                  src={defaultPhotoUrl} 
                                  alt="Default product" 
                                  className="h-16 w-16 rounded object-cover border"
                                />
                                {defaultPhotoStale && (
                                  <div className="flex items-center gap-1 text-amber-600">
                                    <AlertTriangle className="h-4 w-4" />
                                    <span className="text-xs">Review needed<br/>(10+ months)</span>
                                  </div>
                                )}
                              </div>
                            )}
                            {!defaultPhotoUrl && !defaultPhotoFile && (
                              <div className="h-16 w-16 rounded border border-dashed flex items-center justify-center text-muted-foreground">
                                <ImageIcon className="h-6 w-6" />
                              </div>
                            )}
                          </div>
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
                                <div className="flex items-start gap-4 pt-2 border-t">
                                  <div className="flex-1 space-y-2">
                                    <label className="text-xs font-medium text-muted-foreground block">
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
                                    {/* Photo Dates */}
                                    {uv.photo_added_at && (
                                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                        <span>
                                          Uploaded: {new Date(uv.photo_added_at).toLocaleDateString()}
                                        </span>
                                        <span className={photoStale ? 'text-amber-600 font-medium' : ''}>
                                          Expires: {(() => {
                                            const date = new Date(uv.photo_added_at);
                                            date.setMonth(date.getMonth() + 10);
                                            return date.toLocaleDateString();
                                          })()}
                                        </span>
                                      </div>
                                    )}
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
                                          <span className="text-xs">Review needed<br/>(10+ months)</span>
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
                    <div className="flex items-center gap-2">
                      {/* Show Sync button if manufacturer is also distributor */}
                      {(() => {
                        const manufacturerName = form.watch('manufacturer');
                        const selectedManufacturer = manufacturers?.find(m => m.name === manufacturerName);
                        if (selectedManufacturer && selectedManufacturer.supplier_type === 'manufacturer_distributor') {
                          return (
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              onClick={() => autoPopulateSuppliersForManufacturer(selectedManufacturer.id, form.getValues('item_number'))}
                            >
                              <Download className="h-4 w-4 mr-1" /> Sync from Manufacturer
                            </Button>
                          );
                        }
                        return null;
                      })()}
                      <Button type="button" variant="outline" size="sm" onClick={addMaterialSupplier}>
                        <Plus className="h-4 w-4 mr-1" /> Add Supplier
                      </Button>
                    </div>
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
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowArchivedDocs(!showArchivedDocs)}
                        className="text-muted-foreground"
                      >
                        {showArchivedDocs ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                        {showArchivedDocs ? 'Hide Archived' : 'Show Archived'}
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={addDocument}>
                        <Plus className="h-4 w-4 mr-1" /> Add Document
                      </Button>
                    </div>
                  </div>

                  {!material && (
                    <div className="p-4 border rounded-md bg-amber-500/10 border-amber-500/30">
                      <p className="text-sm text-amber-700 dark:text-amber-400">
                        💡 Save the material first to upload documents.
                      </p>
                    </div>
                  )}

                  {documents.filter(d => showArchivedDocs || !d.is_archived).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border rounded-md bg-muted/20">
                      <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No documents uploaded.</p>
                      <p className="text-xs mt-1">Click "Add Document" to upload specs, COAs, or SDS sheets.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {documents.filter(d => showArchivedDocs || !d.is_archived).map((doc) => {
                        const index = documents.findIndex(d => d === doc);
                        const requirement = documentRequirements?.find(r => r.id === doc.requirement_id);
                        
                        return (
                          <div key={index} className={`p-4 border rounded-md bg-card space-y-4 ${doc.is_archived ? 'opacity-60 bg-muted/30' : ''}`}>
                            {doc.is_archived && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground pb-2 border-b">
                                <Archive className="h-4 w-4" />
                                <span>Archived{doc.archived_at ? ` on ${new Date(doc.archived_at).toLocaleDateString()}` : ''}</span>
                              </div>
                            )}
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
                                      disabled={!doc.isNew || doc.is_archived}
                                      className={!doc.isNew ? 'bg-muted cursor-not-allowed' : ''}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                                      Document Type
                                    </label>
                                    <Select
                                      value={doc.requirement_id || '__none__'}
                                      onValueChange={(value) => updateDocument(index, 'requirement_id', value === '__none__' ? undefined : value)}
                                      disabled={!doc.isNew || doc.is_archived}
                                    >
                                      <SelectTrigger className={!doc.isNew ? 'bg-muted cursor-not-allowed' : ''}>
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
                                      {doc.file_path ? 'Current File' : 'Upload File'}
                                    </label>
                                    {doc.file_path && !doc.file ? (
                                      <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="gap-1">
                                          <FileText className="h-3 w-3" />
                                          Uploaded
                                        </Badge>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => downloadDocument(doc)}
                                        >
                                          <Download className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="flex gap-2">
                                        <Input
                                          type="file"
                                          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                                          onChange={(e) => handleFileUpload(e, index)}
                                          disabled={!material || !doc.isNew || doc.is_archived}
                                          className={`flex-1 ${!doc.isNew ? 'bg-muted cursor-not-allowed' : ''}`}
                                        />
                                      </div>
                                    )}
                                    {doc.file && (
                                      <p className="text-xs text-green-600 mt-1">
                                        ✓ New file selected: {doc.file.name}
                                      </p>
                                    )}
                                  </div>
                                  <div></div>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                  <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                                      Date Published
                                    </label>
                                    <Input
                                      type="date"
                                      value={doc.date_published || ''}
                                      onChange={(e) => updateDocument(index, 'date_published', e.target.value || undefined)}
                                      disabled={!doc.isNew || doc.is_archived}
                                      className={!doc.isNew ? 'bg-muted cursor-not-allowed' : ''}
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
                                      disabled={!doc.isNew || doc.is_archived}
                                      className={!doc.isNew ? 'bg-muted cursor-not-allowed' : ''}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                                      Expiry Date
                                    </label>
                                    <Input
                                      type="date"
                                      value={doc.expiry_date || ''}
                                      onChange={(e) => updateDocument(index, 'expiry_date', e.target.value || undefined)}
                                      disabled={!doc.isNew || doc.is_archived}
                                      className={!doc.isNew ? 'bg-muted cursor-not-allowed' : ''}
                                    />
                                    {doc.expiry_date && (
                                      <div className="mt-1">
                                        <DocumentExpiryBadge expiryDate={doc.expiry_date} size="sm" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col gap-2">
                                {!doc.isNew && !doc.is_archived && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleArchiveClick(index, doc.document_name, doc.expiry_date)}
                                  >
                                    <Archive className="h-4 w-4 mr-1" />
                                    Archive
                                  </Button>
                                )}
                                {doc.is_archived && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => restoreDocument(index)}
                                  >
                                    <ArchiveRestore className="h-4 w-4 mr-1" />
                                    Restore
                                  </Button>
                                )}
                                {doc.isNew && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive shrink-0"
                                    onClick={() => removeDocument(index)}
                                    title="Remove"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
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

              {/* QA Workflow Tab */}
              <TabsContent value="qa-workflow" className="space-y-6 mt-4">
                {!material ? (
                  <div className="text-center py-12 text-muted-foreground border rounded-md bg-muted/20">
                    <ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Save the material first to access QA workflow.</p>
                    <p className="text-xs mt-1">QA status, approval actions, and compliance documents will be available after creation.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Current Status Section */}
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Current QA Status</p>
                          <ApprovalStatusBadge 
                            status={(material as any).approval_status || 'Draft'} 
                            size="lg" 
                          />
                        </div>
                      </div>
                      <ApprovalActionsDropdown
                        recordId={material.id}
                        tableName="materials"
                        currentStatus={(material as any).approval_status || 'Draft'}
                      />
                    </div>

                    {/* Status Dropdown */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="approval_status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>QA Status</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {QA_APPROVAL_STATUSES.map((status) => (
                                  <SelectItem key={status.value} value={status.value}>
                                    {status.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>Current QA approval status</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Document Compliance Summary */}
                    <DocumentComplianceSummary
                      documents={documents.map(d => ({
                        id: d.id || `temp-${Math.random()}`,
                        document_name: d.document_name,
                        requirement_id: d.requirement_id,
                        expiry_date: d.expiry_date,
                        file_path: d.file_path,
                        file_url: d.file_url,
                        is_archived: d.is_archived,
                      }))}
                      requirements={documentRequirements || []}
                      entityType="material"
                    />

                    {/* Approval History */}
                    <div>
                      <h4 className="text-sm font-medium mb-3">Approval History</h4>
                      <ApprovalHistoryPanel
                        recordId={material.id}
                        tableName="materials"
                      />
                    </div>
                  </div>
                )}
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

    {/* Archive Non-Expired Document Confirmation Dialog */}
    <AlertDialog open={!!documentToArchive} onOpenChange={(open) => !open && setDocumentToArchive(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive Document?</AlertDialogTitle>
          <AlertDialogDescription>
            This document has not expired yet. Are you sure you want to archive "{documentToArchive?.name || 'this document'}"?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>No</AlertDialogCancel>
          <AlertDialogAction 
            onClick={() => {
              if (documentToArchive) {
                archiveDocument(documentToArchive.index);
              }
              setDocumentToArchive(null);
            }}
          >
            Yes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
}
