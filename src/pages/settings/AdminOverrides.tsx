import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SettingsBreadcrumb } from '@/components/settings/SettingsBreadcrumb';
import { DataTablePagination } from '@/components/ui/data-table/DataTablePagination';
import { 
  ShieldAlert, 
  Search, 
  RefreshCw, 
  Lock, 
  Trash2, 
  CalendarDays, 
  Package, 
  UserCheck,
  FileText,
  KeyRound
} from 'lucide-react';
import { format } from 'date-fns';

interface AuditLogEntry {
  id: string;
  admin_user_id: string;
  target_user_id: string | null;
  action_type: string;
  action_details: Record<string, unknown>;
  justification: string | null;
  created_at: string;
  admin_profile?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
  target_profile?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

const ACTION_TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  password_set: { label: 'Password Set', icon: KeyRound, color: 'bg-blue-100 text-blue-800' },
  force_delete_wo: { label: 'Work Order Deleted', icon: Trash2, color: 'bg-red-100 text-red-800' },
  force_close_day: { label: 'Day Force Closed', icon: CalendarDays, color: 'bg-amber-100 text-amber-800' },
  po_status_override: { label: 'PO Status Override', icon: Package, color: 'bg-purple-100 text-purple-800' },
  employee_reinstate: { label: 'Employee Reinstated', icon: UserCheck, color: 'bg-green-100 text-green-800' },
};

const ACTION_FILTER_OPTIONS = [
  { value: 'all', label: 'All Actions' },
  { value: 'password_set', label: 'Password Set' },
  { value: 'force_delete_wo', label: 'Work Order Deleted' },
  { value: 'force_close_day', label: 'Day Force Closed' },
  { value: 'po_status_override', label: 'PO Status Override' },
  { value: 'employee_reinstate', label: 'Employee Reinstated' },
];

export default function AdminOverrides() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data: auditLogs, isLoading, refetch } = useQuery({
    queryKey: ['admin-audit-log', actionFilter],
    queryFn: async () => {
      let query = supabase
        .from('admin_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      
      if (actionFilter !== 'all') {
        query = query.eq('action_type', actionFilter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Fetch admin profiles separately
      const adminIds = [...new Set((data || []).map(d => d.admin_user_id))];
      const targetIds = [...new Set((data || []).filter(d => d.target_user_id).map(d => d.target_user_id!))];
      
      const { data: adminProfiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', adminIds);
      
      const { data: targetProfiles } = targetIds.length > 0 
        ? await supabase.from('profiles').select('id, first_name, last_name, email').in('id', targetIds)
        : { data: [] };
      
      const adminMap = new Map((adminProfiles || []).map(p => [p.id, p]));
      const targetMap = new Map((targetProfiles || []).map(p => [p.id, p]));
      
      return (data || []).map(log => ({
        ...log,
        action_details: log.action_details as Record<string, unknown>,
        admin_profile: adminMap.get(log.admin_user_id),
        target_profile: log.target_user_id ? targetMap.get(log.target_user_id) : null,
      })) as AuditLogEntry[];
    },
  });

  const filteredLogs = auditLogs?.filter(log => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    const adminName = `${log.admin_profile?.first_name || ''} ${log.admin_profile?.last_name || ''}`.toLowerCase();
    const targetName = log.target_profile 
      ? `${log.target_profile.first_name || ''} ${log.target_profile.last_name || ''}`.toLowerCase()
      : '';
    const justification = (log.justification || '').toLowerCase();
    return adminName.includes(searchLower) || targetName.includes(searchLower) || justification.includes(searchLower);
  });

  const totalItems = filteredLogs?.length || 0;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedLogs = filteredLogs?.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const getActionBadge = (actionType: string) => {
    const config = ACTION_TYPE_CONFIG[actionType] || { 
      label: actionType, 
      icon: FileText, 
      color: 'bg-gray-100 text-gray-800' 
    };
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={`gap-1 ${config.color}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatDetails = (actionType: string, details: Record<string, unknown>) => {
    switch (actionType) {
      case 'password_set':
        return `User: ${details.target_email || 'Unknown'}`;
      case 'force_delete_wo':
        return `WO: ${details.wo_number || 'Unknown'}`;
      case 'force_close_day':
        return `Date: ${details.date || 'Unknown'}, Blockers: ${
          ((details.blockers_ignored as Record<string, number>)?.receiving_sessions || 0) +
          ((details.blockers_ignored as Record<string, number>)?.production_lots || 0) +
          ((details.blockers_ignored as Record<string, number>)?.bills_of_lading || 0)
        }`;
      case 'po_status_override':
        return `PO: ${details.po_number || 'Unknown'} (${details.previous_status} → ${details.new_status})`;
      case 'employee_reinstate':
        return `Employee: ${details.employee_name || 'Unknown'}`;
      default:
        return JSON.stringify(details).slice(0, 50);
    }
  };

  // Calculate stats
  const stats = {
    total: auditLogs?.length || 0,
    today: auditLogs?.filter(l => 
      new Date(l.created_at).toDateString() === new Date().toDateString()
    ).length || 0,
    thisWeek: auditLogs?.filter(l => {
      const logDate = new Date(l.created_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return logDate >= weekAgo;
    }).length || 0,
  };

  return (
    <div className="space-y-6">
      <SettingsBreadcrumb currentPage="Admin Overrides" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-amber-600" />
            Admin Override Center
          </h1>
          <p className="text-muted-foreground">
            View and audit all administrative override actions
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Overrides</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.today}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.thisWeek}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Override Audit Log</CardTitle>
          <CardDescription>
            Complete history of all administrative override actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by admin, target, or justification..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="pl-9"
              />
            </div>
            <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                {ACTION_FILTER_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Justification</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : paginatedLogs?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      <ShieldAlert className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p>No override actions found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLogs?.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                      </TableCell>
                      <TableCell>{getActionBadge(log.action_type)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="font-medium">
                            {log.admin_profile?.first_name} {log.admin_profile?.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">{log.admin_profile?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {formatDetails(log.action_type, log.action_details)}
                      </TableCell>
                      <TableCell className="text-sm max-w-[250px]">
                        <p className="truncate" title={log.justification || ''}>
                          {log.justification || '-'}
                        </p>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalItems > 0 && (
            <DataTablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={totalItems}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
