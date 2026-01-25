import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, FileDown, Printer, Search, AlertCircle, Clock, CheckCircle2, Plus, Tag } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { HoldDetailDialog } from "@/components/inventory/HoldDetailDialog";
import { HoldResolutionDialog } from "@/components/inventory/HoldResolutionDialog";
import { ManualHoldDialog } from "@/components/inventory/ManualHoldDialog";
import { HoldLabelPrint } from "@/components/inventory/HoldLabelPrint";
import { cn } from "@/lib/utils";

type HoldStatus = 'pending' | 'under_review' | 'released' | 'rejected' | 'disposed' | 'returned';

interface HoldEntry {
  id: string;
  receiving_lot_id: string;
  hold_reason_code_id: string;
  hold_reason_description: string | null;
  hold_placed_at: string;
  hold_placed_by: string | null;
  auto_hold: boolean;
  status: HoldStatus;
  priority: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  resolution_type: string | null;
  supplier_point_assessed: boolean;
  supplier_point_reason: string | null;
  capa_id: string | null;
  receiving_lot: {
    id: string;
    internal_lot_number: string;
    supplier_lot_number: string | null;
    quantity_received: number;
    material: { id: string; name: string; code: string } | null;
    supplier: { id: string; name: string } | null;
    unit: { id: string; code: string; name: string } | null;
  } | null;
  reason: { id: string; code: string; name: string; supplier_points: number } | null;
}

