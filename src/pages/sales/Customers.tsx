import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Pencil, 
  Trash2, 
  Users,
  Mail,
  Phone,
  Building2,
} from 'lucide-react';
import { DataTableHeader, StatusIndicator } from '@/components/ui/data-table';
import { DataTablePagination } from '@/components/ui/data-table/DataTablePagination';
import { usePermissions } from '@/hooks/usePermission';
import { 
  UnsavedChangesDialog,
  ViewModeValue,
} from '@/components/ui/staged-edit';
import { useStagedEdit } from '@/hooks/useStagedEdit';
import type { Tables } from '@/integrations/supabase/types';

const CUSTOMER_TYPES = [
  { value: 'retail', label: 'Retail' },
  { value: 'wholesale', label: 'Wholesale' },
  { value: 'distributor', label: 'Distributor' },
  { value: 'food_service', label: 'Food Service' },
  { value: 'ecommerce', label: 'E-Commerce' },
  { value: 'broker', label: 'Broker' },
  { value: 'other', label: 'Other' },
] as const;

const PAYMENT_TERMS = [
  { value: 'cod', label: 'COD' },
  { value: 'net15', label: 'Net 15' },
  { value: 'net30', label: 'Net 30' },
  { value: 'net45', label: 'Net 45' },
  { value: 'net60', label: 'Net 60' },
  { value: 'prepaid', label: 'Prepaid' },
  { value: 'credit_card', label: 'Credit Card' },
] as const;

const customerSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  customer_type: z.string().default('retail'),
  contact_name: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  fax: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().default('USA'),
  payment_terms: z.string().optional(),
  credit_limit: z.coerce.number().min(0).optional(),
  tax_exempt: z.boolean().default(true), // Default to tax exempt for wholesale
  tax_id: z.string().optional(),
  notes: z.string().optional(),
  is_active: z.boolean().default(true),
  // Customer hierarchy fields
  parent_company_id: z.string().uuid().optional().nullable(),
  is_master_company: z.boolean().default(false),
  location_name: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;
type Customer = Tables<'customers'>;

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const TYPE_FILTER_OPTIONS = [
  { value: 'all', label: 'All Types' },
  ...CUSTOMER_TYPES.map(t => ({ value: t.value, label: t.label })),
];

