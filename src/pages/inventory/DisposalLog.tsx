import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, FileDown, Search, DollarSign, Package, TrendingDown } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";

interface DisposalEntry {
  id: string;
  disposed_at: string;
  quantity_disposed: number;
  unit_cost: number | null;
  total_value: number;
  disposal_reason_code: string;
  disposal_reason_notes: string | null;
  source_type: string;
  supplier_points_assessed: number;
  approval_status: string;
  receiving_lot: {
    internal_lot_number: string;
    supplier_lot_number: string | null;
  } | null;
  material: { id: string; name: string; code: string } | null;
  supplier: { id: string; name: string } | null;
  unit: { id: string; code: string } | null;
  gl_account: { account_code: string; account_name: string } | null;
}

const DisposalLog = () => {
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [reasonFilter, setReasonFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch disposal entries
  const { data: disposalEntries, isLoading } = useQuery({
    queryKey: ['disposal-log', dateFrom, dateTo, reasonFilter, supplierFilter, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('disposal_log')
        .select(`
          *,
          receiving_lot:receiving_lots(
            internal_lot_number,
            supplier_lot_number
          ),
          material:materials(id, name, code),
          supplier:suppliers(id, name),
          unit:units_of_measure(id, code),
          gl_account:gl_accounts(account_code, account_name)
        `)
        .gte('disposed_at', `${dateFrom}T00:00:00`)
        .lte('disposed_at', `${dateTo}T23:59:59`)
        .order('disposed_at', { ascending: false });

      if (reasonFilter !== 'all') {
        query = query.eq('disposal_reason_code', reasonFilter);
      }
      if (supplierFilter !== 'all') {
        query = query.eq('supplier_id', supplierFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Client-side search filtering
      let filtered = data as DisposalEntry[];
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(d => 
          d.receiving_lot?.internal_lot_number?.toLowerCase().includes(term) ||
          d.material?.name?.toLowerCase().includes(term) ||
          d.supplier?.name?.toLowerCase().includes(term)
        );
      }
      
      return filtered;
    }
  });

  // Calculate summary
  const summary = {
    totalDisposed: disposalEntries?.length || 0,
    totalValue: disposalEntries?.reduce((sum, d) => sum + (d.total_value || 0), 0) || 0,
    totalSupplierPoints: disposalEntries?.reduce((sum, d) => sum + (d.supplier_points_assessed || 0), 0) || 0
  };

  // Get unique reasons for filter
  const uniqueReasons = [...new Set(disposalEntries?.map(d => d.disposal_reason_code) || [])];

  // Fetch suppliers
  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-list'],
    queryFn: async () => {
      const { data } = await supabase.from('suppliers').select('id, name').eq('is_active', true).order('name');
      return data;
    }
  });

  const handleExport = () => {
    if (!disposalEntries?.length) return;
    
    const csv = [
      ['Date', 'Lot #', 'Material', 'Qty', 'Unit', 'Value', 'Reason', 'Supplier', 'Points', 'GL Account'].join(','),
      ...disposalEntries.map(d => [
        format(new Date(d.disposed_at), 'yyyy-MM-dd'),
        d.receiving_lot?.internal_lot_number || '',
        d.material?.name || '',
        d.quantity_disposed,
        d.unit?.code || '',
        d.total_value.toFixed(2),
        d.disposal_reason_code,
        d.supplier?.name || '',
        d.supplier_points_assessed,
        d.gl_account?.account_code || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `disposal-log-${dateFrom}-to-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trash2 className="h-8 w-8 text-destructive" />
          <h1 className="text-3xl font-bold">Disposal Log</h1>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <FileDown className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-3xl font-bold">{summary.totalDisposed}</p>
                <p className="text-sm text-muted-foreground">Items Disposed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-destructive">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-destructive" />
              <div>
                <p className="text-3xl font-bold">
                  ${summary.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-muted-foreground">Total Value Lost</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingDown className="h-8 w-8 text-warning" />
              <div>
                <p className="text-3xl font-bold">{summary.totalSupplierPoints}</p>
                <p className="text-sm text-muted-foreground">Supplier Points Assessed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-[160px]"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-[160px]"
              />
            </div>

            <Select value={reasonFilter} onValueChange={setReasonFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Reasons" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reasons</SelectItem>
                {uniqueReasons.map((reason) => (
                  <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Suppliers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {suppliers?.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search lot, material, supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Lot #</TableHead>
              <TableHead>Material</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Points</TableHead>
              <TableHead>GL Account</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : !disposalEntries?.length ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  No disposal entries found for the selected period.
                </TableCell>
              </TableRow>
            ) : (
              disposalEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{format(new Date(entry.disposed_at), 'MMM d, yyyy')}</TableCell>
                  <TableCell className="font-mono">
                    {entry.receiving_lot?.internal_lot_number || '-'}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{entry.material?.name}</p>
                      <p className="text-xs text-muted-foreground">{entry.material?.code}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {entry.quantity_disposed} {entry.unit?.code}
                  </TableCell>
                  <TableCell className="font-medium text-destructive">
                    ${entry.total_value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{entry.disposal_reason_code}</Badge>
                  </TableCell>
                  <TableCell>{entry.supplier?.name || '-'}</TableCell>
                  <TableCell>
                    {entry.supplier_points_assessed > 0 ? (
                      <Badge variant="destructive" className="text-xs">
                        +{entry.supplier_points_assessed}
                      </Badge>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {entry.gl_account?.account_code || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={entry.approval_status === 'approved' ? 'default' : 
                               entry.approval_status === 'pending' ? 'outline' : 'secondary'}
                      className={entry.approval_status === 'approved' ? 'bg-green-500 text-white' : 
                                 entry.approval_status === 'pending' ? 'border-warning text-warning' : ''}
                    >
                      {entry.approval_status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default DisposalLog;
