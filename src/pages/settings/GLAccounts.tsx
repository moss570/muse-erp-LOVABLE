import { useState } from 'react';
import { Plus, Edit, Trash2, Link, BookOpen } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SettingsBreadcrumb } from '@/components/settings/SettingsBreadcrumb';
import { useGLAccounts } from '@/hooks/useFinancialSettings';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const ACCOUNT_TYPES = [
  { value: 'asset', label: 'Asset' },
  { value: 'liability', label: 'Liability' },
  { value: 'equity', label: 'Equity' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'expense', label: 'Expense' },
  { value: 'cogs', label: 'COGS' },
];

const MAPPING_PURPOSES = [
  { value: 'inventory', label: 'Inventory', description: 'Raw materials and finished goods' },
  { value: 'cogs', label: 'COGS', description: 'Cost of goods sold' },
  { value: 'variance', label: 'Variance', description: 'Price and usage variances' },
  { value: 'clearing', label: 'Clearing', description: 'Goods received/invoice received clearing' },
  { value: 'expense', label: 'Expense', description: 'Operating expenses' },
  { value: 'revenue', label: 'Revenue', description: 'Sales revenue' },
  { value: 'ap', label: 'Accounts Payable', description: 'Vendor payables' },
  { value: 'ar', label: 'Accounts Receivable', description: 'Customer receivables' },
  { value: 'freight', label: 'Freight', description: 'Shipping and freight costs' },
  { value: 'duty', label: 'Duty', description: 'Import duties and tariffs' },
  { value: 'labor', label: 'Labor', description: 'Labor costs' },
  { value: 'overhead', label: 'Overhead', description: 'Manufacturing overhead' },
];

interface GLAccountFormData {
  account_code: string;
  account_name: string;
  account_type: string;
  xero_account_id: string;
  mapping_purpose: string;
  is_active: boolean;
}

const defaultFormData: GLAccountFormData = {
  account_code: '',
  account_name: '',
  account_type: 'expense',
  xero_account_id: '',
  mapping_purpose: '',
  is_active: true,
};

export default function GLAccounts() {
  const { glAccounts, isLoading, createAccount, updateAccount, deleteAccount } = useGLAccounts();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [formData, setFormData] = useState<GLAccountFormData>(defaultFormData);

  const handleOpenCreate = () => {
    setEditingAccount(null);
    setFormData(defaultFormData);
    setDialogOpen(true);
  };

  const handleOpenEdit = (account: any) => {
    setEditingAccount(account);
    setFormData({
      account_code: account.account_code,
      account_name: account.account_name,
      account_type: account.account_type,
      xero_account_id: account.xero_account_id || '',
      mapping_purpose: account.mapping_purpose || '',
      is_active: account.is_active ?? true,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const payload = {
      ...formData,
      xero_account_id: formData.xero_account_id || null,
      mapping_purpose: formData.mapping_purpose || null,
    };
    if (editingAccount) {
      updateAccount.mutate({ id: editingAccount.id, ...payload });
    } else {
      createAccount.mutate(payload);
    }
    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (editingAccount) {
      deleteAccount.mutate(editingAccount.id);
      setDeleteDialogOpen(false);
      setEditingAccount(null);
    }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      asset: 'bg-blue-500/10 text-blue-500',
      liability: 'bg-red-500/10 text-red-500',
      equity: 'bg-purple-500/10 text-purple-500',
      revenue: 'bg-green-500/10 text-green-500',
      expense: 'bg-orange-500/10 text-orange-500',
      cogs: 'bg-amber-500/10 text-amber-500',
    };
    return colors[type] || 'bg-muted text-muted-foreground';
  };

  const getMappingLabel = (purpose: string) => {
    return MAPPING_PURPOSES.find((m) => m.value === purpose)?.label || purpose;
  };

  // Group accounts by mapping purpose for the mapping view
  const mappingGroups = MAPPING_PURPOSES.map((purpose) => ({
    ...purpose,
    accounts: glAccounts?.filter((a) => a.mapping_purpose === purpose.value) || [],
  }));

  return (
    <div className="space-y-6">
      <SettingsBreadcrumb currentPage="GL Accounts" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">GL Accounts</h1>
          <p className="text-muted-foreground">Configure general ledger accounts and Xero mapping</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add GL Account
        </Button>
      </div>

      <Tabs defaultValue="accounts">
        <TabsList>
          <TabsTrigger value="accounts">
            <BookOpen className="mr-2 h-4 w-4" />
            All Accounts
          </TabsTrigger>
          <TabsTrigger value="mapping">
            <Link className="mr-2 h-4 w-4" />
            Account Mapping
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>General Ledger Accounts</CardTitle>
              <CardDescription>Chart of accounts with Xero integration</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Code</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Mapping Purpose</TableHead>
                    <TableHead>Xero ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center">Loading...</TableCell>
                    </TableRow>
                  ) : glAccounts?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No GL accounts configured. Click "Add GL Account" to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    glAccounts?.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell className="font-mono font-medium">{account.account_code}</TableCell>
                        <TableCell>{account.account_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getTypeColor(account.account_type)}>
                            {account.account_type.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {account.mapping_purpose ? getMappingLabel(account.mapping_purpose) : '—'}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {account.xero_account_id || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={account.is_active ? 'default' : 'secondary'}>
                            {account.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(account)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingAccount(account);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mapping" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {mappingGroups.map((group) => (
              <Card key={group.value}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{group.label}</CardTitle>
                  <CardDescription className="text-xs">{group.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {group.accounts.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No account mapped</p>
                  ) : (
                    <div className="space-y-2">
                      {group.accounts.map((account) => (
                        <div
                          key={account.id}
                          className="flex items-center justify-between p-2 rounded-md border bg-muted/30"
                        >
                          <div>
                            <p className="text-sm font-medium">{account.account_code}</p>
                            <p className="text-xs text-muted-foreground">{account.account_name}</p>
                          </div>
                          {account.xero_account_id && (
                            <Badge variant="outline" className="text-xs">
                              Xero
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAccount ? 'Edit GL Account' : 'Add GL Account'}</DialogTitle>
            <DialogDescription>
              {editingAccount ? 'Update the account details' : 'Add a new general ledger account'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="account_code">Account Code *</Label>
                <Input
                  id="account_code"
                  value={formData.account_code}
                  onChange={(e) => setFormData({ ...formData, account_code: e.target.value })}
                  placeholder="e.g., 1200-00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account_type">Account Type *</Label>
                <Select
                  value={formData.account_type}
                  onValueChange={(value) => setFormData({ ...formData, account_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="account_name">Account Name *</Label>
              <Input
                id="account_name"
                value={formData.account_name}
                onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                placeholder="e.g., Raw Materials Inventory"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mapping_purpose">Mapping Purpose</Label>
              <Select
                value={formData.mapping_purpose}
                onValueChange={(value) => setFormData({ ...formData, mapping_purpose: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select purpose..." />
                </SelectTrigger>
                <SelectContent>
                  {MAPPING_PURPOSES.map((purpose) => (
                    <SelectItem key={purpose.value} value={purpose.value}>
                      {purpose.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="xero_account_id">Xero Account ID</Label>
              <Input
                id="xero_account_id"
                value={formData.xero_account_id}
                onChange={(e) => setFormData({ ...formData, xero_account_id: e.target.value })}
                placeholder="Xero account identifier"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.account_code || !formData.account_name}>
              {editingAccount ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete GL Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{editingAccount?.account_code} - {editingAccount?.account_name}"? This action cannot be undone.
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
