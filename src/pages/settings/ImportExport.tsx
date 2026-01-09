import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Download, 
  Upload, 
  FileSpreadsheet, 
  Package, 
  ShoppingCart, 
  Truck, 
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { SettingsBreadcrumb } from '@/components/settings/SettingsBreadcrumb';

type EntityType = 'materials' | 'products' | 'suppliers' | 'customers';

interface ImportResult {
  created: number;
  skipped: number;
  errors: string[];
  preview: Array<{ row: number; data: Record<string, unknown>; status: 'new' | 'duplicate' | 'error'; message?: string }>;
}

const ENTITY_CONFIG: Record<EntityType, { 
  label: string; 
  icon: React.ElementType; 
  color: string;
  uniqueField: string;
  fields: string[];
}> = {
  materials: {
    label: 'Materials',
    icon: Package,
    color: 'bg-blue-500/10 text-blue-500',
    uniqueField: 'code',
    fields: ['code', 'name', 'category', 'sub_category', 'description', 'manufacturer', 'country_of_origin', 'item_number', 'label_copy', 'min_stock_level', 'cost_per_base_unit', 'is_active'],
  },
  products: {
    label: 'Products',
    icon: ShoppingCart,
    color: 'bg-green-500/10 text-green-500',
    uniqueField: 'sku',
    fields: ['sku', 'name', 'category', 'description', 'units_per_case', 'case_weight_kg', 'is_active'],
  },
  suppliers: {
    label: 'Suppliers',
    icon: Truck,
    color: 'bg-orange-500/10 text-orange-500',
    uniqueField: 'code',
    fields: ['code', 'name', 'supplier_type', 'contact_name', 'email', 'phone', 'fax', 'address', 'city', 'state', 'zip', 'country', 'website', 'payment_terms', 'credit_limit', 'risk_level', 'notes', 'is_active'],
  },
  customers: {
    label: 'Customers',
    icon: Users,
    color: 'bg-purple-500/10 text-purple-500',
    uniqueField: 'code',
    fields: ['code', 'name', 'customer_type', 'contact_name', 'email', 'phone', 'fax', 'address', 'city', 'state', 'zip', 'country', 'website', 'payment_terms', 'credit_limit', 'tax_exempt', 'tax_id', 'notes', 'is_active'],
  },
};

function downloadTemplate(entityType: EntityType) {
  const config = ENTITY_CONFIG[entityType];
  const headers = config.fields.join(',');
  const blob = new Blob([headers + '\n'], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${entityType}_template.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}

async function exportData(entityType: EntityType) {
  const config = ENTITY_CONFIG[entityType];
  const { data, error } = await supabase
    .from(entityType)
    .select(config.fields.join(','))
    .order('name');
  
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  const headers = config.fields.join(',');
  const rows = data.map(row => 
    config.fields.map(field => {
      const value = row[field as keyof typeof row];
      if (value === null || value === undefined) return '';
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return String(value);
    }).join(',')
  );
  
  const csv = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${entityType}_export_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });
    rows.push(row);
  }
  
  return rows;
}

