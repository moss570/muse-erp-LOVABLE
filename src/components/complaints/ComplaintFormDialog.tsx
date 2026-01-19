import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  MessageSquareWarning,
  User,
  Package,
  Phone,
  Mail,
  MapPin,
  FileWarning,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Save,
} from 'lucide-react';

import {
  useComplaint,
  useCreateComplaint,
  useUpdateComplaint,
  useCreateCapaFromComplaint,
  useProducts,
  useProfiles,
  COMPLAINT_TYPE_CONFIG,
  COMPLAINT_STATUS_CONFIG,
} from '@/hooks/useComplaints';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

import type {
  ComplaintType,
  ComplaintStatus,
  ComplaintSeverity,
  ResolutionType,
  ReceivedVia,
} from '@/types/customer-complaints';
import { CAPA_SEVERITY_CONFIG, type CapaSeverity } from '@/types/capa';

interface ComplaintFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  complaintId?: string;
  mode: 'create' | 'edit';
}

const RECEIVED_VIA_OPTIONS: { value: ReceivedVia; label: string }[] = [
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'website', label: 'Website/Form' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'letter', label: 'Letter/Mail' },
  { value: 'in_person', label: 'In Person' },
  { value: 'retailer', label: 'Retailer' },
  { value: 'other', label: 'Other' },
];

const RESOLUTION_TYPE_OPTIONS: { value: ResolutionType; label: string }[] = [
  { value: 'replacement', label: 'Product Replacement' },
  { value: 'refund', label: 'Full Refund' },
  { value: 'credit', label: 'Store Credit' },
  { value: 'coupon', label: 'Coupon/Discount' },
  { value: 'apology', label: 'Apology Only' },
  { value: 'no_action', label: 'No Action Required' },
  { value: 'other', label: 'Other' },
];

