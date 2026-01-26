import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SettingsBreadcrumb } from '@/components/settings/SettingsBreadcrumb';
import { supabase } from '@/integrations/supabase/client';
import {
  Mail,
  Link2,
  Database,
  Webhook,
  Activity,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Zap,
  FileText,
  Brain,
  HardDrive,
  FolderOpen,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

export default function IntegrationUsage() {
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch email activity (sent emails from the past 30 days based on invoice/PO sends)
  const { data: emailStats, isLoading: emailLoading } = useQuery({
    queryKey: ['email-usage-stats', refreshKey],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      
      // Count invoices sent - use type assertion for tables not in generated types
      const { count: invoicesSent } = await (supabase as any)
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .not('sent_at', 'is', null)
        .gte('sent_at', thirtyDaysAgo);

      // Count POs sent
      const { count: posSent } = await supabase
        .from('purchase_orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'sent')
        .gte('updated_at', thirtyDaysAgo);

      // Get welcome emails sent (employee users created)
      const { count: welcomeEmails } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .not('user_id', 'is', null)
        .gte('created_at', thirtyDaysAgo);

      return {
        invoicesSent: invoicesSent || 0,
        posSent: posSent || 0,
        welcomeEmails: welcomeEmails || 0,
        total: (invoicesSent || 0) + (posSent || 0) + (welcomeEmails || 0),
      };
    },
  });

  // Fetch Xero connection status
  const { data: xeroStatus, isLoading: xeroLoading } = useQuery({
    queryKey: ['xero-connection-status', refreshKey],
    queryFn: async () => {
      const { data } = await supabase
        .from('xero_connections')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!data) return { connected: false };

      // Count synced records this month
      const startOfMonthDate = startOfMonth(new Date()).toISOString();
      const endOfMonthDate = endOfMonth(new Date()).toISOString();

      const { count: journalsSynced } = await supabase
        .from('production_lots')
        .select('*', { count: 'exact', head: true })
        .not('xero_journal_id', 'is', null)
        .gte('updated_at', startOfMonthDate)
        .lte('updated_at', endOfMonthDate);

      const { count: invoicesSynced } = await (supabase as any)
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .not('xero_invoice_id', 'is', null)
        .gte('updated_at', startOfMonthDate)
        .lte('updated_at', endOfMonthDate);

      return {
        connected: true,
        tenantName: data.tenant_name,
        lastRefresh: data.updated_at,
        journalsSynced: journalsSynced || 0,
        invoicesSynced: invoicesSynced || 0,
      };
    },
  });

  // Fetch database usage stats
  const { data: dbStats, isLoading: dbLoading } = useQuery({
    queryKey: ['database-usage-stats', refreshKey],
    queryFn: async () => {
      // Get row counts for major tables using raw queries
      const tables = [
        'materials',
        'products',
        'production_lots',
        'receiving_lots',
        'purchase_orders',
        'sales_orders',
        'inventory_transactions',
        'employees',
        'customers',
        'suppliers',
      ];

      const counts: Record<string, number> = {};
      let totalRows = 0;

      for (const table of tables) {
        const { count } = await (supabase as any)
          .from(table)
          .select('*', { count: 'exact', head: true });
        counts[table] = count || 0;
        totalRows += count || 0;
      }

      return {
        counts,
        totalRows,
        tablesTracked: tables.length,
      };
    },
  });

  // Fetch webhook activity
  const { data: webhookStats, isLoading: webhookLoading } = useQuery({
    queryKey: ['webhook-usage-stats', refreshKey],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      
      // Count inbound PO emails processed
      const { count: inboundPOs } = await (supabase as any)
        .from('inbound_po_emails')
        .select('*', { count: 'exact', head: true })
        .gte('received_at', thirtyDaysAgo);

      return {
        inboundPOsProcessed: inboundPOs || 0,
      };
    },
  });

  // Fetch edge function usage (based on activity indicators)
  const { data: functionStats, isLoading: functionLoading } = useQuery({
    queryKey: ['function-usage-stats', refreshKey],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

      // Count AI remittance processing
      const { count: remittanceProcessed } = await (supabase as any)
        .from('payment_remittances')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo);

      // Count USDA food searches (materials with nutrition data)
      const { count: nutritionSearches } = await supabase
        .from('materials')
        .select('*', { count: 'exact', head: true })
        .not('nutrition_data', 'is', null);

      // Admin actions
      const { count: adminActions } = await supabase
        .from('admin_audit_log')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo);

      return {
        remittanceProcessed: remittanceProcessed || 0,
        nutritionSearches: nutritionSearches || 0,
        adminActions: adminActions || 0,
      };
    },
  });

  // Fetch storage usage stats
  const { data: storageStats, isLoading: storageLoading } = useQuery({
    queryKey: ['storage-usage-stats', refreshKey],
    queryFn: async () => {
      // Query storage.objects to get file counts and sizes per bucket
      const { data: bucketStats, error } = await (supabase as any)
        .rpc('get_storage_usage');

      if (error) {
        // Fallback: just get bucket list if RPC doesn't exist
        console.log('Storage RPC not available, using fallback');
        return {
          buckets: [],
          totalSize: 0,
          totalFiles: 0,
          limitGB: 1, // Free tier default
        };
      }

      const buckets = bucketStats || [];
      const totalSize = buckets.reduce((sum: number, b: any) => sum + (Number(b.total_size) || 0), 0);
      const totalFiles = buckets.reduce((sum: number, b: any) => sum + (Number(b.file_count) || 0), 0);

      return {
        buckets,
        totalSize,
        totalFiles,
        limitGB: 1, // Supabase free tier = 1GB
      };
    },
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const isLoading = emailLoading || xeroLoading || dbLoading || webhookLoading || functionLoading || storageLoading;

  // Helper to format bytes
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Calculate storage percentage
  const storageUsedGB = (storageStats?.totalSize || 0) / (1024 * 1024 * 1024);
  const storagePercentage = Math.min((storageUsedGB / (storageStats?.limitGB || 1)) * 100, 100);

  return (
    <div className="space-y-6">
      <SettingsBreadcrumb currentPage="Integration Usage" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integration Usage</h1>
          <p className="text-muted-foreground">
            Monitor API calls, database usage, and integration activity
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Emails Sent (30d)</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emailStats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {emailStats?.invoicesSent || 0} invoices, {emailStats?.posSent || 0} POs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Xero Syncs (MTD)</CardTitle>
            <Link2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {xeroStatus?.connected 
                ? (xeroStatus.journalsSynced || 0) + (xeroStatus.invoicesSynced || 0)
                : '—'}
            </div>
            <p className="text-xs text-muted-foreground">
              {xeroStatus?.connected 
                ? `${xeroStatus.journalsSynced || 0} journals, ${xeroStatus.invoicesSynced || 0} invoices`
                : 'Not connected'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Database Records</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dbStats?.totalRows?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {dbStats?.tablesTracked || 0} core tables
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatBytes(storageStats?.totalSize || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {storageStats?.totalFiles || 0} files in {storageStats?.buckets?.length || 0} buckets
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Webhooks (30d)</CardTitle>
            <Webhook className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {webhookStats?.inboundPOsProcessed || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Inbound PO emails processed
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="email" className="space-y-4">
        <TabsList>
          <TabsTrigger value="email">Email (Resend)</TabsTrigger>
          <TabsTrigger value="xero">Xero</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
          <TabsTrigger value="functions">Edge Functions</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        </TabsList>

        {/* Email Tab */}
        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Resend Email Service
              </CardTitle>
              <CardDescription>
                Transactional email usage via Resend API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span className="font-medium">Service Active</span>
                <Badge variant="outline" className="ml-auto">Resend API</Badge>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm">Invoices Sent</span>
                  </div>
                  <p className="text-2xl font-bold">{emailStats?.invoicesSent || 0}</p>
                  <p className="text-xs text-muted-foreground">Last 30 days</p>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm">POs Sent</span>
                  </div>
                  <p className="text-2xl font-bold">{emailStats?.posSent || 0}</p>
                  <p className="text-xs text-muted-foreground">Last 30 days</p>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Mail className="h-4 w-4" />
                    <span className="text-sm">Welcome Emails</span>
                  </div>
                  <p className="text-2xl font-bold">{emailStats?.welcomeEmails || 0}</p>
                  <p className="text-xs text-muted-foreground">New employees</p>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Email types: Invoice, Purchase Order, 3PL Release, Employee Welcome, Password Reset
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Xero Tab */}
        <TabsContent value="xero" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Xero Accounting Integration
              </CardTitle>
              <CardDescription>
                Sync manufacturing journals, invoices, and bills
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-3">
                {xeroStatus?.connected ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <span className="font-medium">Connected</span>
                    <Badge variant="outline" className="ml-2">{xeroStatus.tenantName}</Badge>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium text-muted-foreground">Not Connected</span>
                  </>
                )}
              </div>

              {xeroStatus?.connected && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm">Journals Synced</span>
                    </div>
                    <p className="text-2xl font-bold">{xeroStatus.journalsSynced || 0}</p>
                    <p className="text-xs text-muted-foreground">This month</p>
                  </div>

                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm">Invoices Synced</span>
                    </div>
                    <p className="text-2xl font-bold">{xeroStatus.invoicesSynced || 0}</p>
                    <p className="text-xs text-muted-foreground">This month</p>
                  </div>
                </div>
              )}

              <div className="text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Sync types: Production Journals, Sales Invoices, PO Bills, FG Completion
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Database Tab */}
        <TabsContent value="database" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Usage
              </CardTitle>
              <CardDescription>
                Record counts across core system tables
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span className="font-medium">Database Active</span>
                <Badge variant="outline" className="ml-auto">PostgreSQL</Badge>
              </div>

              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {dbStats?.counts && Object.entries(dbStats.counts).map(([table, count]) => (
                  <div key={table} className="flex items-center justify-between rounded-lg border p-3">
                    <span className="text-sm font-medium capitalize">
                      {table.replace(/_/g, ' ')}
                    </span>
                    <Badge variant="secondary">{count.toLocaleString()}</Badge>
                  </div>
                ))}
              </div>

              <div className="rounded-lg bg-muted/50 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total Records</span>
                  <span className="text-2xl font-bold">{dbStats?.totalRows?.toLocaleString() || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Storage Tab */}
        <TabsContent value="storage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                File Storage
              </CardTitle>
              <CardDescription>
                Storage usage across all buckets
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Storage Limit Progress */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Storage Usage</span>
                  <span className="text-sm text-muted-foreground">
                    {formatBytes(storageStats?.totalSize || 0)} / {storageStats?.limitGB || 1} GB
                  </span>
                </div>
                <Progress value={storagePercentage} className="h-3" />
                <div className="flex items-center gap-2 text-sm">
                  {storagePercentage >= 80 ? (
                    <>
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      <span className="text-warning">
                        {storagePercentage >= 95 
                          ? 'Critical: Storage nearly full!'
                          : 'Warning: Approaching storage limit'}
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span className="text-muted-foreground">
                        {(100 - storagePercentage).toFixed(1)}% storage remaining
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Bucket Breakdown */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">Storage by Bucket</h4>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {storageStats?.buckets?.map((bucket: any) => (
                    <div key={bucket.bucket_id} className="rounded-lg border p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <FolderOpen className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{bucket.bucket_name}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{bucket.file_count} files</span>
                        <Badge variant="secondary">{formatBytes(Number(bucket.total_size))}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-lg bg-muted/50 p-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{storageStats?.buckets?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Total Buckets</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{storageStats?.totalFiles || 0}</p>
                    <p className="text-xs text-muted-foreground">Total Files</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{formatBytes(storageStats?.totalSize || 0)}</p>
                    <p className="text-xs text-muted-foreground">Total Size</p>
                  </div>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Storage buckets: {storageStats?.buckets?.map((b: any) => b.bucket_name).join(', ') || 'None'}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Edge Functions Tab */}
        <TabsContent value="functions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Edge Functions
              </CardTitle>
              <CardDescription>
                Serverless function invocations and API calls
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span className="font-medium">Functions Active</span>
                <Badge variant="outline" className="ml-auto">23 Functions</Badge>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Brain className="h-4 w-4" />
                    <span className="text-sm">AI Remittance Processing</span>
                  </div>
                  <p className="text-2xl font-bold">{functionStats?.remittanceProcessed || 0}</p>
                  <p className="text-xs text-muted-foreground">Last 30 days</p>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Database className="h-4 w-4" />
                    <span className="text-sm">USDA Nutrition Lookups</span>
                  </div>
                  <p className="text-2xl font-bold">{functionStats?.nutritionSearches || 0}</p>
                  <p className="text-xs text-muted-foreground">Materials with data</p>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Activity className="h-4 w-4" />
                    <span className="text-sm">Admin Actions</span>
                  </div>
                  <p className="text-2xl font-bold">{functionStats?.adminActions || 0}</p>
                  <p className="text-xs text-muted-foreground">Last 30 days</p>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-2">Available Functions:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    'send-invoice-email',
                    'send-po-email',
                    'send-3pl-release-email',
                    'xero-sync-*',
                    'usda-food-search',
                    'extract-nutrition-pdf',
                    'process-payment-remittance',
                    'admin-*',
                    'inbound-po-webhook',
                  ].map((fn) => (
                    <Badge key={fn} variant="outline" className="text-xs">{fn}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Webhooks
              </CardTitle>
              <CardDescription>
                Inbound webhook endpoints and processing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span className="font-medium">Endpoints Active</span>
              </div>

              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Inbound PO Email Webhook</span>
                    </div>
                    <Badge variant="outline" className="text-primary border-primary">Active</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Receives incoming PO emails from Resend and extracts order data
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      {webhookStats?.inboundPOsProcessed || 0} processed (30d)
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 p-4">
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <span>Webhook security: Svix signature verification enabled</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Last Updated */}
      <div className="text-center text-sm text-muted-foreground">
        <Clock className="h-4 w-4 inline mr-1" />
        Data as of {format(new Date(), 'PPp')}
      </div>
    </div>
  );
}
