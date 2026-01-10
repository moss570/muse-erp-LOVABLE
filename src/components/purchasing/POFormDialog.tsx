import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import type { Tables } from '@/integrations/supabase/types';

type PurchaseOrder = Tables<'purchase_orders'>;

const APPROVAL_THRESHOLD = 5000; // POs over this amount require approval

interface POLineItem {
  id: string;
  material_id: string;
  material_name?: string;
  material_supplier_id?: string; // The material_suppliers record ID
  unit_id: string;
  unit_code?: string;
  pack_size?: string; // Unit name/code for display
  our_item_number?: string; // material_purchase_units.item_number or materials.item_number
  supplier_item_number?: string; // material_suppliers.supplier_item_number
  manufacturer_item_number?: string; // materials.item_number (from manufacturer)
  usage_uom?: string; // Usage unit name/code
  usage_unit_conversion?: number; // Conversion factor from pack unit to usage unit
  pack_to_base_conversion?: number; // Conversion from pack unit to base unit
  quantity_ordered: number;
  unit_cost: number;
  line_total: number;
  notes?: string;
  isNew: boolean;
}

const poSchema = z.object({
  supplier_id: z.string().min(1, 'Supplier is required'),
  order_date: z.string().min(1, 'Order date is required'),
  expected_delivery_date: z.string().optional(),
  delivery_location_id: z.string().optional(),
  shipping_method: z.string().optional(),
  shipping_terms: z.string().optional(),
  notes: z.string().optional(),
  internal_notes: z.string().optional(),
});

type POFormData = z.infer<typeof poSchema>;

interface POFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrder: PurchaseOrder | null;
}

