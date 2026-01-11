import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermission';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Pencil, 
  Trash2, 
  Building2, 
  Upload, 
  FileText, 
  Download, 
  X,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  Users,
  Mail,
  History
} from 'lucide-react';
import { DataTableHeader, StatusIndicator } from '@/components/ui/data-table';
import { DataTablePagination } from '@/components/ui/data-table/DataTablePagination';
import { ApprovalStatusBadge, ApprovalActionsDropdown, ApprovalHistoryPanel } from '@/components/approval';
import { ComplianceDocumentsPanel } from '@/components/approval/ComplianceDocumentsPanel';
import type { Tables } from '@/integrations/supabase/types';

const SUPPLIER_TYPES = [
  { value: 'manufacturer', label: 'Manufacturer Only' },
  { value: 'manufacturer_distributor', label: 'Manufacturer & Distributor' },
  { value: 'distributor', label: 'Distributor Only' },
] as const;

const SUPPLIER_CATEGORIES = [
  { value: 'ingredient', label: 'Ingredient' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'services', label: 'Services' },
  { value: 'chemicals', label: 'Chemicals' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'office_supplies', label: 'Office Supplies' },
  { value: 'other', label: 'Other' },
] as const;

const APPROVAL_STATUSES = [
  { value: 'pending', label: 'Pending Review', color: 'bg-yellow-500' },
  { value: 'approved', label: 'Approved', color: 'bg-green-500' },
  { value: 'conditional', label: 'Conditional Approval', color: 'bg-orange-500' },
  { value: 'suspended', label: 'Suspended', color: 'bg-red-500' },
  { value: 'rejected', label: 'Rejected', color: 'bg-destructive' },
] as const;

const RISK_LEVELS = [
  { value: 'low', label: 'Low', color: 'bg-green-500' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'critical', label: 'Critical', color: 'bg-red-500' },
] as const;

const FOOD_SAFETY_CERTS = [
  { value: 'none', label: 'None' },
  { value: 'sqf', label: 'SQF' },
  { value: 'brc', label: 'BRC' },
  { value: 'fssc22000', label: 'FSSC 22000' },
  { value: 'ifs', label: 'IFS' },
  { value: 'organic', label: 'Organic Certified' },
  { value: 'kosher', label: 'Kosher Certified' },
  { value: 'halal', label: 'Halal Certified' },
  { value: 'other', label: 'Other' },
] as const;

const PAYMENT_TERMS = [
  { value: 'cod', label: 'COD' },
  { value: 'net15', label: 'Net 15' },
  { value: 'net30', label: 'Net 30' },
  { value: 'net45', label: 'Net 45' },
  { value: 'net60', label: 'Net 60' },
  { value: 'net90', label: 'Net 90' },
  { value: '2_10_net30', label: '2/10 Net 30' },
] as const;

const supplierSchema = z.object({
  code: z.string().optional(), // Auto-generated
  name: z.string().min(1, 'Name is required'),
  supplier_type: z.string().default('manufacturer'),
  categories: z.array(z.string()).default([]),
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
  // Approval fields
  approval_status: z.string().default('pending'),
  approval_date: z.string().optional(),
  next_review_date: z.string().optional(),
  conditional_notes: z.string().optional(),
  // Classification
  risk_level: z.string().default('medium'),
  gfsi_certified: z.boolean().default(false),
  // Quality/Compliance
  food_safety_certification: z.string().optional(),
  certification_expiry_date: z.string().optional(),
  last_audit_date: z.string().optional(),
  audit_score: z.coerce.number().min(0).max(100).optional(),
  // Payment
  payment_terms: z.string().optional(),
  credit_limit: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
  is_active: z.boolean().default(true),
});

type SupplierFormData = z.infer<typeof supplierSchema>;
type Supplier = Tables<'suppliers'>;

interface DocumentUpload {
  id: string;
  document_name: string;
  requirement_id?: string;
  file?: File;
  file_path?: string;
  file_url?: string;
  date_published?: string;
  date_reviewed?: string;
  expiry_date?: string;
  isNew: boolean;
}

