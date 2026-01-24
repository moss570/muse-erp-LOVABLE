import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Eye, Edit, Send, Check, X, AlertCircle } from 'lucide-react';
import { SettingsBreadcrumb } from '@/components/settings/SettingsBreadcrumb';
import { useToast } from '@/hooks/use-toast';
import { DataTableHeader } from '@/components/ui/data-table-header';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PriceSheet {
  id: string;
  name: string;
  description: string;
  price_tier: string;
  status: string;
  effective_date: string;
  expiry_date: string | null;
  is_active: boolean;
  created_by: string;
  submitted_for_approval_at: string | null;
  submitted_by: string | null;
  approved_at: string | null;
  approved_by: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export default function PriceSheets() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState<PriceSheet | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const [newSheet, setNewSheet] = useState({
    name: '',
    description: '',
    price_tier: 'direct',
    effective_date: new Date().toISOString().split('T')[0],
  });

  // Fetch price sheets
  const { data: priceSheets, isLoading } = useQuery({
    queryKey: ['price-sheets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('price_sheets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PriceSheet[];
    },
  });

  // Fetch current user role
  const { data: userRole } = useQuery({
    queryKey: ['user-role'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data?.role;
    },
  });

  const isManager = userRole === 'admin' || userRole === 'manager';

  // Create price sheet mutation
  const createMutation = useMutation({
    mutationFn: async (sheet: typeof newSheet) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('price_sheets')
        .insert({
          ...sheet,
          created_by: user?.id,
          status: 'draft',
          is_active: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['price-sheets'] });
      toast({
        title: 'Success',
        description: 'Price sheet created successfully',
      });
      setShowCreateDialog(false);
      setNewSheet({
        name: '',
        description: '',
        price_tier: 'direct',
        effective_date: new Date().toISOString().split('T')[0],
      });
      navigate(`/settings/price-sheets/${data.id}`);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Submit for approval mutation
  const submitForApprovalMutation = useMutation({
    mutationFn: async (sheetId: string) => {
      const { error } = await supabase.rpc('submit_price_sheet_for_approval', {
        p_price_sheet_id: sheetId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-sheets'] });
      toast({
        title: 'Success',
        description: 'Price sheet submitted for approval',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (sheetId: string) => {
      const { error } = await supabase.rpc('approve_price_sheet', {
        p_price_sheet_id: sheetId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-sheets'] });
      toast({
        title: 'Success',
        description: 'Price sheet approved',
      });
      setShowApprovalDialog(false);
      setSelectedSheet(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ sheetId, reason }: { sheetId: string; reason: string }) => {
      const { error } = await supabase.rpc('reject_price_sheet', {
        p_price_sheet_id: sheetId,
        p_rejection_reason: reason,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-sheets'] });
      toast({
        title: 'Success',
        description: 'Price sheet rejected',
      });
      setShowApprovalDialog(false);
      setSelectedSheet(null);
      setRejectionReason('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      draft: { variant: 'secondary', label: 'Draft' },
      pending_approval: { variant: 'default', label: 'Pending' },
      approved: { variant: 'default', label: 'Approved' },
      rejected: { variant: 'destructive', label: 'Rejected' },
    };

    const config = variants[status] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const pendingApprovals = priceSheets?.filter(s => s.status === 'pending_approval') || [];

  return (
    <div className="space-y-6">
      <SettingsBreadcrumb currentPage="Price Sheets" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Price Sheets</h1>
          <p className="text-muted-foreground">
            Manage distributor and direct pricing with approval workflow
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Price Sheet
        </Button>
      </div>

      {/* Pending Approvals (Manager View) */}
      {isManager && pendingApprovals.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <CardTitle>Pending Approvals</CardTitle>
            </div>
            <CardDescription>
              {pendingApprovals.length} price sheet{pendingApprovals.length !== 1 ? 's' : ''} awaiting approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Price Tier</TableHead>
                  <TableHead>Effective Date</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingApprovals.map((sheet) => (
                  <TableRow key={sheet.id}>
                    <TableCell className="font-medium">{sheet.name}</TableCell>
                    <TableCell className="capitalize">{sheet.price_tier}</TableCell>
                    <TableCell>{new Date(sheet.effective_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {sheet.submitted_for_approval_at
                        ? new Date(sheet.submitted_for_approval_at).toLocaleDateString()
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedSheet(sheet);
                          setShowApprovalDialog(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* All Price Sheets */}
      <Card>
        <CardHeader>
          <CardTitle>All Price Sheets</CardTitle>
          <CardDescription>
            View and manage all price sheets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTableHeader
            searchPlaceholder="Search price sheets..."
            onSearchChange={() => {}}
          />

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Price Tier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Effective Date</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : priceSheets?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No price sheets found. Create one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                priceSheets?.map((sheet) => (
                  <TableRow key={sheet.id}>
                    <TableCell className="font-medium">{sheet.name}</TableCell>
                    <TableCell className="capitalize">{sheet.price_tier}</TableCell>
                    <TableCell>{getStatusBadge(sheet.status)}</TableCell>
                    <TableCell>{new Date(sheet.effective_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {sheet.expiry_date ? new Date(sheet.expiry_date).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>
                      {sheet.is_active ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {sheet.status === 'draft' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/settings/price-sheets/${sheet.id}`)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => submitForApprovalMutation.mutate(sheet.id)}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Submit
                          </Button>
                        </>
                      )}
                      {sheet.status !== 'draft' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/settings/price-sheets/${sheet.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Price Sheet</DialogTitle>
            <DialogDescription>
              Create a new price sheet. You can add products after creation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={newSheet.name}
                onChange={(e) => setNewSheet({ ...newSheet, name: e.target.value })}
                placeholder="e.g., Distributor Q1 2026"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newSheet.description}
                onChange={(e) => setNewSheet({ ...newSheet, description: e.target.value })}
                placeholder="Optional description"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price_tier">Price Tier *</Label>
              <Select
                value={newSheet.price_tier}
                onValueChange={(value) => setNewSheet({ ...newSheet, price_tier: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="distributor">Distributor</SelectItem>
                  <SelectItem value="direct">Direct / Retail</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="effective_date">Effective Date *</Label>
              <Input
                id="effective_date"
                type="date"
                value={newSheet.effective_date}
                onChange={(e) => setNewSheet({ ...newSheet, effective_date: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate(newSheet)}
              disabled={!newSheet.name || !newSheet.price_tier}
            >
              Create Price Sheet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Price Sheet</DialogTitle>
            <DialogDescription>
              Approve or reject this price sheet
            </DialogDescription>
          </DialogHeader>

          {selectedSheet && (
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <p className="text-sm font-medium">{selectedSheet.name}</p>
              </div>
              <div>
                <Label>Description</Label>
                <p className="text-sm">{selectedSheet.description || '-'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Price Tier</Label>
                  <p className="text-sm capitalize">{selectedSheet.price_tier}</p>
                </div>
                <div>
                  <Label>Effective Date</Label>
                  <p className="text-sm">{new Date(selectedSheet.effective_date).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rejection_reason">Rejection Reason (optional)</Label>
                <Textarea
                  id="rejection_reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Provide reason if rejecting..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowApprovalDialog(false);
                setSelectedSheet(null);
                setRejectionReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedSheet) {
                  rejectMutation.mutate({
                    sheetId: selectedSheet.id,
                    reason: rejectionReason || 'Rejected by manager',
                  });
                }
              }}
            >
              <X className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button
              onClick={() => {
                if (selectedSheet) {
                  approveMutation.mutate(selectedSheet.id);
                }
              }}
            >
              <Check className="h-4 w-4 mr-2" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