export function POFormDialog({ open, onOpenChange, purchaseOrder }: POFormDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [lineItems, setLineItems] = useState<POLineItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<POFormData>({
    resolver: zodResolver(poSchema),
    defaultValues: {
      supplier_id: '',
      order_date: format(new Date(), 'yyyy-MM-dd'),
      expected_delivery_date: '',
      delivery_location_id: '',
      shipping_method: '',
      shipping_terms: '',
      notes: '',
      internal_notes: '',
    },
  });

  const selectedSupplierId = form.watch('supplier_id');

  // Fetch suppliers
  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name, code, payment_terms')
        .eq('is_active', true)
        .eq('approval_status', 'approved')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch locations
  const { data: locations } = useQuery({
    queryKey: ['locations-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, location_code')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch materials linked to selected supplier (ONLY show supplier-linked materials)
  const { data: supplierMaterials } = useQuery({
    queryKey: ['supplier-materials', selectedSupplierId],
    queryFn: async () => {
      if (!selectedSupplierId) return [];
      const { data, error } = await supabase
        .from('material_suppliers')
        .select(`
          *,
          material:materials(
            id, 
            name, 
            code, 
            item_number,
            base_unit_id, 
            base_unit:units_of_measure!materials_base_unit_id_fkey(id, code, name),
            usage_unit_id,
            usage_unit:units_of_measure!materials_usage_unit_id_fkey(id, code, name),
            usage_unit_conversion
          ),
          unit:units_of_measure(id, code, name),
          purchase_unit:material_purchase_units(id, code, unit_id, item_number, conversion_to_base, unit:units_of_measure(id, code, name))
        `)
        .eq('supplier_id', selectedSupplierId)
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedSupplierId,
  });

  // Build filtered materials list from supplier links only
  // Each material_suppliers row represents a purchasable item (could be base unit or a variant)
  const availableMaterials = supplierMaterials?.map(sm => {
    const purchaseUnit = sm.purchase_unit as any;
    const material = sm.material as any;
    const supplierUnit = sm.unit as any;
    
    // Determine pack size (unit) - prefer purchase unit's unit, then supplier unit, then base unit
    const packUnit = purchaseUnit?.unit || supplierUnit || material?.base_unit;
    // Our item number: material code + variant suffix (if applicable)
    const ourItemNumber = purchaseUnit?.code ? `${material?.code || ''}${purchaseUnit.code}` : material?.code;
    
    // Usage UOM info
    const usageUnit = material?.usage_unit;
    const usageUnitConversion = material?.usage_unit_conversion;
    
    // Pack to base conversion (from purchase unit, or 1 if it's the base unit)
    const packToBaseConversion = purchaseUnit?.conversion_to_base || 1;
    
    return {
      material_supplier_id: sm.id, // Use material_suppliers.id as the unique key
      material_id: material?.id,
      material_name: material?.name,
      material_code: material?.code,
      base_unit_id: material?.base_unit_id,
      base_unit: material?.base_unit,
      // Pack size info
      pack_size: packUnit?.name || packUnit?.code || '',
      pack_unit_id: packUnit?.id || sm.unit_id || material?.base_unit_id,
      pack_unit_code: packUnit?.code || '',
      // Item numbers
      our_item_number: ourItemNumber || '',
      supplier_item_number: sm.supplier_item_number || '',
      manufacturer_item_number: material?.item_number || '',
      // Usage UOM
      usage_uom: usageUnit?.name || usageUnit?.code || material?.base_unit?.name || material?.base_unit?.code || '',
      usage_unit_conversion: usageUnitConversion || 1,
      pack_to_base_conversion: packToBaseConversion,
      // Cost
      cost_per_unit: sm.cost_per_unit,
      // Purchase unit info
      purchase_unit_id: sm.purchase_unit_id,
      purchase_unit_code: purchaseUnit?.code || '',
    };
  }).filter(m => m.material_id) || [];

  // Fetch units
  const { data: units } = useQuery({
    queryKey: ['units-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('units_of_measure')
        .select('id, code, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch existing line items when editing
  const { data: existingItems } = useQuery({
    queryKey: ['po-items', purchaseOrder?.id],
    queryFn: async () => {
      if (!purchaseOrder?.id) return [];
      const { data, error } = await supabase
        .from('purchase_order_items')
        .select(`
          *,
          material:materials(
            id, 
            name, 
            code, 
            item_number,
            usage_unit_id,
            usage_unit:units_of_measure!materials_usage_unit_id_fkey(id, code, name),
            usage_unit_conversion,
            base_unit:units_of_measure!materials_base_unit_id_fkey(id, code, name)
          ),
          unit:units_of_measure(id, code, name)
        `)
        .eq('purchase_order_id', purchaseOrder.id)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!purchaseOrder?.id,
  });

  // Load data when editing
  useEffect(() => {
    if (purchaseOrder) {
      form.reset({
        supplier_id: purchaseOrder.supplier_id,
        order_date: purchaseOrder.order_date,
        expected_delivery_date: purchaseOrder.expected_delivery_date || '',
        delivery_location_id: purchaseOrder.delivery_location_id || '',
        shipping_method: purchaseOrder.shipping_method || '',
        shipping_terms: purchaseOrder.shipping_terms || '',
        notes: purchaseOrder.notes || '',
        internal_notes: purchaseOrder.internal_notes || '',
      });
    } else {
      form.reset({
        supplier_id: '',
        order_date: format(new Date(), 'yyyy-MM-dd'),
        expected_delivery_date: '',
        delivery_location_id: '',
        shipping_method: '',
        shipping_terms: '',
        notes: '',
        internal_notes: '',
      });
      setLineItems([]);
    }
  }, [purchaseOrder, form]);

  // Load existing items
  useEffect(() => {
    if (existingItems) {
      setLineItems(existingItems.map(item => {
        const material = item.material as any;
        const usageUnit = material?.usage_unit;
        const baseUnit = material?.base_unit;
        
        return {
          id: item.id,
          material_id: item.material_id,
          material_name: material?.name,
          unit_id: item.unit_id,
          unit_code: (item.unit as any)?.code,
          pack_size: (item.unit as any)?.name || (item.unit as any)?.code,
          our_item_number: material?.item_number || '',
          supplier_item_number: item.supplier_item_number || '',
          manufacturer_item_number: material?.item_number || '',
          usage_uom: usageUnit?.name || usageUnit?.code || baseUnit?.name || baseUnit?.code || '',
          usage_unit_conversion: material?.usage_unit_conversion || 1,
          pack_to_base_conversion: 1, // Will be properly set when selecting from dropdown
          quantity_ordered: item.quantity_ordered,
          unit_cost: item.unit_cost,
          line_total: item.line_total || 0,
          notes: item.notes || undefined,
          isNew: false,
        };
      }));
    }
  }, [existingItems]);

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        id: `new-${Date.now()}`,
        material_id: '',
        material_supplier_id: '',
        unit_id: '',
        pack_size: '',
        our_item_number: '',
        supplier_item_number: '',
        manufacturer_item_number: '',
        usage_uom: '',
        usage_unit_conversion: 1,
        pack_to_base_conversion: 1,
        quantity_ordered: 1,
        unit_cost: 0,
        line_total: 0,
        isNew: true,
      },
    ]);
  };

  const updateLineItem = (index: number, field: keyof POLineItem, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    
    // Recalculate line total
    if (field === 'quantity_ordered' || field === 'unit_cost') {
      updated[index].line_total = updated[index].quantity_ordered * updated[index].unit_cost;
    }
    
    // If material_supplier selection changed, populate all fields from the supplier-linked data
    if (field === 'material_supplier_id') {
      const supplierMaterial = availableMaterials?.find(m => m.material_supplier_id === value);
      if (supplierMaterial) {
        updated[index].material_id = supplierMaterial.material_id;
        updated[index].material_name = supplierMaterial.material_name;
        updated[index].unit_id = supplierMaterial.pack_unit_id;
        updated[index].unit_code = supplierMaterial.pack_unit_code;
        updated[index].pack_size = supplierMaterial.pack_size;
        updated[index].our_item_number = supplierMaterial.our_item_number;
        updated[index].supplier_item_number = supplierMaterial.supplier_item_number;
        updated[index].manufacturer_item_number = supplierMaterial.manufacturer_item_number;
        updated[index].usage_uom = supplierMaterial.usage_uom;
        updated[index].usage_unit_conversion = supplierMaterial.usage_unit_conversion;
        updated[index].pack_to_base_conversion = supplierMaterial.pack_to_base_conversion;
        updated[index].unit_cost = Number(supplierMaterial.cost_per_unit) || 0;
        updated[index].line_total = updated[index].quantity_ordered * updated[index].unit_cost;
      }
    }
    
    setLineItems(updated);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return lineItems.reduce((sum, item) => sum + item.line_total, 0);
  };

  const createMutation = useMutation({
    mutationFn: async (data: POFormData) => {
      const total = calculateTotal();
      const requiresApproval = total >= APPROVAL_THRESHOLD;
      
      // Generate PO number
      const { data: poNumber, error: poNumError } = await supabase
        .rpc('generate_po_number', { p_order_date: data.order_date });
      if (poNumError) throw poNumError;
      
      // Create PO
      const { data: newPO, error: poError } = await supabase
        .from('purchase_orders')
        .insert({
          po_number: poNumber,
          supplier_id: data.supplier_id,
          order_date: data.order_date,
          expected_delivery_date: data.expected_delivery_date || null,
          delivery_location_id: data.delivery_location_id || null,
          shipping_method: data.shipping_method || null,
          shipping_terms: data.shipping_terms || null,
          notes: data.notes || null,
          internal_notes: data.internal_notes || null,
          status: 'draft',
          requires_approval: requiresApproval,
          subtotal: total,
          total_amount: total,
          created_by: user?.id,
        })
        .select()
        .single();
      if (poError) throw poError;
      
      // Create line items
      if (lineItems.length > 0) {
        const items = lineItems.map((item, index) => ({
          purchase_order_id: newPO.id,
          material_id: item.material_id,
          unit_id: item.unit_id,
          quantity_ordered: item.quantity_ordered,
          unit_cost: item.unit_cost,
          line_total: item.line_total,
          supplier_item_number: item.supplier_item_number || null,
          notes: item.notes || null,
          sort_order: index,
        }));
        
        const { error: itemsError } = await supabase
          .from('purchase_order_items')
          .insert(items);
        if (itemsError) throw itemsError;
      }
      
      return newPO;
    },
    onSuccess: (newPO) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast({ 
        title: 'Purchase Order created', 
        description: `PO ${newPO.po_number} has been created${newPO.requires_approval ? ' and requires approval' : ''}.`
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating PO', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: POFormData) => {
      if (!purchaseOrder) return;
      
      const total = calculateTotal();
      const requiresApproval = total >= APPROVAL_THRESHOLD;
      
      // Update PO
      const { error: poError } = await supabase
        .from('purchase_orders')
        .update({
          supplier_id: data.supplier_id,
          order_date: data.order_date,
          expected_delivery_date: data.expected_delivery_date || null,
          delivery_location_id: data.delivery_location_id || null,
          shipping_method: data.shipping_method || null,
          shipping_terms: data.shipping_terms || null,
          notes: data.notes || null,
          internal_notes: data.internal_notes || null,
          requires_approval: requiresApproval,
          subtotal: total,
          total_amount: total,
        })
        .eq('id', purchaseOrder.id);
      if (poError) throw poError;
      
      // Delete removed items
      const existingIds = existingItems?.map(i => i.id) || [];
      const currentIds = lineItems.filter(i => !i.isNew).map(i => i.id);
      const deletedIds = existingIds.filter(id => !currentIds.includes(id));
      
      if (deletedIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('purchase_order_items')
          .delete()
          .in('id', deletedIds);
        if (deleteError) throw deleteError;
      }
      
      // Upsert items
      for (const item of lineItems) {
        if (item.isNew) {
          const { error } = await supabase
            .from('purchase_order_items')
            .insert({
              purchase_order_id: purchaseOrder.id,
              material_id: item.material_id,
              unit_id: item.unit_id,
              quantity_ordered: item.quantity_ordered,
              unit_cost: item.unit_cost,
              line_total: item.line_total,
              supplier_item_number: item.supplier_item_number || null,
              notes: item.notes || null,
              sort_order: lineItems.indexOf(item),
            });
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('purchase_order_items')
            .update({
              material_id: item.material_id,
              unit_id: item.unit_id,
              quantity_ordered: item.quantity_ordered,
              unit_cost: item.unit_cost,
              line_total: item.line_total,
              supplier_item_number: item.supplier_item_number || null,
              notes: item.notes || null,
              sort_order: lineItems.indexOf(item),
            })
            .eq('id', item.id);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['po-items'] });
      toast({ title: 'Purchase Order updated successfully' });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating PO', description: error.message, variant: 'destructive' });
    },
  });

  const onSubmit = async (data: POFormData) => {
    if (lineItems.length === 0) {
      toast({ title: 'Please add at least one line item', variant: 'destructive' });
      return;
    }
    
    if (lineItems.some(item => !item.material_id)) {
      toast({ title: 'All line items must have a material selected', variant: 'destructive' });
      return;
    }
    
    setIsSubmitting(true);
    try {
      if (purchaseOrder) {
        await updateMutation.mutateAsync(data);
      } else {
        await createMutation.mutateAsync(data);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const total = calculateTotal();
  const requiresApproval = total >= APPROVAL_THRESHOLD;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {purchaseOrder ? `Edit PO: ${purchaseOrder.po_number}` : 'Create Purchase Order'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Header Fields */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="supplier_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select supplier" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {suppliers?.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} ({s.code})
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
                name="order_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expected_delivery_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected Delivery</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="delivery_location_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery Location</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {locations?.map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.name} ({l.location_code})
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
                name="shipping_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shipping Method</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Truck, Air, Ocean" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="shipping_terms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shipping Terms</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select terms" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="fob_origin">FOB Origin</SelectItem>
                        <SelectItem value="fob_destination">FOB Destination</SelectItem>
                        <SelectItem value="cif">CIF</SelectItem>
                        <SelectItem value="exw">EXW</SelectItem>
                        <SelectItem value="dap">DAP</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Line Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Line Items</h3>
                <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>

              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-2 text-left min-w-[200px]">Material</th>
                      <th className="p-2 text-left min-w-[80px]">Pack Size</th>
                      <th className="p-2 text-left min-w-[80px]">Usage UOM</th>
                      <th className="p-2 text-left min-w-[100px]">Our Item #</th>
                      <th className="p-2 text-left min-w-[100px]">Supplier Item #</th>
                      <th className="p-2 text-left min-w-[100px]">Mfg Item #</th>
                      <th className="p-2 text-right min-w-[80px]">Qty</th>
                      <th className="p-2 text-right min-w-[100px]">Unit Cost</th>
                      <th className="p-2 text-right min-w-[100px]">Line Total</th>
                      <th className="p-2 w-[50px]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-4 text-center text-muted-foreground">
                          No items added. Click "Add Item" to begin.
                        </td>
                      </tr>
                    ) : (
                      lineItems.map((item, index) => (
                        <tr key={item.id} className="border-b last:border-0">
                          <td className="p-2">
                            <Select
                              value={item.material_supplier_id || ''}
                              onValueChange={(val) => updateLineItem(index, 'material_supplier_id', val)}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="Select product">
                                  {item.material_name || 'Select product'}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {availableMaterials?.map((m) => (
                                  <SelectItem key={m.material_supplier_id} value={m.material_supplier_id}>
                                    {m.material_name} {m.purchase_unit_code ? `(${m.purchase_unit_code})` : ''} - {m.pack_size}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-2 text-muted-foreground">
                            {item.pack_size || item.unit_code || '-'}
                          </td>
                          <td className="p-2 text-muted-foreground">
                            {item.usage_uom || '-'}
                          </td>
                          <td className="p-2 text-muted-foreground font-mono text-xs">
                            {item.our_item_number || '-'}
                          </td>
                          <td className="p-2 text-muted-foreground font-mono text-xs">
                            {item.supplier_item_number || '-'}
                          </td>
                          <td className="p-2 text-muted-foreground font-mono text-xs">
                            {item.manufacturer_item_number || '-'}
                          </td>
                          <td className="p-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Input
                                    type="number"
                                    className="h-8 text-right w-20 cursor-help"
                                    value={item.quantity_ordered}
                                    onChange={(e) => updateLineItem(index, 'quantity_ordered', parseFloat(e.target.value) || 0)}
                                    min="0"
                                    step="0.01"
                                  />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  {item.usage_uom && item.pack_to_base_conversion && item.usage_unit_conversion ? (
                                    <div className="text-sm">
                                      <p className="font-medium mb-1">Usage Calculation:</p>
                                      <p>
                                        {item.quantity_ordered} × {item.pack_size || 'unit'} = {' '}
                                        <span className="font-bold">
                                          {(item.quantity_ordered * (item.pack_to_base_conversion || 1) * (item.usage_unit_conversion || 1)).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                                        </span>
                                        {' '}{item.usage_uom}
                                      </p>
                                    </div>
                                  ) : (
                                    <p className="text-sm text-muted-foreground">No usage conversion set</p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              className="h-8 text-right w-24"
                              value={item.unit_cost}
                              onChange={(e) => updateLineItem(index, 'unit_cost', parseFloat(e.target.value) || 0)}
                              min="0"
                              step="0.01"
                            />
                          </td>
                          <td className="p-2 text-right font-medium whitespace-nowrap">
                            ${item.line_total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => removeLineItem(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {lineItems.length > 0 && (
                    <tfoot>
                      <tr className="bg-muted/50">
                        <td colSpan={8} className="p-2 text-right font-medium">
                          Subtotal:
                        </td>
                        <td className="p-2 text-right font-bold">
                          ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {requiresApproval && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200">
                  <span className="text-sm">
                    ⚠️ This PO exceeds ${APPROVAL_THRESHOLD.toLocaleString()} and will require approval before sending.
                  </span>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (visible on PO)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Notes to supplier..." 
                        className="resize-none h-20"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="internal_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Internal Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Internal notes..." 
                        className="resize-none h-20"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {purchaseOrder ? 'Update PO' : 'Create PO'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