interface SupplierContact {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  send_po_to: boolean;
  is_primary: boolean;
  isNew: boolean;
}

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const APPROVAL_FILTER_OPTIONS = [
  { value: 'all', label: 'All Approval Status' },
  ...APPROVAL_STATUSES.map(s => ({ value: s.value, label: s.label })),
];

export default function Suppliers() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [approvalFilter, setApprovalFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [activeTab, setActiveTab] = useState('general');
  const [documents, setDocuments] = useState<DocumentUpload[]>([]);
  const [contacts, setContacts] = useState<SupplierContact[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Permission checks
  const { checkPermission, isLoading: permissionsLoading } = usePermissions();
  const canCreate = checkPermission('purchasing.suppliers', 'full');
  const canEdit = checkPermission('purchasing.suppliers', 'full');
  const canDelete = checkPermission('purchasing.suppliers', 'full');

  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      code: '',
      name: '',
      supplier_type: 'manufacturer',
      categories: [],
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
      approval_status: 'pending',
      approval_date: '',
      next_review_date: '',
      conditional_notes: '',
      risk_level: 'medium',
      gfsi_certified: false,
      food_safety_certification: '',
      certification_expiry_date: '',
      last_audit_date: '',
      audit_score: undefined,
      payment_terms: '',
      credit_limit: undefined,
      notes: '',
      is_active: true,
    },
  });

  const { data: suppliers, isLoading, refetch } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Supplier[];
    },
  });

  // Fetch document requirements for suppliers
  const { data: documentRequirements } = useQuery({
    queryKey: ['document-requirements', 'suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_requirements')
        .select('*')
        .contains('areas', ['suppliers'])
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  // Fetch existing supplier documents when editing
  const { data: existingDocuments } = useQuery({
    queryKey: ['supplier-documents', editingSupplier?.id],
    queryFn: async () => {
      if (!editingSupplier?.id) return [];
      const { data, error } = await supabase
        .from('supplier_documents')
        .select('*')
        .eq('supplier_id', editingSupplier.id);
      if (error) throw error;
      return data;
    },
    enabled: !!editingSupplier?.id,
  });

  // Fetch existing supplier contacts when editing
  const { data: existingContacts } = useQuery({
    queryKey: ['supplier-contacts', editingSupplier?.id],
    queryFn: async () => {
      if (!editingSupplier?.id) return [];
      const { data, error } = await supabase
        .from('supplier_contacts')
        .select('*')
        .eq('supplier_id', editingSupplier.id)
        .order('is_primary', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!editingSupplier?.id,
  });

  // Load existing documents when editing
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
        expiry_date: doc.expiry_date || undefined,
        isNew: false,
      })));
    }
  }, [existingDocuments]);

  // Load existing contacts when editing
  useEffect(() => {
    if (existingContacts) {
      setContacts(existingContacts.map(contact => ({
        id: contact.id,
        name: contact.name,
        role: contact.role || '',
        email: contact.email || '',
        phone: contact.phone || '',
        send_po_to: contact.send_po_to || false,
        is_primary: contact.is_primary || false,
        isNew: false,
      })));
    }
  }, [existingContacts]);

  const createMutation = useMutation({
    mutationFn: async (data: SupplierFormData) => {
      // Generate supplier code
      const { data: generatedCode, error: codeError } = await supabase
        .rpc('generate_supplier_code');
      if (codeError) throw codeError;
      
      const { data: newSupplier, error } = await supabase.from('suppliers').insert([{
        code: generatedCode,
        name: data.name,
        supplier_type: data.supplier_type,
        categories: data.categories.length > 0 ? data.categories : null,
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
        approval_status: data.approval_status,
        approval_date: data.approval_date || null,
        next_review_date: data.next_review_date || null,
        conditional_notes: data.conditional_notes || null,
        risk_level: data.risk_level,
        gfsi_certified: data.gfsi_certified,
        food_safety_certification: data.food_safety_certification || null,
        certification_expiry_date: data.certification_expiry_date || null,
        last_audit_date: data.last_audit_date || null,
        audit_score: data.audit_score || null,
        payment_terms: data.payment_terms || null,
        credit_limit: data.credit_limit || null,
        notes: data.notes || null,
      }]).select().single();
      if (error) throw error;
      
      // Upload documents and save contacts
      if (newSupplier) {
        await uploadDocuments(newSupplier.id);
        await saveContacts(newSupplier.id);
      }
      
      return newSupplier;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast({ title: 'Supplier created successfully' });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating supplier', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: SupplierFormData & { id: string }) => {
      const { id, ...rest } = data;
      const { error } = await supabase
        .from('suppliers')
        .update({
          name: rest.name,
          supplier_type: rest.supplier_type,
          categories: rest.categories.length > 0 ? rest.categories : null,
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
          approval_status: rest.approval_status,
          approval_date: rest.approval_date || null,
          next_review_date: rest.next_review_date || null,
          conditional_notes: rest.conditional_notes || null,
          risk_level: rest.risk_level,
          gfsi_certified: rest.gfsi_certified,
          food_safety_certification: rest.food_safety_certification || null,
          certification_expiry_date: rest.certification_expiry_date || null,
          last_audit_date: rest.last_audit_date || null,
          audit_score: rest.audit_score || null,
          payment_terms: rest.payment_terms || null,
          credit_limit: rest.credit_limit || null,
          notes: rest.notes || null,
        })
        .eq('id', id);
      if (error) throw error;
      
      // Upload documents and save contacts
      await uploadDocuments(id);
      await saveContacts(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-documents'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-contacts'] });
      toast({ title: 'Supplier updated successfully' });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating supplier', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('suppliers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast({ title: 'Supplier deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting supplier', description: error.message, variant: 'destructive' });
    },
  });

  const uploadDocuments = async (supplierId: string) => {
    setIsUploading(true);
    try {
      for (const doc of documents) {
        if (doc.isNew && doc.file) {
          // Upload file to storage
          const fileExt = doc.file.name.split('.').pop();
          const fileName = `${supplierId}/${Date.now()}-${doc.document_name}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('supplier-documents')
            .upload(fileName, doc.file);
          
          if (uploadError) throw uploadError;
          
          const { data: urlData } = supabase.storage
            .from('supplier-documents')
            .getPublicUrl(fileName);
          
          // Create document record
          const { error: docError } = await supabase
            .from('supplier_documents')
            .insert({
              supplier_id: supplierId,
              document_name: doc.document_name,
              requirement_id: doc.requirement_id || null,
              file_path: fileName,
              file_url: urlData.publicUrl,
              date_published: doc.date_published || null,
              date_reviewed: doc.date_reviewed || null,
              expiry_date: doc.expiry_date || null,
            });
          
          if (docError) throw docError;
        } else if (!doc.isNew) {
          // Update existing document metadata
          const { error: updateError } = await supabase
            .from('supplier_documents')
            .update({
              document_name: doc.document_name,
              requirement_id: doc.requirement_id || null,
              date_published: doc.date_published || null,
              date_reviewed: doc.date_reviewed || null,
              expiry_date: doc.expiry_date || null,
            })
            .eq('id', doc.id);
          
          if (updateError) throw updateError;
        }
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = (docId: string, file: File) => {
    setDocuments(prev => prev.map(d => 
      d.id === docId ? { ...d, file, isNew: true } : d
    ));
  };

  const addDocument = () => {
    setDocuments(prev => [...prev, {
      id: `new-${Date.now()}`,
      document_name: '',
      isNew: true,
    }]);
  };

  const removeDocument = async (docId: string, isNew: boolean) => {
    if (!isNew) {
      const { error } = await supabase
        .from('supplier_documents')
        .delete()
        .eq('id', docId);
      if (error) {
        toast({ title: 'Error deleting document', description: error.message, variant: 'destructive' });
        return;
      }
    }
    setDocuments(prev => prev.filter(d => d.id !== docId));
  };

  const updateDocument = (docId: string, field: keyof DocumentUpload, value: string) => {
    setDocuments(prev => prev.map(d => 
      d.id === docId ? { ...d, [field]: value } : d
    ));
  };

  const downloadDocument = async (filePath: string, fileName: string) => {
    const { data, error } = await supabase.storage
      .from('supplier-documents')
      .download(filePath);
    
    if (error) {
      toast({ title: 'Error downloading file', description: error.message, variant: 'destructive' });
      return;
    }
    
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Contact management functions
  const saveContacts = async (supplierId: string) => {
    for (const contact of contacts) {
      if (contact.isNew) {
        // Create new contact
        const { error } = await supabase
          .from('supplier_contacts')
          .insert({
            supplier_id: supplierId,
            name: contact.name,
            role: contact.role || null,
            email: contact.email || null,
            phone: contact.phone || null,
            send_po_to: contact.send_po_to,
            is_primary: contact.is_primary,
          });
        if (error) throw error;
      } else {
        // Update existing contact
        const { error } = await supabase
          .from('supplier_contacts')
          .update({
            name: contact.name,
            role: contact.role || null,
            email: contact.email || null,
            phone: contact.phone || null,
            send_po_to: contact.send_po_to,
            is_primary: contact.is_primary,
          })
          .eq('id', contact.id);
        if (error) throw error;
      }
    }
  };

  const addContact = () => {
    setContacts(prev => [...prev, {
      id: `new-${Date.now()}`,
      name: '',
      role: '',
      email: '',
      phone: '',
      send_po_to: false,
      is_primary: prev.length === 0, // First contact is primary by default
      isNew: true,
    }]);
  };

  const removeContact = async (contactId: string, isNew: boolean) => {
    if (!isNew) {
      const { error } = await supabase
        .from('supplier_contacts')
        .delete()
        .eq('id', contactId);
      if (error) {
        toast({ title: 'Error deleting contact', description: error.message, variant: 'destructive' });
        return;
      }
    }
    setContacts(prev => prev.filter(c => c.id !== contactId));
  };

  const updateContact = (contactId: string, field: keyof SupplierContact, value: string | boolean) => {
    setContacts(prev => prev.map(c => 
      c.id === contactId ? { ...c, [field]: value } : c
    ));
  };

  const setPrimaryContact = (contactId: string) => {
    setContacts(prev => prev.map(c => ({
      ...c,
      is_primary: c.id === contactId,
    })));
  };

  const handleOpenDialog = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      form.reset({
        code: supplier.code,
        name: supplier.name,
        supplier_type: supplier.supplier_type || 'manufacturer',
        categories: (supplier as any).categories || [],
        contact_name: supplier.contact_name || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        fax: supplier.fax || '',
        website: supplier.website || '',
        address: supplier.address || '',
        city: supplier.city || '',
        state: supplier.state || '',
        zip: supplier.zip || '',
        country: supplier.country || 'USA',
        approval_status: supplier.approval_status || 'pending',
        approval_date: supplier.approval_date || '',
        next_review_date: supplier.next_review_date || '',
        conditional_notes: supplier.conditional_notes || '',
        risk_level: supplier.risk_level || 'medium',
        gfsi_certified: supplier.gfsi_certified || false,
        food_safety_certification: supplier.food_safety_certification || '',
        certification_expiry_date: supplier.certification_expiry_date || '',
        last_audit_date: supplier.last_audit_date || '',
        audit_score: supplier.audit_score ?? undefined,
        payment_terms: supplier.payment_terms || '',
        credit_limit: supplier.credit_limit ?? undefined,
        notes: supplier.notes || '',
        is_active: supplier.is_active ?? true,
      });
    } else {
      setEditingSupplier(null);
      setDocuments([]);
      setContacts([]);
      form.reset();
    }
    setActiveTab('general');
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingSupplier(null);
    setDocuments([]);
    setContacts([]);
    form.reset();
  };

  const onSubmit = (data: SupplierFormData) => {
    if (editingSupplier) {
      updateMutation.mutate({ ...data, id: editingSupplier.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const getApprovalStatusBadge = (status: string) => {
    const statusConfig = APPROVAL_STATUSES.find(s => s.value === status);
    const icons: Record<string, React.ReactNode> = {
      pending: <Clock className="h-3 w-3" />,
      approved: <CheckCircle2 className="h-3 w-3" />,
      conditional: <AlertTriangle className="h-3 w-3" />,
      suspended: <XCircle className="h-3 w-3" />,
      rejected: <XCircle className="h-3 w-3" />,
    };
    
    return (
      <Badge 
        variant="outline" 
        className={`gap-1 ${status === 'approved' ? 'border-green-500 text-green-600' : 
          status === 'pending' ? 'border-yellow-500 text-yellow-600' :
          status === 'conditional' ? 'border-orange-500 text-orange-600' :
          'border-red-500 text-red-600'}`}
      >
        {icons[status]}
        {statusConfig?.label || status}
      </Badge>
    );
  };

  const getRiskBadge = (level: string) => {
    const config = RISK_LEVELS.find(r => r.value === level);
    return (
      <Badge 
        variant="outline"
        className={`${level === 'low' ? 'border-green-500 text-green-600' :
          level === 'medium' ? 'border-yellow-500 text-yellow-600' :
          level === 'high' ? 'border-orange-500 text-orange-600' :
          'border-red-500 text-red-600'}`}
      >
        {config?.label || level}
      </Badge>
    );
  };

  // Filter and paginate
  const filteredSuppliers = suppliers?.filter((s) => {
    const matchesSearch = 
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'active' && s.is_active) ||
      (statusFilter === 'inactive' && !s.is_active);
    const matchesApproval = approvalFilter === 'all' || s.approval_status === approvalFilter;
    return matchesSearch && matchesStatus && matchesApproval;
  });

  const totalItems = filteredSuppliers?.length || 0;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedSuppliers = filteredSuppliers?.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const approvalStatus = form.watch('approval_status');

  return (
    <div className="space-y-4">
      <DataTableHeader
        title="Suppliers"
        subtitle="Manage vendor and supplier information, approvals, and compliance"
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search suppliers..."
        filterValue={statusFilter}
        onFilterChange={(value) => {
          setStatusFilter(value);
          setCurrentPage(1);
        }}
        filterOptions={STATUS_FILTER_OPTIONS}
        filterPlaceholder="All Status"
        onAdd={canCreate ? () => handleOpenDialog() : undefined}
        addLabel="Add Supplier"
        onRefresh={() => refetch()}
        isLoading={isLoading || permissionsLoading}
        totalCount={suppliers?.length}
        filteredCount={filteredSuppliers?.length}
      />

      {/* Secondary filter */}
      <div className="flex items-center gap-2">
        <Select value={approvalFilter} onValueChange={(value) => { setApprovalFilter(value); setCurrentPage(1); }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Approval Status" />
          </SelectTrigger>
          <SelectContent>
            {APPROVAL_FILTER_OPTIONS.map(option => (
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
                  <TableHead>Approval</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSuppliers?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      <Building2 className="mx-auto h-10 w-10 mb-3 opacity-30" />
                      <p className="font-medium">No suppliers found</p>
                      <p className="text-sm">Try adjusting your search or filter</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedSuppliers?.map((supplier) => (
                    <TableRow 
                      key={supplier.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleOpenDialog(supplier)}
                    >
                      <TableCell>
                        <StatusIndicator 
                          status={supplier.is_active ? 'active' : 'inactive'} 
                        />
                      </TableCell>
                      <TableCell className="font-mono font-medium">{supplier.code}</TableCell>
                      <TableCell className="font-medium">{supplier.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {SUPPLIER_TYPES.find(t => t.value === supplier.supplier_type)?.label || supplier.supplier_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{getApprovalStatusBadge(supplier.approval_status || 'pending')}</TableCell>
                      <TableCell>{getRiskBadge(supplier.risk_level || 'medium')}</TableCell>
                      <TableCell className="text-muted-foreground">{supplier.contact_name || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDialog(supplier);
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
                                deleteMutation.mutate(supplier.id);
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSupplier ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-7 w-full">
                  <TabsTrigger value="general">General</TabsTrigger>
                  <TabsTrigger value="contacts">Contacts</TabsTrigger>
                  <TabsTrigger value="approval">Approval</TabsTrigger>
                  <TabsTrigger value="qa_workflow">QA Workflow</TabsTrigger>
                  <TabsTrigger value="compliance">Compliance</TabsTrigger>
                  <TabsTrigger value="payment">Payment</TabsTrigger>
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                </TabsList>

                {/* General Tab */}
                <TabsContent value="general" className="space-y-4 mt-4">
                  <div className="grid grid-cols-3 gap-4">
                    {editingSupplier && (
                      <FormField
                        control={form.control}
                        name="code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Supplier Code</FormLabel>
                            <FormControl>
                              <Input {...field} value={editingSupplier.code} disabled className="bg-muted" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    {!editingSupplier && (
                      <FormItem>
                        <FormLabel>Supplier Code</FormLabel>
                        <Input value="Auto-generated" disabled className="bg-muted text-muted-foreground" />
                      </FormItem>
                    )}
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Supplier Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Supplier name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="supplier_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Supplier Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {SUPPLIER_TYPES.map((type) => (
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
                      name="contact_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary Contact</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="categories"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categories</FormLabel>
                        <FormDescription>
                          Select all material types this supplier provides
                        </FormDescription>
                        <div className="grid grid-cols-4 gap-3 mt-2">
                          {SUPPLIER_CATEGORIES.map((category) => (
                            <div key={category.value} className="flex items-center space-x-2">
                              <Checkbox
                                id={`category-${category.value}`}
                                checked={field.value?.includes(category.value)}
                                onCheckedChange={(checked) => {
                                  const current = field.value || [];
                                  if (checked) {
                                    field.onChange([...current, category.value]);
                                  } else {
                                    field.onChange(current.filter((v: string) => v !== category.value));
                                  }
                                }}
                              />
                              <label
                                htmlFor={`category-${category.value}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {category.label}
                              </label>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="contact@supplier.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="(555) 123-4567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="fax"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fax</FormLabel>
                          <FormControl>
                            <Input placeholder="(555) 123-4568" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input placeholder="https://www.supplier.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input placeholder="123 Main St" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-4 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="City" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input placeholder="CA" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="zip"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ZIP</FormLabel>
                          <FormControl>
                            <Input placeholder="12345" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Input placeholder="USA" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Additional notes..." {...field} rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <FormLabel className="font-normal">Active Supplier</FormLabel>
                          <FormDescription>Inactive suppliers won't appear in selection lists</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* Contacts Tab */}
                <TabsContent value="contacts" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">Supplier Contacts</p>
                        <p className="text-sm text-muted-foreground">Manage contacts for this supplier</p>
                      </div>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addContact}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Contact
                    </Button>
                  </div>

                  {contacts.length === 0 ? (
                    <div className="p-8 bg-muted/50 rounded-lg text-center text-muted-foreground">
                      <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="font-medium">No contacts added</p>
                      <p className="text-sm mb-3">Add contacts to manage supplier communication</p>
                      <Button type="button" variant="outline" size="sm" onClick={addContact}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add First Contact
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {contacts.map((contact, index) => (
                        <div key={contact.id} className="p-4 border rounded-lg space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-muted-foreground">Contact {index + 1}</span>
                              {contact.is_primary && (
                                <Badge variant="default" className="text-xs">Primary</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {!contact.is_primary && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setPrimaryContact(contact.id)}
                                >
                                  Set as Primary
                                </Button>
                              )}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => removeContact(contact.id, contact.isNew)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium">Name *</label>
                              <Input
                                value={contact.name}
                                onChange={(e) => updateContact(contact.id, 'name', e.target.value)}
                                placeholder="Contact name"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Role / Title</label>
                              <Input
                                value={contact.role}
                                onChange={(e) => updateContact(contact.id, 'role', e.target.value)}
                                placeholder="e.g., Sales Rep, Account Manager"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium">Email</label>
                              <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  type="email"
                                  value={contact.email}
                                  onChange={(e) => updateContact(contact.id, 'email', e.target.value)}
                                  placeholder="email@supplier.com"
                                  className="pl-9"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Phone</label>
                              <Input
                                value={contact.phone}
                                onChange={(e) => updateContact(contact.id, 'phone', e.target.value)}
                                placeholder="(555) 123-4567"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
                            <div>
                              <p className="font-medium text-sm">Send PO To</p>
                              <p className="text-xs text-muted-foreground">Include this contact when sending purchase orders</p>
                            </div>
                            <Switch
                              checked={contact.send_po_to}
                              onCheckedChange={(checked) => updateContact(contact.id, 'send_po_to', checked)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Approval Tab */}
                <TabsContent value="approval" className="space-y-4 mt-4">
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg mb-4">
                    <Shield className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Supplier Approval Status</p>
                      <p className="text-sm text-muted-foreground">Manage supplier qualification and approval workflow</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="approval_status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Approval Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {APPROVAL_STATUSES.map((status) => (
                                <SelectItem key={status.value} value={status.value}>
                                  {status.label}
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
                      name="risk_level"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Risk Level</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select risk level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {RISK_LEVELS.map((level) => (
                                <SelectItem key={level.value} value={level.value}>
                                  {level.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>Based on supplier criticality and food safety risk</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="approval_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Approval Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="next_review_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Next Review Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormDescription>When should this supplier be re-evaluated?</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {approvalStatus === 'conditional' && (
                    <FormField
                      control={form.control}
                      name="conditional_notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Conditional Approval Notes</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe conditions for approval..." 
                              {...field} 
                              rows={4}
                            />
                          </FormControl>
                          <FormDescription>Required for conditional approval status</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </TabsContent>

                {/* Compliance Tab */}
                <TabsContent value="compliance" className="space-y-4 mt-4">
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg mb-4">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Quality & Compliance</p>
                      <p className="text-sm text-muted-foreground">Food safety certifications and audit information</p>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="gfsi_certified"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <FormLabel className="font-normal">GFSI Certified</FormLabel>
                          <FormDescription>Supplier holds a GFSI-recognized certification</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="food_safety_certification"
                        render={({ field }) => (
                        <FormItem>
                          <FormLabel>Food Safety Certification</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(value === 'none' ? '' : value)} 
                            value={field.value || 'none'}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select certification" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {FOOD_SAFETY_CERTS.map((cert) => (
                                <SelectItem key={cert.value} value={cert.value}>
                                  {cert.label}
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
                      name="certification_expiry_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Certification Expiry</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="last_audit_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Audit Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="audit_score"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Audit Score (%)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min={0} 
                              max={100} 
                              placeholder="0-100" 
                              {...field}
                              value={field.value ?? ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* QA Workflow Tab */}
                <TabsContent value="qa_workflow" className="space-y-4 mt-4">
                  {editingSupplier ? (
                    <>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center justify-between">
                            <span>QA Approval Status</span>
                            <ApprovalStatusBadge status={editingSupplier.approval_status as 'Draft' | 'Pending_QA' | 'Approved' | 'Rejected' | 'Archived'} />
                          </CardTitle>
                          <CardDescription>
                            SQF compliance approval workflow for this supplier
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center gap-3">
                            <ApprovalActionsDropdown
                              recordId={editingSupplier.id}
                              tableName="suppliers"
                              currentStatus={editingSupplier.approval_status as 'Draft' | 'Pending_QA' | 'Approved' | 'Rejected' | 'Archived'}
                              onActionComplete={() => {
                                queryClient.invalidateQueries({ queryKey: ['suppliers'] });
                              }}
                            />
                            <span className="text-sm text-muted-foreground">
                              {editingSupplier.qa_verified_at 
                                ? `Verified on ${new Date(editingSupplier.qa_verified_at).toLocaleDateString()}` 
                                : 'Not yet verified by QA'}
                            </span>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <History className="h-5 w-5" />
                            Approval History
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ApprovalHistoryPanel
                            recordId={editingSupplier.id}
                            tableName="suppliers"
                          />
                        </CardContent>
                      </Card>

                      <ComplianceDocumentsPanel
                        entityId={editingSupplier.id}
                        entityType="supplier"
                        entityName={editingSupplier.name}
                      />
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Shield className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p>Save the supplier first to access QA workflow features</p>
                    </div>
                  )}
                </TabsContent>

                {/* Payment Tab */}
                <TabsContent value="payment" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="payment_terms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Terms</FormLabel>
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
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="credit_limit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Credit Limit ($)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min={0} 
                              placeholder="0.00" 
                              {...field}
                              value={field.value ?? ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Documents Tab */}
                <TabsContent value="documents" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Supplier Documents</h3>
                      <p className="text-sm text-muted-foreground">Upload required documents for this supplier</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addDocument}>
                      <Upload className="h-4 w-4 mr-2" />
                      Add Document
                    </Button>
                  </div>

                  {!editingSupplier && (
                    <div className="p-4 bg-muted/50 rounded-lg text-center text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Save the supplier first to upload documents</p>
                    </div>
                  )}

                  {editingSupplier && documents.length === 0 && (
                    <div className="p-4 bg-muted/50 rounded-lg text-center text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No documents uploaded</p>
                      <Button type="button" variant="link" onClick={addDocument}>Add a document</Button>
                    </div>
                  )}

                  {editingSupplier && documents.map((doc) => (
                    <div key={doc.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-sm font-medium">Document Name *</label>
                            <Input
                              value={doc.document_name}
                              onChange={(e) => updateDocument(doc.id, 'document_name', e.target.value)}
                              placeholder="Document name"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Document Type</label>
                            <Select 
                              value={doc.requirement_id || '__none__'} 
                              onValueChange={(v) => updateDocument(doc.id, 'requirement_id', v === '__none__' ? '' : v)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">None</SelectItem>
                                {documentRequirements?.map((req) => (
                                  <SelectItem key={req.id} value={req.id}>
                                    {req.document_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => removeDocument(doc.id, doc.isNew)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-sm font-medium">File</label>
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
                                onClick={() => downloadDocument(doc.file_path!, doc.document_name)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Input
                              type="file"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(doc.id, file);
                              }}
                            />
                          )}
                          {doc.file && (
                            <p className="text-xs text-green-600 mt-1">New file selected: {doc.file.name}</p>
                          )}
                        </div>
                        <div>
                          <label className="text-sm font-medium">Published Date</label>
                          <Input
                            type="date"
                            value={doc.date_published || ''}
                            onChange={(e) => updateDocument(doc.id, 'date_published', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Expiry Date</label>
                          <Input
                            type="date"
                            value={doc.expiry_date || ''}
                            onChange={(e) => updateDocument(doc.id, 'expiry_date', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Required Documents Checklist */}
                  {documentRequirements && documentRequirements.length > 0 && (
                    <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                      <h4 className="font-medium mb-2">Required Documents Checklist</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {documentRequirements
                          .filter(req => req.is_required)
                          .map(req => {
                            const hasDoc = documents.some(d => d.requirement_id === req.id);
                            return (
                              <div key={req.id} className="flex items-center gap-2 text-sm">
                                {hasDoc ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-muted-foreground" />
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
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending || isUploading}
                >
                  {editingSupplier ? 'Update Supplier' : 'Create Supplier'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