const HoldLog = () => {
  const [statusFilter, setStatusFilter] = useState("all");
  const [reasonFilter, setReasonFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedHold, setSelectedHold] = useState<HoldEntry | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showResolutionDialog, setShowResolutionDialog] = useState(false);
  const [resolutionType, setResolutionType] = useState<'release' | 'reject'>('release');
  const [showManualHoldDialog, setShowManualHoldDialog] = useState(false);
  const [showLabelDialog, setShowLabelDialog] = useState(false);
  const [labelHold, setLabelHold] = useState<HoldEntry | null>(null);

  // Fetch hold log entries with related data
  const { data: holdEntries, isLoading, refetch } = useQuery({
    queryKey: ['hold-log', statusFilter, reasonFilter, supplierFilter, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('inventory_holds')
        .select(`
          *,
          receiving_lot:receiving_lots(
            id,
            internal_lot_number,
            supplier_lot_number,
            quantity_received,
            material:materials(id, name, code),
            supplier:suppliers(id, name),
            unit:units_of_measure(id, code, name)
          ),
          reason:hold_reason_codes(id, code, name, supplier_points)
        `)
        .order('hold_placed_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (reasonFilter !== 'all') {
        query = query.eq('hold_reason_code_id', reasonFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Filter by search term and supplier on client side
      let filtered = data as HoldEntry[];
      
      if (supplierFilter !== 'all') {
        filtered = filtered.filter(h => h.receiving_lot?.supplier?.id === supplierFilter);
      }
      
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(h => 
          h.receiving_lot?.internal_lot_number?.toLowerCase().includes(term) ||
          h.receiving_lot?.material?.name?.toLowerCase().includes(term) ||
          h.receiving_lot?.supplier?.name?.toLowerCase().includes(term)
        );
      }
      
      return filtered;
    }
  });

  // Fetch summary counts
  const { data: summaryCounts } = useQuery({
    queryKey: ['hold-log-summary'],
    queryFn: async () => {
      const { count: pending } = await supabase
        .from('inventory_holds')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      const { count: underReview } = await supabase
        .from('inventory_holds')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'under_review');
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { count: resolved } = await supabase
        .from('inventory_holds')
        .select('id', { count: 'exact', head: true })
        .in('status', ['released', 'rejected', 'disposed', 'returned'])
        .gte('resolved_at', thirtyDaysAgo.toISOString());

      return {
        pending: pending || 0,
        underReview: underReview || 0,
        resolved: resolved || 0
      };
    }
  });

  // Fetch filter options
  const { data: reasonCodes } = useQuery({
    queryKey: ['hold-reason-codes'],
    queryFn: async () => {
      const { data } = await supabase
        .from('hold_reason_codes')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      return data;
    }
  });

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('suppliers')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      return data;
    }
  });

  const getStatusBadge = (status: HoldStatus) => {
    const variants: Record<HoldStatus, { variant: "destructive" | "warning" | "success" | "secondary" | "default"; label: string }> = {
      pending: { variant: "destructive", label: "Pending" },
      under_review: { variant: "warning", label: "Under Review" },
      released: { variant: "success", label: "Released" },
      rejected: { variant: "secondary", label: "Rejected" },
      disposed: { variant: "secondary", label: "Disposed" },
      returned: { variant: "secondary", label: "Returned" }
    };
    const config = variants[status] || { variant: "default", label: status };
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
  };

  const getRowBgClass = (status: HoldStatus) => {
    switch (status) {
      case 'pending': return 'bg-red-50 hover:bg-red-100';
      case 'under_review': return 'bg-yellow-50 hover:bg-yellow-100';
      case 'released': return 'bg-green-50 hover:bg-green-100';
      case 'disposed':
      case 'returned':
      case 'rejected': return 'bg-gray-50 hover:bg-gray-100';
      default: return 'hover:bg-muted/50';
    }
  };

  const handleRelease = (hold: HoldEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedHold(hold);
    setResolutionType('release');
    setShowResolutionDialog(true);
  };

  const handleReject = (hold: HoldEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedHold(hold);
    setResolutionType('reject');
    setShowResolutionDialog(true);
  };

  const handleExport = () => {
    if (!holdEntries?.length) return;
    
    const csv = [
      ['Status', 'Lot #', 'Material', 'Supplier', 'Reason', 'Hold Date', 'Age (days)', 'Points'].join(','),
      ...holdEntries.map(h => [
        h.status,
        h.receiving_lot?.internal_lot_number || '',
        h.receiving_lot?.material?.name || '',
        h.receiving_lot?.supplier?.name || '',
        h.reason?.name || '',
        format(new Date(h.hold_placed_at), 'yyyy-MM-dd'),
        differenceInDays(new Date(), new Date(h.hold_placed_at)),
        h.supplier_point_assessed ? h.reason?.supplier_points : ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hold-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-8 w-8 text-warning" />
          <h1 className="text-3xl font-bold">Hold Log</h1>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowManualHoldDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Hold
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <FileDown className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-destructive">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <div>
                <p className="text-3xl font-bold">{summaryCounts?.pending || 0}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-warning">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-warning" />
              <div>
                <p className="text-3xl font-bold">{summaryCounts?.underReview || 0}</p>
                <p className="text-sm text-muted-foreground">Under Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-3xl font-bold">{summaryCounts?.resolved || 0}</p>
                <p className="text-sm text-muted-foreground">Resolved (30 days)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="released">Released</SelectItem>
                <SelectItem value="disposed">Disposed</SelectItem>
                <SelectItem value="returned">Returned</SelectItem>
              </SelectContent>
            </Select>

            <Select value={reasonFilter} onValueChange={setReasonFilter}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="All Reasons" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reasons</SelectItem>
                {reasonCodes?.map((reason) => (
                  <SelectItem key={reason.id} value={reason.id}>
                    {reason.name}
                  </SelectItem>
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
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search lot number, material, supplier..."
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
              <TableHead>Status</TableHead>
              <TableHead>Lot #</TableHead>
              <TableHead>Material</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Hold Date</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Points</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : !holdEntries?.length ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No holds found
                </TableCell>
              </TableRow>
            ) : (
              holdEntries.map((hold) => {
                const age = differenceInDays(new Date(), new Date(hold.hold_placed_at));
                return (
                  <TableRow
                    key={hold.id}
                    className={cn("cursor-pointer", getRowBgClass(hold.status))}
                    onClick={() => {
                      setSelectedHold(hold);
                      setShowDetailDialog(true);
                    }}
                  >
                    <TableCell>{getStatusBadge(hold.status)}</TableCell>
                    <TableCell className="font-mono font-medium">
                      {hold.receiving_lot?.internal_lot_number}
                    </TableCell>
                    <TableCell>{hold.receiving_lot?.material?.name}</TableCell>
                    <TableCell>{hold.receiving_lot?.supplier?.name}</TableCell>
                    <TableCell>{hold.reason?.name}</TableCell>
                    <TableCell>{format(new Date(hold.hold_placed_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <span className={cn(age > 7 ? 'text-destructive font-bold' : '')}>
                        {age} {age === 1 ? 'day' : 'days'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {hold.supplier_point_assessed && hold.reason?.supplier_points ? (
                        <Badge variant="outline" className="text-destructive">
                          +{hold.reason.supplier_points} pts
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        {/* Print Label Button - always visible for active holds */}
                        {(hold.status === 'pending' || hold.status === 'under_review') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLabelHold(hold);
                              setShowLabelDialog(true);
                            }}
                            title="Print Hold Label"
                          >
                            <Tag className="h-4 w-4" />
                          </Button>
                        )}
                        {(hold.status === 'pending' || hold.status === 'under_review') && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 hover:text-green-700"
                              onClick={(e) => handleRelease(hold, e)}
                            >
                              Release
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:text-destructive"
                              onClick={(e) => handleReject(hold, e)}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Dialogs */}
      {showDetailDialog && selectedHold && (
        <HoldDetailDialog
          hold={selectedHold}
          open={showDetailDialog}
          onOpenChange={setShowDetailDialog}
          onRefresh={refetch}
        />
      )}

      {showResolutionDialog && selectedHold && (
        <HoldResolutionDialog
          hold={selectedHold}
          resolutionType={resolutionType}
          open={showResolutionDialog}
          onOpenChange={setShowResolutionDialog}
          onSuccess={() => {
            setShowResolutionDialog(false);
            refetch();
          }}
        />
      )}

      {showManualHoldDialog && (
        <ManualHoldDialog
          open={showManualHoldDialog}
          onOpenChange={setShowManualHoldDialog}
          onSuccess={() => {
            setShowManualHoldDialog(false);
            refetch();
          }}
        />
      )}

      {showLabelDialog && labelHold && (
        <HoldLabelPrint
          open={showLabelDialog}
          onOpenChange={setShowLabelDialog}
          materialName={labelHold.receiving_lot?.material?.name || 'Unknown Material'}
          lotNumber={labelHold.receiving_lot?.supplier_lot_number || labelHold.receiving_lot?.internal_lot_number || ''}
          internalLotNumber={labelHold.receiving_lot?.internal_lot_number}
          holdReason={labelHold.reason?.name || labelHold.hold_reason_description || undefined}
        />
      )}
    </div>
  );
};

export default HoldLog;