// Separate dialog component to use staged edit hooks
function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  canEdit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  canEdit: boolean;
}) {
  const [activeTab, setActiveTab] = useState('general');
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isNewCustomer = !customer;

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      code: '',
      name: '',
      customer_type: 'retail',
      contact_name: '',
      email: '',
      phone: '',
      fax: '',
      website: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      country: 'USA',
      payment_terms: '',
      credit_limit: undefined,
      tax_exempt: true, // Default to tax exempt for wholesale
      tax_id: '',
      notes: '',
      is_active: true,
      parent_company_id: null,
      is_master_company: false,
      location_name: '',
    },
  });

  // Fetch master companies for parent dropdown
  const { data: masterCompanies } = useQuery({
    queryKey: ['master-companies'],
    queryFn: async (): Promise<any> => {
      const { data, error } = await (supabase
        .from('customers') as any)
        .select('id, code, name')
        .eq('is_master_company', true)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Reset form when customer changes
  useEffect(() => {
    if (customer) {
      form.reset({
        code: customer.code,
        name: customer.name,
        customer_type: customer.customer_type || 'retail',
        contact_name: customer.contact_name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        fax: customer.fax || '',
        website: customer.website || '',
        address: customer.address || '',
        city: customer.city || '',
        state: customer.state || '',
        zip: customer.zip || '',
        country: customer.country || 'USA',
        payment_terms: customer.payment_terms || '',
        credit_limit: customer.credit_limit ? Number(customer.credit_limit) : undefined,
        tax_exempt: customer.tax_exempt || false,
        tax_id: customer.tax_id || '',
        notes: customer.notes || '',
        is_active: customer.is_active ?? true,
        parent_company_id: customer.parent_company_id || null,
        is_master_company: customer.is_master_company || false,
        location_name: customer.location_name || '',
      });
    } else {
      form.reset({
        code: '',
        name: '',
        customer_type: 'retail',
        contact_name: '',
        email: '',
        phone: '',
        fax: '',
        website: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        country: 'USA',
        payment_terms: '',
        credit_limit: undefined,
        tax_exempt: false,
        tax_id: '',
        notes: '',
        is_active: true,
        parent_company_id: null,
        is_master_company: false,
        location_name: '',
      });
    }
    setActiveTab('general');
  }, [customer, form]);

  const stagedEdit = useStagedEdit({
    resourceType: 'customer',
    resourceId: customer?.id,
    tableName: 'customers',
    form,
    initialData: customer ? {
      code: customer.code,
      name: customer.name,
      customer_type: customer.customer_type || 'retail',
      contact_name: customer.contact_name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      fax: customer.fax || '',
      website: customer.website || '',
      address: customer.address || '',
      city: customer.city || '',
      state: customer.state || '',
      zip: customer.zip || '',
      country: customer.country || 'USA',
      payment_terms: customer.payment_terms || '',
      credit_limit: customer.credit_limit ? Number(customer.credit_limit) : undefined,
      tax_exempt: customer.tax_exempt || false,
      tax_id: customer.tax_id || '',
      notes: customer.notes || '',
      is_active: customer.is_active ?? true,
      parent_company_id: customer.parent_company_id || null,
      is_master_company: customer.is_master_company || false,
      location_name: customer.location_name || '',
    } : null,
    enabled: open && !!customer,
    resourceName: 'Customer',
    canEdit,
    onDataRefresh: (data) => {
      form.reset(data as CustomerFormData);
    },
  });

  // For new customers, always start in edit mode
  useEffect(() => {
    if (open && isNewCustomer) {
      stagedEdit.startEdit();
    }
  }, [open, isNewCustomer, stagedEdit.startEdit]);

  const createMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const { error } = await supabase.from('customers').insert([{
        code: data.code,
        name: data.name,
        customer_type: data.customer_type,
        country: data.country,
        is_active: data.is_active,
        contact_name: data.contact_name || null,
        email: data.email || null,
        phone: data.phone || null,
        fax: data.fax || null,
        website: data.website || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        zip: data.zip || null,
        payment_terms: data.payment_terms || null,
        credit_limit: data.credit_limit || null,
        tax_exempt: data.tax_exempt,
        tax_id: data.tax_id || null,
        notes: data.notes || null,
        parent_company_id: data.parent_company_id || null,
        is_master_company: data.is_master_company,
        location_name: data.location_name || null,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['master-companies'] });
      toast({ title: 'Customer created successfully' });
      stagedEdit.setIsSaving(false);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating customer', description: error.message, variant: 'destructive' });
      stagedEdit.setIsSaving(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: CustomerFormData & { id: string }) => {
      const { id, ...rest } = data;
      const { error } = await supabase
        .from('customers')
        .update({
          code: rest.code,
          name: rest.name,
          customer_type: rest.customer_type,
          country: rest.country,
          is_active: rest.is_active,
          contact_name: rest.contact_name || null,
          email: rest.email || null,
          phone: rest.phone || null,
          fax: rest.fax || null,
          website: rest.website || null,
          address: rest.address || null,
          city: rest.city || null,
          state: rest.state || null,
          zip: rest.zip || null,
          payment_terms: rest.payment_terms || null,
          credit_limit: rest.credit_limit || null,
          tax_exempt: rest.tax_exempt,
          tax_id: rest.tax_id || null,
          notes: rest.notes || null,
          parent_company_id: rest.parent_company_id || null,
          is_master_company: rest.is_master_company,
          location_name: rest.location_name || null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['master-companies'] });
      toast({ title: 'Customer updated successfully' });
      stagedEdit.setIsSaving(false);
      stagedEdit.cancelEdit();
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating customer', description: error.message, variant: 'destructive' });
      stagedEdit.setIsSaving(false);
    },
  });

  const handleSave = async () => {
    const isValid = await form.trigger();
    if (!isValid) return;

    // Check for conflicts before saving
    if (customer) {
      const { canSave } = await stagedEdit.checkBeforeSave();
      if (!canSave) return;
    }

    stagedEdit.setIsSaving(true);
    const data = form.getValues();

    if (customer) {
      updateMutation.mutate({ id: customer.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleCloseRequest = useCallback(() => {
    if (stagedEdit.isDirty) {
      setShowUnsavedDialog(true);
    } else {
      onOpenChange(false);
    }
  }, [stagedEdit.isDirty, onOpenChange]);

  const handleDiscardAndClose = () => {
    setShowUnsavedDialog(false);
    stagedEdit.cancelEdit();
    onOpenChange(false);
  };

  const handleSaveAndClose = async () => {
    setShowUnsavedDialog(false);
    await handleSave();
  };

  const getTypeLabel = (type: string) => {
    return CUSTOMER_TYPES.find(t => t.value === type)?.label || type;
  };

  const getPaymentTermsLabel = (terms: string) => {
    return PAYMENT_TERMS.find(t => t.value === terms)?.label || terms;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleCloseRequest}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {customer ? (
                  <>
                    Customer
                    <span className="text-muted-foreground font-normal">— {customer.name}</span>
                  </>
                ) : (
                  'New Customer'
                )}
              </DialogTitle>
              <div className="flex items-center gap-2">
                <EditModeIndicator 
                  isEditing={stagedEdit.isEditing}
                  otherEditors={stagedEdit.otherEditors}
                  resourceName="Customer"
                />
                {customer && !stagedEdit.isEditing && canEdit && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={stagedEdit.startEdit}
                    className="gap-1.5"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          <FormProvider {...form}>
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="address">Address</TabsTrigger>
                    <TabsTrigger value="billing">Billing</TabsTrigger>
                  </TabsList>

                  <TabsContent value="general" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <StagedFormFieldWrapper
                        name="code"
                        label="Customer Code"
                        required
                        isEditing={stagedEdit.isEditing}
                        viewRender={(value) => <span className="font-mono">{value}</span>}
                        editRender={(field) => <Input placeholder="e.g., CUST001" {...field} />}
                        readOnlyInEdit={!!customer}
                      />
                      <StagedFormFieldWrapper
                        name="name"
                        label="Company Name"
                        required
                        isEditing={stagedEdit.isEditing}
                        viewRender={(value) => <span className="font-medium">{value}</span>}
                        editRender={(field) => <Input placeholder="Customer company name" {...field} />}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <StagedFormFieldWrapper
                        name="customer_type"
                        label="Customer Type"
                        isEditing={stagedEdit.isEditing}
                        viewRender={(value) => (
                          <ViewModeValue value={getTypeLabel(value || 'retail')} type="badge" badgeVariant="outline" />
                        )}
                        editRender={(field) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {CUSTOMER_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      <StagedFormFieldWrapper
                        name="contact_name"
                        label="Primary Contact"
                        isEditing={stagedEdit.isEditing}
                        viewRender={(value) => <ViewModeValue value={value} />}
                        editRender={(field) => <Input placeholder="Contact name" {...field} />}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <StagedFormFieldWrapper
                        name="email"
                        label="Email"
                        isEditing={stagedEdit.isEditing}
                        viewRender={(value) => <ViewModeValue value={value} type="email" />}
                        editRender={(field) => <Input type="email" placeholder="email@company.com" {...field} />}
                      />
                      <StagedFormFieldWrapper
                        name="phone"
                        label="Phone"
                        isEditing={stagedEdit.isEditing}
                        viewRender={(value) => <ViewModeValue value={value} type="phone" />}
                        editRender={(field) => <Input placeholder="(555) 555-5555" {...field} />}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <StagedFormFieldWrapper
                        name="fax"
                        label="Fax"
                        isEditing={stagedEdit.isEditing}
                        viewRender={(value) => <ViewModeValue value={value} />}
                        editRender={(field) => <Input placeholder="(555) 555-5555" {...field} />}
                      />
                      <StagedFormFieldWrapper
                        name="website"
                        label="Website"
                        isEditing={stagedEdit.isEditing}
                        viewRender={(value) => <ViewModeValue value={value} type="url" />}
                        editRender={(field) => <Input placeholder="https://www.company.com" {...field} />}
                      />
                    </div>

                    <StagedFormFieldWrapper
                      name="notes"
                      label="Notes"
                      isEditing={stagedEdit.isEditing}
                      viewRender={(value) => (
                        <p className="whitespace-pre-wrap">{value || <span className="text-muted-foreground">—</span>}</p>
                      )}
                      editRender={(field) => <Textarea placeholder="Additional notes about this customer" {...field} rows={3} />}
                    />

                    <StagedFormFieldWrapper
                      name="is_active"
                      label="Status"
                      isEditing={stagedEdit.isEditing}
                      viewRender={(value) => (
                        <Badge variant={value ? 'default' : 'secondary'} className={value ? 'bg-emerald-100 text-emerald-800' : ''}>
                          {value ? 'Active' : 'Inactive'}
                        </Badge>
                      )}
                      editRender={(field) => (
                        <div className="flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <p className="text-sm font-medium">Active</p>
                            <p className="text-xs text-muted-foreground">Customer is available for orders</p>
                          </div>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </div>
                      )}
                    />
                  </TabsContent>

                  <TabsContent value="address" className="space-y-4 mt-4">
                    <StagedFormFieldWrapper
                      name="address"
                      label="Street Address"
                      isEditing={stagedEdit.isEditing}
                      viewRender={(value) => <p className="whitespace-pre-wrap">{value || <span className="text-muted-foreground">—</span>}</p>}
                      editRender={(field) => <Textarea placeholder="Street address" {...field} rows={2} />}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <StagedFormFieldWrapper
                        name="city"
                        label="City"
                        isEditing={stagedEdit.isEditing}
                        viewRender={(value) => <ViewModeValue value={value} />}
                        editRender={(field) => <Input placeholder="City" {...field} />}
                      />
                      <StagedFormFieldWrapper
                        name="state"
                        label="State/Province"
                        isEditing={stagedEdit.isEditing}
                        viewRender={(value) => <ViewModeValue value={value} />}
                        editRender={(field) => <Input placeholder="State" {...field} />}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <StagedFormFieldWrapper
                        name="zip"
                        label="ZIP/Postal Code"
                        isEditing={stagedEdit.isEditing}
                        viewRender={(value) => <ViewModeValue value={value} />}
                        editRender={(field) => <Input placeholder="ZIP code" {...field} />}
                      />
                      <StagedFormFieldWrapper
                        name="country"
                        label="Country"
                        isEditing={stagedEdit.isEditing}
                        viewRender={(value) => <ViewModeValue value={value} />}
                        editRender={(field) => <Input placeholder="Country" {...field} />}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="billing" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <StagedFormFieldWrapper
                        name="payment_terms"
                        label="Payment Terms"
                        isEditing={stagedEdit.isEditing}
                        viewRender={(value) => (
                          <ViewModeValue value={value ? getPaymentTermsLabel(value) : null} type="badge" badgeVariant="outline" />
                        )}
                        editRender={(field) => (
                          <Select 
                            onValueChange={(value) => field.onChange(value === '__none__' ? '' : value)} 
                            value={field.value || '__none__'}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select terms" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="__none__">None</SelectItem>
                              {PAYMENT_TERMS.map((term) => (
                                <SelectItem key={term.value} value={term.value}>
                                  {term.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      <StagedFormFieldWrapper
                        name="credit_limit"
                        label="Credit Limit"
                        isEditing={stagedEdit.isEditing}
                        viewRender={(value) => <ViewModeValue value={value} type="currency" />}
                        editRender={(field) => (
                          <Input 
                            type="number" 
                            placeholder="0.00" 
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          />
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <StagedFormFieldWrapper
                        name="tax_id"
                        label="Tax ID / EIN"
                        isEditing={stagedEdit.isEditing}
                        viewRender={(value) => <ViewModeValue value={value} />}
                        editRender={(field) => <Input placeholder="Tax identification number" {...field} />}
                      />
                      <StagedFormFieldWrapper
                        name="tax_exempt"
                        label="Tax Exempt"
                        isEditing={stagedEdit.isEditing}
                        viewRender={(value) => <ViewModeValue value={value} type="boolean" />}
                        editRender={(field) => (
                          <div className="flex items-center justify-between rounded-lg border p-3">
                            <div>
                              <p className="text-sm font-medium">Tax Exempt</p>
                              <p className="text-xs text-muted-foreground">Customer is exempt from sales tax</p>
                            </div>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </div>
                        )}
                      />
                    </div>

                    <div className="border-t pt-4 mt-4">
                      <h3 className="text-sm font-medium mb-4">Customer Hierarchy</h3>
                      <div className="space-y-4">
                        <StagedFormFieldWrapper
                          name="is_master_company"
                          label="Master Company"
                          isEditing={stagedEdit.isEditing}
                          viewRender={(value) => <ViewModeValue value={value} type="boolean" />}
                          editRender={(field) => (
                            <div className="flex items-center justify-between rounded-lg border p-3">
                              <div>
                                <p className="text-sm font-medium">Master Company</p>
                                <p className="text-xs text-muted-foreground">This is a parent company for consolidated billing</p>
                              </div>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </div>
                          )}
                        />

                        <StagedFormFieldWrapper
                          name="parent_company_id"
                          label="Parent Company"
                          isEditing={stagedEdit.isEditing}
                          viewRender={(value) => {
                            const parentCompany = masterCompanies?.find(c => c.id === value);
                            return <ViewModeValue value={parentCompany?.name} />;
                          }}
                          editRender={(field) => {
                            const isMasterCompany = form.watch('is_master_company');
                            return (
                              <Select
                                onValueChange={(value) => field.onChange(value === '__none__' ? null : value)}
                                value={field.value || '__none__'}
                                disabled={isMasterCompany}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder={isMasterCompany ? "N/A - This is a master company" : "Select parent company"} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="__none__">None</SelectItem>
                                  {masterCompanies?.map((company) => (
                                    <SelectItem key={company.id} value={company.id}>
                                      {company.name} ({company.code})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            );
                          }}
                        />

                        <StagedFormFieldWrapper
                          name="location_name"
                          label="Location Name"
                          isEditing={stagedEdit.isEditing}
                          viewRender={(value) => <ViewModeValue value={value} />}
                          editRender={(field) => (
                            <Input
                              placeholder="e.g., Downtown Store, Warehouse #2"
                              {...field}
                              disabled={form.watch('is_master_company')}
                            />
                          )}
                        />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Action Bar - Fixed at bottom */}
              {stagedEdit.isEditing && (
                <div className="border-t bg-background px-6 py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-muted-foreground">
                      {customer ? 'Editing Customer' : 'Creating Customer'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {customer && (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={stagedEdit.discardChanges}
                          disabled={!stagedEdit.isDirty || stagedEdit.isSaving}
                          className="text-muted-foreground"
                        >
                          Discard
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            stagedEdit.cancelEdit();
                          }}
                          disabled={stagedEdit.isSaving}
                        >
                          Cancel
                        </Button>
                      </>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSave}
                      disabled={stagedEdit.isSaving || createMutation.isPending || updateMutation.isPending}
                    >
                      {(stagedEdit.isSaving || createMutation.isPending || updateMutation.isPending) 
                        ? 'Saving...' 
                        : customer ? 'Save Changes' : 'Create Customer'}
                    </Button>
                  </div>
                </div>
              )}

              {/* View mode footer - just a close button */}
              {!stagedEdit.isEditing && customer && (
                <div className="border-t px-6 py-3 flex justify-end">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Close
                  </Button>
                </div>
              )}
          </FormProvider>
        </DialogContent>
      </Dialog>

      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onOpenChange={setShowUnsavedDialog}
        onDiscard={handleDiscardAndClose}
        onKeepEditing={() => setShowUnsavedDialog(false)}
        onSaveAndClose={handleSaveAndClose}
        isSaving={stagedEdit.isSaving || createMutation.isPending || updateMutation.isPending}
      />
    </>
  );
}

// Helper component for staged form fields without context
function StagedFormFieldWrapper({
  name,
  label,
  required,
  isEditing,
  viewRender,
  editRender,
  readOnlyInEdit,
}: {
  name: string;
  label: string;
  required?: boolean;
  isEditing: boolean;
  viewRender: (value: any) => React.ReactNode;
  editRender: (field: any) => React.ReactNode;
  readOnlyInEdit?: boolean;
}) {
  const form = useForm();
  
  // We use the parent form context
  return (
    <FormField
      name={name}
      render={({ field }) => {
        const showAsReadOnly = !isEditing || readOnlyInEdit;

        if (showAsReadOnly) {
          return (
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">
                {label}
                {required && <span className="text-destructive ml-1">*</span>}
              </label>
              <div className="text-sm min-h-[1.5rem] py-1">
                {viewRender(field.value)}
              </div>
            </div>
          );
        }

        return (
          <FormItem>
            <FormLabel>
              {label}
              {required && <span className="text-destructive ml-1">*</span>}
            </FormLabel>
            <FormControl>
              {editRender(field)}
            </FormControl>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

// Separate component for EditModeIndicator that doesn't rely on context
function EditModeIndicator({ 
  isEditing, 
  otherEditors, 
  resourceName 
}: { 
  isEditing: boolean; 
  otherEditors: any[];
  resourceName: string;
}) {
  if (!isEditing && otherEditors.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {isEditing && (
        <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-800 border-amber-200">
          <Pencil className="h-3 w-3" />
          Editing
        </Badge>
      )}

      {otherEditors.length > 0 && (
        <Badge variant="outline" className="gap-1">
          <Users className="h-3 w-3" />
          {otherEditors.length} other{otherEditors.length > 1 ? 's' : ''} editing
        </Badge>
      )}
    </div>
  );
}

export default function Customers() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { checkPermission, isAdmin } = usePermissions();

  const canCreate = isAdmin || checkPermission('customers.create', 'full');
  const canEdit = isAdmin || checkPermission('customers.edit', 'full');
  const canDelete = isAdmin || checkPermission('customers.delete', 'full');

  const { data: customers, isLoading, refetch } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Customer[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({ title: 'Customer deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting customer', description: error.message, variant: 'destructive' });
    },
  });

  const handleOpenDialog = (customer?: Customer) => {
    setEditingCustomer(customer || null);
    setIsDialogOpen(true);
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'retail': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'wholesale': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'distributor': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'food_service': return 'bg-green-100 text-green-800 border-green-200';
      case 'ecommerce': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'broker': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTypeLabel = (type: string) => {
    return CUSTOMER_TYPES.find(t => t.value === type)?.label || type;
  };

  // Filter and paginate
  const filteredCustomers = customers?.filter((c) => {
    const matchesSearch = 
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      (c.contact_name?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'active' && c.is_active) ||
      (statusFilter === 'inactive' && !c.is_active);
    const matchesType = typeFilter === 'all' || c.customer_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const totalItems = filteredCustomers?.length || 0;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedCustomers = filteredCustomers?.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-4">
      <DataTableHeader
        title="Customers"
        subtitle="Manage customer accounts and contacts"
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search customers..."
        filterValue={statusFilter}
        onFilterChange={(value) => {
          setStatusFilter(value);
          setCurrentPage(1);
        }}
        filterOptions={STATUS_FILTER_OPTIONS}
        filterPlaceholder="All Status"
        onAdd={canCreate ? () => handleOpenDialog() : undefined}
        addLabel="Add Customer"
        onRefresh={() => refetch()}
        isLoading={isLoading}
        totalCount={customers?.length}
        filteredCount={filteredCustomers?.length}
      />

      {/* Type Filter */}
      <div className="flex items-center gap-2">
        <Select value={typeFilter} onValueChange={(value) => { setTypeFilter(value); setCurrentPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_FILTER_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border bg-card">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[50px]">Status</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCustomers?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      <Users className="mx-auto h-10 w-10 mb-3 opacity-30" />
                      <p className="font-medium">No customers found</p>
                      <p className="text-sm">Try adjusting your search or filter</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedCustomers?.map((customer) => (
                    <TableRow 
                      key={customer.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleOpenDialog(customer)}
                    >
                      <TableCell>
                        <StatusIndicator status={customer.is_active ? 'active' : 'inactive'} />
                      </TableCell>
                      <TableCell className="font-mono font-medium">{customer.code}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          {customer.contact_name && (
                            <p className="text-xs text-muted-foreground">{customer.contact_name}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getTypeBadgeColor(customer.customer_type || 'other')}>
                          {getTypeLabel(customer.customer_type || 'other')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {customer.email && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              <span className="truncate max-w-[150px]">{customer.email}</span>
                            </div>
                          )}
                          {customer.phone && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <span>{customer.phone}</span>
                            </div>
                          )}
                          {!customer.email && !customer.phone && (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {customer.city && customer.state 
                          ? `${customer.city}, ${customer.state}` 
                          : customer.city || customer.state || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDialog(customer);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteMutation.mutate(customer.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {totalItems > 0 && (
              <DataTablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={totalItems}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
              />
            )}
          </>
        )}
      </div>

      <CustomerFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        customer={editingCustomer}
        canEdit={canEdit}
      />
    </div>
  );
}