export default function ImportExport() {
  const [activeTab, setActiveTab] = useState<EntityType>('materials');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportResult | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get counts for each entity
  const { data: counts } = useQuery({
    queryKey: ['entity-counts'],
    queryFn: async () => {
      const [materials, products, suppliers, customers] = await Promise.all([
        supabase.from('materials').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('suppliers').select('id', { count: 'exact', head: true }),
        supabase.from('customers').select('id', { count: 'exact', head: true }),
      ]);
      return {
        materials: materials.count || 0,
        products: products.count || 0,
        suppliers: suppliers.count || 0,
        customers: customers.count || 0,
      };
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setSelectedFile(file);
    
    // Parse and preview
    const text = await file.text();
    const rows = parseCSV(text);
    const config = ENTITY_CONFIG[activeTab];
    
    // Check for duplicates
    const { data: existing } = await supabase
      .from(activeTab)
      .select(config.uniqueField);
    
    const existingCodes = new Set((existing || []).map(e => e[config.uniqueField as keyof typeof e]));
    
    const preview: ImportResult['preview'] = rows.map((row, idx) => {
      const code = row[config.uniqueField];
      if (!code) {
        return { row: idx + 2, data: row, status: 'error' as const, message: `Missing ${config.uniqueField}` };
      }
      if (existingCodes.has(code)) {
        return { row: idx + 2, data: row, status: 'duplicate' as const, message: `${config.uniqueField} already exists` };
      }
      return { row: idx + 2, data: row, status: 'new' as const };
    });
    
    setImportPreview({
      created: preview.filter(p => p.status === 'new').length,
      skipped: preview.filter(p => p.status === 'duplicate').length,
      errors: preview.filter(p => p.status === 'error').map(p => `Row ${p.row}: ${p.message}`),
      preview,
    });
    setIsPreviewOpen(true);
  };

  const handleImport = async () => {
    if (!importPreview) return;
    
    setIsImporting(true);
    const config = ENTITY_CONFIG[activeTab];
    const rowsToImport = importPreview.preview
      .filter(p => p.status === 'new')
      .map(p => {
        const data: Record<string, unknown> = {};
        config.fields.forEach(field => {
          const value = p.data[field];
          if (value !== undefined && value !== '') {
            // Convert boolean strings
            if (field === 'is_active' || field === 'tax_exempt') {
              data[field] = String(value).toLowerCase() === 'true' || value === '1';
            } else if (['min_stock_level', 'cost_per_base_unit', 'units_per_case', 'case_weight_kg', 'credit_limit'].includes(field)) {
              data[field] = parseFloat(String(value)) || null;
            } else {
              data[field] = value;
            }
          }
        });
        return data;
      });
    
    try {
      // For materials and products, we need to handle the unit_id requirement
      if (activeTab === 'materials') {
        // Get default base unit
        const { data: defaultUnit } = await supabase
          .from('units_of_measure')
          .select('id')
          .eq('is_base_unit', true)
          .limit(1)
          .single();
        
        if (defaultUnit) {
          rowsToImport.forEach(row => {
            if (!row.base_unit_id) {
              row.base_unit_id = defaultUnit.id;
            }
          });
        }
      }
      
      if (activeTab === 'products') {
        // Get default unit
        const { data: defaultUnit } = await supabase
          .from('units_of_measure')
          .select('id')
          .limit(1)
          .single();
        
        if (defaultUnit) {
          rowsToImport.forEach(row => {
            if (!row.unit_id) {
              row.unit_id = defaultUnit.id;
            }
          });
        }
      }

      // Type assertion for Supabase insert
      const { error } = await supabase.from(activeTab).insert(rowsToImport as never[]);
      
      if (error) throw error;
      
      toast({ 
        title: 'Import successful', 
        description: `Created ${rowsToImport.length} ${config.label.toLowerCase()}` 
      });
      
      queryClient.invalidateQueries({ queryKey: [activeTab] });
      queryClient.invalidateQueries({ queryKey: ['entity-counts'] });
      setIsPreviewOpen(false);
      setSelectedFile(null);
      setImportPreview(null);
    } catch (error) {
      toast({ 
        title: 'Import failed', 
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleExport = async () => {
    try {
      await exportData(activeTab);
      toast({ title: 'Export successful' });
    } catch (error) {
      toast({ 
        title: 'Export failed', 
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      <SettingsBreadcrumb currentPage="Import / Export" />
      
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Import / Export</h1>
        <p className="text-muted-foreground">
          Download templates, export data, or import records from CSV files
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as EntityType)}>
        <TabsList className="grid w-full grid-cols-4">
          {Object.entries(ENTITY_CONFIG).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <TabsTrigger key={key} value={key} className="gap-2">
                <Icon className="h-4 w-4" />
                {config.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {Object.entries(ENTITY_CONFIG).map(([key, config]) => {
          const Icon = config.icon;
          const entityKey = key as EntityType;
          return (
            <TabsContent key={key} value={key} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Download Template Card */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className={`rounded-lg p-2 ${config.color}`}>
                        <FileSpreadsheet className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Download Template</CardTitle>
                        <CardDescription>
                          Get a blank CSV template with all fields
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Template includes: {config.fields.slice(0, 5).join(', ')}
                      {config.fields.length > 5 && ` +${config.fields.length - 5} more`}
                    </p>
                    <Button onClick={() => downloadTemplate(entityKey)} className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Download Template
                    </Button>
                  </CardContent>
                </Card>

                {/* Export Data Card */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className={`rounded-lg p-2 ${config.color}`}>
                        <Download className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Export Data</CardTitle>
                        <CardDescription>
                          Download all {config.label.toLowerCase()} as CSV
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Current records: <Badge variant="secondary">{counts?.[entityKey] || 0}</Badge>
                    </p>
                    <Button 
                      onClick={handleExport} 
                      variant="outline" 
                      className="w-full"
                      disabled={!counts?.[entityKey]}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export {config.label}
                    </Button>
                  </CardContent>
                </Card>

                {/* Import Data Card */}
                <Card className="md:col-span-2">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className={`rounded-lg p-2 ${config.color}`}>
                        <Upload className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Import Data</CardTitle>
                        <CardDescription>
                          Upload a CSV file to import {config.label.toLowerCase()}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Label htmlFor="file-upload" className="sr-only">Choose file</Label>
                        <Input
                          id="file-upload"
                          type="file"
                          accept=".csv"
                          onChange={handleFileChange}
                          className="cursor-pointer"
                        />
                      </div>
                    </div>
                    <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="font-medium">Duplicate Detection</p>
                      <p>
                        Records with existing <code className="text-xs bg-muted px-1 rounded">{config.uniqueField}</code> will be skipped
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Import Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Import Preview</DialogTitle>
            <DialogDescription>
              Review the data before importing. Duplicates will be skipped.
            </DialogDescription>
          </DialogHeader>
          
          {importPreview && (
            <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
              {/* Summary */}
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">
                    <strong>{importPreview.created}</strong> new records
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-amber-500" />
                  <span className="text-sm">
                    <strong>{importPreview.skipped}</strong> duplicates (will skip)
                  </span>
                </div>
                {importPreview.errors.length > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span className="text-sm">
                      <strong>{importPreview.errors.length}</strong> errors
                    </span>
                  </div>
                )}
              </div>

              {/* Preview Table */}
              <div className="flex-1 overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[60px]">Row</TableHead>
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead>Data Preview</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importPreview.preview.slice(0, 50).map((item) => (
                      <TableRow key={item.row}>
                        <TableCell className="font-mono text-xs">{item.row}</TableCell>
                        <TableCell>
                          {item.status === 'new' && (
                            <Badge className="bg-green-100 text-green-800 border-green-200">New</Badge>
                          )}
                          {item.status === 'duplicate' && (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200">Skip</Badge>
                          )}
                          {item.status === 'error' && (
                            <Badge variant="destructive">Error</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-md truncate">
                          {item.message || Object.entries(item.data).slice(0, 4).map(([k, v]) => `${k}: ${v}`).join(', ')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {importPreview.preview.length > 50 && (
                <p className="text-xs text-muted-foreground text-center">
                  Showing first 50 of {importPreview.preview.length} rows
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={isImporting || !importPreview?.created}
            >
              {isImporting ? 'Importing...' : `Import ${importPreview?.created || 0} Records`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
