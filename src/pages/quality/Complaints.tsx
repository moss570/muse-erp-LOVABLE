import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import {
  MessageSquareWarning,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle,
  Clock,
  Phone,
  Mail,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { useComplaints, useCreateComplaint, COMPLAINT_TYPE_CONFIG, SEVERITY_CONFIG } from '@/hooks/useComplaints';
import type { ComplaintType, ComplaintSeverity } from '@/types/customer-complaints';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  new: { label: 'New', color: 'bg-blue-100 text-blue-800' },
  acknowledged: { label: 'Acknowledged', color: 'bg-yellow-100 text-yellow-800' },
  investigating: { label: 'Investigating', color: 'bg-amber-100 text-amber-800' },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-800' },
  closed: { label: 'Closed', color: 'bg-gray-100 text-gray-800' },
};

export default function Complaints() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: complaints, isLoading } = useComplaints();
  const createComplaint = useCreateComplaint();

  // Form state with proper types
  const [formData, setFormData] = useState<{
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    complaint_type: ComplaintType;
    severity: ComplaintSeverity;
    description: string;
    product_name: string;
    purchase_location: string;
  }>({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    complaint_type: 'quality',
    severity: 'minor',
    description: '',
    product_name: '',
    purchase_location: '',
  });

  const filteredComplaints = useMemo(() => {
    if (!complaints) return [];
    return complaints.filter(c => {
      if (search && !c.customer_name.toLowerCase().includes(search.toLowerCase()) &&
          !c.complaint_number.toLowerCase().includes(search.toLowerCase()) &&
          !c.description.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (severityFilter !== 'all' && c.severity !== severityFilter) return false;
      return true;
    });
  }, [complaints, search, statusFilter, severityFilter]);

  const openComplaints = complaints?.filter(c => c.status !== 'closed' && c.status !== 'resolved').length || 0;
  const criticalComplaints = complaints?.filter(c => c.severity === 'critical' && c.status !== 'closed').length || 0;

  const handleCreate = async () => {
    await createComplaint.mutateAsync(formData);
    setShowCreateDialog(false);
    setFormData({
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      complaint_type: 'quality',
      severity: 'minor',
      description: '',
      product_name: '',
      purchase_location: '',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customer Complaints</h1>
          <p className="text-muted-foreground">
            Track and manage customer complaints and quality issues
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Complaint
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Complaints
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{complaints?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Open
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{openComplaints}</div>
          </CardContent>
        </Card>

        <Card className={cn(criticalComplaints > 0 && 'border-red-300')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Critical
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn('text-2xl font-bold', criticalComplaints > 0 && 'text-red-600')}>
              {criticalComplaints}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Resolved This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {complaints?.filter(c => {
                if (c.status !== 'resolved' && c.status !== 'closed') return false;
                if (!c.resolution_date) return false;
                const resDate = new Date(c.resolution_date);
                const now = new Date();
                return resDate.getMonth() === now.getMonth() && resDate.getFullYear() === now.getFullYear();
              }).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search complaints..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                  <SelectItem key={value} value={value}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                {Object.entries(SEVERITY_CONFIG).map(([value, config]) => (
                  <SelectItem key={value} value={value}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Complaint #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : filteredComplaints.length > 0 ? (
                filteredComplaints.map((complaint) => {
                  const typeConfig = COMPLAINT_TYPE_CONFIG[complaint.complaint_type];
                  const severityConfig = SEVERITY_CONFIG[complaint.severity];
                  const statusConfig = STATUS_CONFIG[complaint.status];
                  return (
                    <TableRow key={complaint.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-mono text-sm">
                        {complaint.complaint_number}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{complaint.customer_name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            {complaint.customer_email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {complaint.customer_email}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{typeConfig?.label || complaint.complaint_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={severityConfig?.color || ''}>{severityConfig?.label || complaint.severity}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig?.color || ''}>{statusConfig?.label || complaint.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {complaint.product_name || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        {format(new Date(complaint.received_date), 'PP')}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No complaints found matching your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>New Customer Complaint</DialogTitle>
            <DialogDescription>
              Record a new customer complaint for investigation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer Name *</Label>
                <Input
                  value={formData.customer_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.customer_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_email: e.target.value }))}
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Complaint Type</Label>
                <Select
                  value={formData.complaint_type}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, complaint_type: v as ComplaintType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(COMPLAINT_TYPE_CONFIG).map(([value, config]) => (
                      <SelectItem key={value} value={value}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Severity</Label>
                <Select
                  value={formData.severity}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, severity: v as ComplaintSeverity }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SEVERITY_CONFIG).map(([value, config]) => (
                      <SelectItem key={value} value={value}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Product Name</Label>
              <Input
                value={formData.product_name}
                onChange={(e) => setFormData(prev => ({ ...prev, product_name: e.target.value }))}
                placeholder="Product involved"
              />
            </div>

            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the complaint in detail..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreate}
              disabled={!formData.customer_name || !formData.description || createComplaint.isPending}
            >
              Create Complaint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
