import { useState } from 'react';
import { Plus, Edit, Trash2, DollarSign, Building, Zap, Shield, MoreHorizontal } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { SettingsBreadcrumb } from '@/components/settings/SettingsBreadcrumb';
import { useFixedCosts, useOverheadSettings } from '@/hooks/useFinancialSettings';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const CATEGORIES = [
  { value: 'rent', label: 'Rent', icon: Building },
  { value: 'insurance', label: 'Insurance', icon: Shield },
  { value: 'utilities', label: 'Utilities', icon: Zap },
  { value: 'depreciation', label: 'Depreciation', icon: MoreHorizontal },
  { value: 'other', label: 'Other', icon: MoreHorizontal },
];

interface FixedCostFormData {
  cost_name: string;
  category: string;
  monthly_amount: number;
  gl_account: string;
  description: string;
  is_active: boolean;
}

const defaultFormData: FixedCostFormData = {
  cost_name: '',
  category: 'rent',
  monthly_amount: 0,
  gl_account: '',
  description: '',
  is_active: true,
};

export default function FixedCosts() {
  const { fixedCosts, isLoading, createCost, updateCost, deleteCost } = useFixedCosts();
  const { overheadRate, updateSetting } = useOverheadSettings();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<any>(null);
  const [formData, setFormData] = useState<FixedCostFormData>(defaultFormData);
  const [localOverheadRate, setLocalOverheadRate] = useState(overheadRate);

  const handleOpenCreate = () => {
    setEditingCost(null);
    setFormData(defaultFormData);
    setDialogOpen(true);
  };

  const handleOpenEdit = (cost: any) => {
    setEditingCost(cost);
    setFormData({
      cost_name: cost.cost_name,
      category: cost.category,
      monthly_amount: cost.monthly_amount,
      gl_account: cost.gl_account || '',
      description: cost.description || '',
      is_active: cost.is_active ?? true,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingCost) {
      updateCost.mutate({ id: editingCost.id, ...formData });
    } else {
      createCost.mutate(formData);
    }
    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (editingCost) {
      deleteCost.mutate(editingCost.id);
      setDeleteDialogOpen(false);
      setEditingCost(null);
    }
  };

  const handleSaveOverheadRate = () => {
    updateSetting.mutate({ setting_key: 'overhead_rate_per_hour', setting_value: localOverheadRate });
  };

  const totalMonthly = fixedCosts?.filter((c) => c.is_active).reduce((sum, c) => sum + Number(c.monthly_amount), 0) ?? 0;

  const getCategoryIcon = (category: string) => {
    const cat = CATEGORIES.find((c) => c.value === category);
    return cat?.icon || MoreHorizontal;
  };

  const getCategoryLabel = (category: string) => {
    const cat = CATEGORIES.find((c) => c.value === category);
    return cat?.label || category;
  };

  return (
    <div className="space-y-6">
      <SettingsBreadcrumb currentPage="Fixed Costs" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fixed Costs</h1>
          <p className="text-muted-foreground">Manage monthly fixed costs and overhead rates</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add Fixed Cost
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Total Monthly Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Monthly</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalMonthly.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Active fixed costs</p>
          </CardContent>
        </Card>

        {/* Overhead Rate Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Overhead Rate per Labor Hour</CardTitle>
            <CardDescription>Applied to labor costs for costing calculations</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">$</span>
              <Input
                type="number"
                step="0.01"
                value={localOverheadRate}
                onChange={(e) => setLocalOverheadRate(Number(e.target.value))}
                className="w-32"
              />
              <span className="text-muted-foreground">/ hour</span>
            </div>
            <Button onClick={handleSaveOverheadRate} variant="outline" size="sm">
              Save Rate
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Fixed Costs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Fixed Costs</CardTitle>
          <CardDescription>Recurring monthly expenses</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cost Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Monthly Amount</TableHead>
                <TableHead>GL Account</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : fixedCosts?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No fixed costs configured. Click "Add Fixed Cost" to get started.
                  </TableCell>
                </TableRow>
              ) : (
                fixedCosts?.map((cost) => {
                  const Icon = getCategoryIcon(cost.category);
                  return (
                    <TableRow key={cost.id}>
                      <TableCell className="font-medium">{cost.cost_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          {getCategoryLabel(cost.category)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${Number(cost.monthly_amount).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{cost.gl_account || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={cost.is_active ? 'default' : 'secondary'}>
                          {cost.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(cost)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingCost(cost);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCost ? 'Edit Fixed Cost' : 'Add Fixed Cost'}</DialogTitle>
            <DialogDescription>
              {editingCost ? 'Update the fixed cost details' : 'Add a new recurring monthly expense'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cost_name">Cost Name *</Label>
              <Input
                id="cost_name"
                value={formData.cost_name}
                onChange={(e) => setFormData({ ...formData, cost_name: e.target.value })}
                placeholder="e.g., Facility Rent"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthly_amount">Monthly Amount *</Label>
                <Input
                  id="monthly_amount"
                  type="number"
                  step="0.01"
                  value={formData.monthly_amount}
                  onChange={(e) => setFormData({ ...formData, monthly_amount: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gl_account">GL Account</Label>
              <Input
                id="gl_account"
                value={formData.gl_account}
                onChange={(e) => setFormData({ ...formData, gl_account: e.target.value })}
                placeholder="e.g., 6100-00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description..."
                rows={2}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Active</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.cost_name || !formData.category}>
              {editingCost ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Fixed Cost</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{editingCost?.cost_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