export function ComplaintFormDialog({
  open,
  onOpenChange,
  complaintId,
  mode,
}: ComplaintFormDialogProps) {
  const { data: complaint, isLoading } = useComplaint(complaintId);
  const { data: products } = useProducts();
  const { data: profiles } = useProfiles();

  const createComplaint = useCreateComplaint();
  const updateComplaint = useUpdateComplaint();
  const createCapa = useCreateCapaFromComplaint();

  const [activeTab, setActiveTab] = useState('details');
  const [formData, setFormData] = useState<Record<string, any>>({
    complaint_type: '',
    severity: 'minor',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    description: '',
    received_date: format(new Date(), 'yyyy-MM-dd'),
    received_via: 'phone',
  });

  const [showCapaPrompt, setShowCapaPrompt] = useState(false);
  const [capaSeverity, setCapaSeverity] = useState<CapaSeverity>('major');

  // Load existing complaint data
  useEffect(() => {
    if (complaint && mode === 'edit') {
      setFormData({
        complaint_type: complaint.complaint_type,
        severity: complaint.severity,
        status: complaint.status,
        customer_name: complaint.customer_name,
        customer_contact: complaint.customer_contact || '',
        customer_email: complaint.customer_email || '',
        customer_phone: complaint.customer_phone || '',
        product_id: complaint.product_id || '',
        production_lot_number: complaint.production_lot_number || '',
        best_by_date: complaint.best_by_date || '',
        purchase_date: complaint.purchase_date || '',
        purchase_location: complaint.purchase_location || '',
        description: complaint.description,
        received_date: complaint.received_date,
        received_via: complaint.received_via || 'phone',
        investigation_notes: complaint.investigation_notes || '',
        root_cause: complaint.root_cause || '',
        sample_received: complaint.sample_received || false,
        sample_received_date: complaint.sample_received_date || '',
        sample_condition: complaint.sample_condition || '',
        resolution_type: complaint.resolution_type || '',
        resolution_details: complaint.resolution_details || '',
        refund_amount: complaint.refund_amount || '',
        replacement_cost: complaint.replacement_cost || '',
        follow_up_required: complaint.follow_up_required || false,
        follow_up_date: complaint.follow_up_date || '',
        follow_up_notes: complaint.follow_up_notes || '',
        customer_satisfied: complaint.customer_satisfied,
        reportable_event: complaint.reportable_event || false,
        regulatory_report_filed: complaint.regulatory_report_filed || false,
        regulatory_report_date: complaint.regulatory_report_date || '',
        assigned_to: complaint.assigned_to || '',
      });
    }
  }, [complaint, mode]);

  // Auto-set severity based on complaint type
  useEffect(() => {
    if (formData.complaint_type) {
      const typeConfig = COMPLAINT_TYPE_CONFIG[formData.complaint_type as ComplaintType];
      if (typeConfig) {
        setFormData((prev) => ({
          ...prev,
          severity: typeConfig.defaultSeverity,
        }));

        // Show CAPA prompt for types that require it
        if (typeConfig.requiresCapa && mode === 'create') {
          setShowCapaPrompt(true);
          setCapaSeverity(typeConfig.defaultSeverity === 'critical' ? 'critical' : 'major');
        }
      }
    }
  }, [formData.complaint_type, mode]);

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (mode === 'create') {
      await createComplaint.mutateAsync(formData);
      onOpenChange(false);
    } else if (complaintId) {
      await updateComplaint.mutateAsync({ id: complaintId, ...formData });
    }
  };

  const handleCreateCapa = async () => {
    if (!complaint) return;
    await createCapa.mutateAsync({
      complaintId: complaint.id,
      severity: capaSeverity,
    });
    setShowCapaPrompt(false);
  };

  const handleStatusChange = async (newStatus: ComplaintStatus) => {
    if (!complaintId) return;
    await updateComplaint.mutateAsync({
      id: complaintId,
      status: newStatus,
      ...(newStatus === 'resolved' ? { resolution_date: format(new Date(), 'yyyy-MM-dd') } : {}),
    });
  };

  const isSubmitting = createComplaint.isPending || updateComplaint.isPending;
  const selectedTypeConfig = formData.complaint_type
    ? COMPLAINT_TYPE_CONFIG[formData.complaint_type as ComplaintType]
    : null;

  if (mode === 'edit' && isLoading) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareWarning className="h-5 w-5" />
            {mode === 'create' ? 'New Customer Complaint' : `Complaint ${complaint?.complaint_number}`}
          </DialogTitle>
          {mode === 'edit' && complaint && (
            <div className="flex items-center gap-2 mt-2">
              <Badge className={COMPLAINT_STATUS_CONFIG[complaint.status as ComplaintStatus]?.color}>
                {COMPLAINT_STATUS_CONFIG[complaint.status as ComplaintStatus]?.label}
              </Badge>
              <Badge variant="outline">
                {complaint.severity}
              </Badge>
              {(complaint as any).capa && (
                <Badge variant="secondary">
                  CAPA: {(complaint as any).capa.capa_number}
                </Badge>
              )}
            </div>
          )}
        </DialogHeader>

        {/* FDA Reportable Warning */}
        {selectedTypeConfig?.reportable && (
          <Alert variant="destructive" className="mx-6 mb-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This complaint type may require FDA reporting. Ensure proper documentation.
            </AlertDescription>
          </Alert>
        )}

        {/* CAPA Required Warning */}
        {mode === 'edit' && selectedTypeConfig?.requiresCapa && !complaint?.capa_id && (
          <Alert className="mx-6 mb-2 border-amber-300 bg-amber-50">
            <FileWarning className="h-4 w-4 text-amber-600" />
            <AlertDescription className="flex items-center justify-between">
              This complaint type requires a CAPA to be created.
              <Button size="sm" variant="outline" onClick={() => setShowCapaPrompt(true)}>
                Create CAPA
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex-1 min-h-0 px-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            <TabsList className="flex-shrink-0 mb-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="product">Product Info</TabsTrigger>
              {mode === 'edit' && (
                <>
                  <TabsTrigger value="investigation">Investigation</TabsTrigger>
                  <TabsTrigger value="resolution">Resolution</TabsTrigger>
                </>
              )}
            </TabsList>

            <ScrollArea className="flex-1 min-h-0 pb-6">
              {/* DETAILS TAB */}
              <TabsContent value="details" className="space-y-4 mt-0 pr-4">
                {/* Complaint Classification */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Complaint Classification</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Complaint Type *</Label>
                      <Select
                        value={formData.complaint_type}
                        onValueChange={(v) => handleFieldChange('complaint_type', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(COMPLAINT_TYPE_CONFIG).map(([value, config]) => (
                            <SelectItem key={value} value={value}>
                              <div className="flex items-center gap-2">
                                {config.label}
                                {config.requiresCapa && (
                                  <Badge variant="outline" className="text-xs">CAPA Req</Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedTypeConfig && (
                        <p className="text-xs text-muted-foreground">{selectedTypeConfig.description}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Severity</Label>
                      <Select
                        value={formData.severity}
                        onValueChange={(v) => handleFieldChange('severity', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(['minor', 'major', 'critical'] as const).map((sev) => (
                            <SelectItem key={sev} value={sev}>
                              <div className="flex items-center gap-2">
                                <span className={cn('w-2 h-2 rounded-full', CAPA_SEVERITY_CONFIG[sev].bgColor)} />
                                {CAPA_SEVERITY_CONFIG[sev].label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Received Date *</Label>
                      <Input
                        type="date"
                        value={formData.received_date}
                        onChange={(e) => handleFieldChange('received_date', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Received Via</Label>
                      <Select
                        value={formData.received_via}
                        onValueChange={(v) => handleFieldChange('received_via', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RECEIVED_VIA_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {mode === 'edit' && (
                      <div className="space-y-2">
                        <Label>Assigned To</Label>
                        <Select
                          value={formData.assigned_to || 'unassigned'}
                          onValueChange={(v) => handleFieldChange('assigned_to', v === 'unassigned' ? null : v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {profiles?.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.first_name} {p.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Customer Information */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Customer Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Customer Name *</Label>
                      <Input
                        value={formData.customer_name}
                        onChange={(e) => handleFieldChange('customer_name', e.target.value)}
                        placeholder="Full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Contact Person</Label>
                      <Input
                        value={formData.customer_contact || ''}
                        onChange={(e) => handleFieldChange('customer_contact', e.target.value)}
                        placeholder="If different from customer"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        <Mail className="h-3 w-3" /> Email
                      </Label>
                      <Input
                        type="email"
                        value={formData.customer_email || ''}
                        onChange={(e) => handleFieldChange('customer_email', e.target.value)}
                        placeholder="email@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> Phone
                      </Label>
                      <Input
                        value={formData.customer_phone || ''}
                        onChange={(e) => handleFieldChange('customer_phone', e.target.value)}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Complaint Description */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Complaint Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => handleFieldChange('description', e.target.value)}
                      placeholder="Describe the customer's complaint in detail..."
                      rows={5}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* PRODUCT INFO TAB */}
              <TabsContent value="product" className="space-y-4 mt-0 pr-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Product Information
                    </CardTitle>
                    <CardDescription>
                      Link to specific product and lot if known
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Product</Label>
                      <Select
                        value={formData.product_id || 'unknown'}
                        onValueChange={(v) => handleFieldChange('product_id', v === 'unknown' ? null : v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unknown">Unknown</SelectItem>
                          {products?.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} ({p.sku})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Lot Number</Label>
                      <Input
                        value={formData.production_lot_number || ''}
                        onChange={(e) => handleFieldChange('production_lot_number', e.target.value)}
                        placeholder="From package"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Best By Date</Label>
                      <Input
                        type="date"
                        value={formData.best_by_date || ''}
                        onChange={(e) => handleFieldChange('best_by_date', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Purchase Date</Label>
                      <Input
                        type="date"
                        value={formData.purchase_date || ''}
                        onChange={(e) => handleFieldChange('purchase_date', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> Purchase Location
                      </Label>
                      <Input
                        value={formData.purchase_location || ''}
                        onChange={(e) => handleFieldChange('purchase_location', e.target.value)}
                        placeholder="Store name and location"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Sample Information */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Sample Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="sample_received"
                        checked={formData.sample_received || false}
                        onCheckedChange={(checked) => handleFieldChange('sample_received', checked)}
                      />
                      <Label htmlFor="sample_received">Sample received from customer</Label>
                    </div>
                    {formData.sample_received && (
                      <div className="grid grid-cols-2 gap-4 ml-6">
                        <div className="space-y-2">
                          <Label>Date Received</Label>
                          <Input
                            type="date"
                            value={formData.sample_received_date || ''}
                            onChange={(e) => handleFieldChange('sample_received_date', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Sample Condition</Label>
                          <Input
                            value={formData.sample_condition || ''}
                            onChange={(e) => handleFieldChange('sample_condition', e.target.value)}
                            placeholder="Describe condition on receipt"
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* INVESTIGATION TAB */}
              {mode === 'edit' && (
                <TabsContent value="investigation" className="space-y-4 mt-0 pr-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Investigation Notes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Investigation Notes</Label>
                        <Textarea
                          value={formData.investigation_notes || ''}
                          onChange={(e) => handleFieldChange('investigation_notes', e.target.value)}
                          placeholder="Document your investigation findings..."
                          rows={4}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Root Cause (if determined)</Label>
                        <Textarea
                          value={formData.root_cause || ''}
                          onChange={(e) => handleFieldChange('root_cause', e.target.value)}
                          placeholder="What caused this complaint?"
                          rows={3}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* FDA Reporting */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Regulatory Reporting</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="reportable_event"
                          checked={formData.reportable_event || false}
                          onCheckedChange={(checked) => handleFieldChange('reportable_event', checked)}
                        />
                        <Label htmlFor="reportable_event">FDA Reportable Event</Label>
                      </div>
                      {formData.reportable_event && (
                        <div className="grid grid-cols-2 gap-4 ml-6">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="regulatory_report_filed"
                              checked={formData.regulatory_report_filed || false}
                              onCheckedChange={(checked) => handleFieldChange('regulatory_report_filed', checked)}
                            />
                            <Label htmlFor="regulatory_report_filed">Report Filed</Label>
                          </div>
                          <div className="space-y-2">
                            <Label>Report Date</Label>
                            <Input
                              type="date"
                              value={formData.regulatory_report_date || ''}
                              onChange={(e) => handleFieldChange('regulatory_report_date', e.target.value)}
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* RESOLUTION TAB */}
              {mode === 'edit' && (
                <TabsContent value="resolution" className="space-y-4 mt-0 pr-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Resolution Details</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Resolution Type</Label>
                        <Select
                          value={formData.resolution_type || 'none'}
                          onValueChange={(v) => handleFieldChange('resolution_type', v === 'none' ? null : v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select resolution" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Not Resolved</SelectItem>
                            {RESOLUTION_TYPE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Resolution Date</Label>
                        <Input
                          type="date"
                          value={formData.resolution_date || ''}
                          onChange={(e) => handleFieldChange('resolution_date', e.target.value)}
                        />
                      </div>
                      {formData.resolution_type === 'refund' && (
                        <div className="space-y-2">
                          <Label>Refund Amount ($)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.refund_amount || ''}
                            onChange={(e) => handleFieldChange('refund_amount', parseFloat(e.target.value))}
                          />
                        </div>
                      )}
                      {formData.resolution_type === 'replacement' && (
                        <div className="space-y-2">
                          <Label>Replacement Cost ($)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.replacement_cost || ''}
                            onChange={(e) => handleFieldChange('replacement_cost', parseFloat(e.target.value))}
                          />
                        </div>
                      )}
                      <div className="col-span-2 space-y-2">
                        <Label>Resolution Details</Label>
                        <Textarea
                          value={formData.resolution_details || ''}
                          onChange={(e) => handleFieldChange('resolution_details', e.target.value)}
                          placeholder="Describe how the complaint was resolved..."
                          rows={3}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Follow-up */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Customer Follow-up</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="follow_up_required"
                          checked={formData.follow_up_required || false}
                          onCheckedChange={(checked) => handleFieldChange('follow_up_required', checked)}
                        />
                        <Label htmlFor="follow_up_required">Follow-up required</Label>
                      </div>
                      {formData.follow_up_required && (
                        <div className="grid grid-cols-2 gap-4 ml-6">
                          <div className="space-y-2">
                            <Label>Follow-up Date</Label>
                            <Input
                              type="date"
                              value={formData.follow_up_date || ''}
                              onChange={(e) => handleFieldChange('follow_up_date', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Customer Satisfied?</Label>
                            <Select
                              value={formData.customer_satisfied === true ? 'yes' : formData.customer_satisfied === false ? 'no' : 'pending'}
                              onValueChange={(v) => handleFieldChange('customer_satisfied', v === 'yes' ? true : v === 'no' ? false : null)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="yes">Yes</SelectItem>
                                <SelectItem value="no">No</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-2 space-y-2">
                            <Label>Follow-up Notes</Label>
                            <Textarea
                              value={formData.follow_up_notes || ''}
                              onChange={(e) => handleFieldChange('follow_up_notes', e.target.value)}
                              placeholder="Document follow-up conversation..."
                              rows={3}
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Status Actions */}
                  {complaint && complaint.status !== 'closed' && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Status Actions</CardTitle>
                      </CardHeader>
                      <CardContent className="flex gap-2 flex-wrap">
                        {complaint.status === 'new' && (
                          <Button
                            variant="outline"
                            onClick={() => handleStatusChange('acknowledged')}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Acknowledge
                          </Button>
                        )}
                        {complaint.status === 'acknowledged' && (
                          <Button
                            variant="outline"
                            onClick={() => handleStatusChange('investigating')}
                          >
                            Start Investigation
                          </Button>
                        )}
                        {['acknowledged', 'investigating'].includes(complaint.status) && (
                          <Button
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleStatusChange('resolved')}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Mark Resolved
                          </Button>
                        )}
                        {complaint.status === 'resolved' && (
                          <Button
                            onClick={() => handleStatusChange('closed')}
                          >
                            Close Complaint
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              )}
            </ScrollArea>
          </Tabs>
        </div>

        <DialogFooter className="flex-shrink-0 px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !formData.complaint_type || !formData.customer_name}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            {mode === 'create' ? 'Create Complaint' : 'Save Changes'}
          </Button>
        </DialogFooter>

        {/* CAPA Creation Prompt Dialog */}
        {showCapaPrompt && complaint && (
          <Dialog open={showCapaPrompt} onOpenChange={setShowCapaPrompt}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileWarning className="h-5 w-5 text-amber-500" />
                  Create CAPA for Complaint?
                </DialogTitle>
                <DialogDescription>
                  This complaint type requires a Corrective Action to be initiated.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <Label>CAPA Severity</Label>
                  <Select value={capaSeverity} onValueChange={(v) => setCapaSeverity(v as CapaSeverity)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
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
                </div>
                <p className="text-sm text-muted-foreground">
                  A CAPA will be created and linked to this complaint with all relevant details pre-populated.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCapaPrompt(false)}>
                  Skip for Now
                </Button>
                <Button onClick={handleCreateCapa} disabled={createCapa.isPending}>
                  {createCapa.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create CAPA
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
