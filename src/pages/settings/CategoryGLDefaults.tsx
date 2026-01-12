import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, BookOpen, Package } from 'lucide-react';
import { SettingsBreadcrumb } from '@/components/settings/SettingsBreadcrumb';

// Material categories (should match MaterialFormDialog)
const MATERIAL_CATEGORIES = [
  { value: 'Ingredients', description: 'Raw materials for production' },
  { value: 'Packaging', description: 'Bottles, jars, pouches, etc.' },
  { value: 'Boxes', description: 'Corrugated boxes, cases' },
  { value: 'Chemical', description: 'Cleaning and sanitation chemicals' },
  { value: 'Supplies', description: 'Office and operational supplies' },
  { value: 'Maintenance', description: 'Repair and maintenance parts' },
  { value: 'Direct Sale', description: 'Items sold directly to customers' },
];

interface CategoryDefault {
  id?: string;
  category: string;
  gl_account_id: string | null;
  gl_account?: {
    id: string;
    account_code: string;
    account_name: string;
  } | null;
}

export default function CategoryGLDefaults() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pendingChanges, setPendingChanges] = useState<Record<string, string | null>>({});

  // Fetch GL accounts
  const { data: glAccounts, isLoading: glLoading } = useQuery({
    queryKey: ['gl-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gl_accounts')
        .select('*')
        .eq('is_active', true)
        .order('account_code');
      if (error) throw error;
      return data;
    },
  });

  // Fetch existing category defaults
  const { data: categoryDefaults, isLoading: defaultsLoading } = useQuery({
    queryKey: ['material-category-gl-defaults'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('material_category_gl_defaults')
        .select('*, gl_account:gl_accounts(id, account_code, account_name)');
      if (error) throw error;
      return data as CategoryDefault[];
    },
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (changes: Record<string, string | null>) => {
      for (const [category, glAccountId] of Object.entries(changes)) {
        const existingDefault = categoryDefaults?.find(d => d.category === category);
        
        if (existingDefault) {
          // Update existing
          const { error } = await supabase
            .from('material_category_gl_defaults')
            .update({ gl_account_id: glAccountId })
            .eq('id', existingDefault.id);
          if (error) throw error;
        } else if (glAccountId) {
          // Insert new
          const { error } = await supabase
            .from('material_category_gl_defaults')
            .insert({ category, gl_account_id: glAccountId });
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-category-gl-defaults'] });
      setPendingChanges({});
      toast({ title: 'Category GL defaults saved successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error saving defaults', description: error.message, variant: 'destructive' });
    },
  });

  const isLoading = glLoading || defaultsLoading;

  // Get current value for a category (pending change or saved value)
  const getGlAccountId = (category: string): string | null => {
    if (category in pendingChanges) {
      return pendingChanges[category];
    }
    const saved = categoryDefaults?.find(d => d.category === category);
    return saved?.gl_account_id || null;
  };

  // Handle selection change
  const handleChange = (category: string, glAccountId: string | null) => {
    setPendingChanges(prev => ({
      ...prev,
      [category]: glAccountId,
    }));
  };

  const hasChanges = Object.keys(pendingChanges).length > 0;

  const handleSave = () => {
    saveMutation.mutate(pendingChanges);
  };

  return (
    <div className="space-y-6">
      <SettingsBreadcrumb currentPage="Category GL Defaults" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Category GL Defaults</h1>
          <p className="text-muted-foreground">
            Set default GL accounts for each material category. When creating materials, the GL account will auto-populate based on the category.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Material Categories
          </CardTitle>
          <CardDescription>
            Assign a default GL account to each material category. This determines which accounting code is used when syncing purchases to Xero.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[300px]">Default GL Account</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MATERIAL_CATEGORIES.map((cat) => {
                  const currentGlId = getGlAccountId(cat.value);
                  const hasChange = cat.value in pendingChanges;
                  const currentGl = glAccounts?.find(g => g.id === currentGlId);
                  
                  return (
                    <TableRow key={cat.value}>
                      <TableCell className="font-medium">{cat.value}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {cat.description}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={currentGlId || '__none__'}
                          onValueChange={(value) => 
                            handleChange(cat.value, value === '__none__' ? null : value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select GL account" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">-- No default --</SelectItem>
                            {glAccounts?.map((gl) => (
                              <SelectItem key={gl.id} value={gl.id}>
                                <div className="flex items-center gap-2">
                                  <BookOpen className="h-3 w-3 text-muted-foreground" />
                                  <span className="font-mono text-xs">{gl.account_code}</span>
                                  <span>-</span>
                                  <span>{gl.account_name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {hasChange ? (
                          <Badge variant="secondary">Modified</Badge>
                        ) : currentGl ? (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            Set
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Not set
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">How it works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>1. Set defaults:</strong> Assign a GL account to each material category above.
          </p>
          <p>
            <strong>2. Auto-populate:</strong> When creating a new material, the GL account will automatically populate based on the selected category.
          </p>
          <p>
            <strong>3. Override if needed:</strong> Users can still manually change the GL account on individual materials.
          </p>
          <p>
            <strong>4. Xero sync:</strong> When syncing invoices to Xero, each line item uses the material's assigned GL account code.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}