import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Package, Search, AlertTriangle, Clock, Calendar } from "lucide-react";
import { format, differenceInDays, isPast, addDays } from "date-fns";
import { DisassemblyDialog } from "@/components/inventory/DisassemblyDialog";
import ReassemblyDialog from "@/components/inventory/ReassemblyDialog";

const OpenContainers = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [expiryFilter, setExpiryFilter] = useState("all");
  const [showDisassembly, setShowDisassembly] = useState(false);
  const [showReassembly, setShowReassembly] = useState(false);
  const [selectedLot, setSelectedLot] = useState<any>(null);

  // Fetch open containers
  const { data: openContainers, isLoading, refetch } = useQuery({
    queryKey: ['open-containers', locationFilter, expiryFilter, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('receiving_lots')
        .select(`
          *,
          material:materials(id, name, code, open_shelf_life_days),
          location:locations!location_id(id, name),
          unit:units_of_measure(id, code, name),
          parent_lot:receiving_lots!parent_lot_id(internal_lot_number)
        `)
        .eq('container_status', 'opened')
        .gt('quantity_received', 0)
        .order('open_expiry_date', { ascending: true, nullsFirst: false });

      if (locationFilter !== 'all') {
        query = query.eq('location_id', locationFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter by expiry
      let filtered = data || [];
      if (expiryFilter === 'expired') {
        filtered = filtered.filter(c => c.open_expiry_date && isPast(new Date(c.open_expiry_date)));
      } else if (expiryFilter === 'expiring_soon') {
        const threeDays = addDays(new Date(), 3);
        filtered = filtered.filter(c => 
          c.open_expiry_date && 
          !isPast(new Date(c.open_expiry_date)) && 
          new Date(c.open_expiry_date) <= threeDays
        );
      }

      // Filter by search
      if (searchTerm) {
        filtered = filtered.filter(c => 
          c.internal_lot_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.material?.name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      return filtered;
    }
  });

  // Fetch locations
  const { data: locations } = useQuery({
    queryKey: ['production-locations'],
    queryFn: async () => {
      const { data } = await supabase
        .from('locations')
        .select('*')
        .eq('location_type', 'production')
        .eq('is_active', true);
      return data;
    }
  });

  // Summary stats
  const expired = openContainers?.filter(c => c.open_expiry_date && isPast(new Date(c.open_expiry_date))) || [];
  const expiringSoon = openContainers?.filter(c => {
    if (!c.open_expiry_date || isPast(new Date(c.open_expiry_date))) return false;
    return differenceInDays(new Date(c.open_expiry_date), new Date()) <= 3;
  }) || [];

  const getExpiryBadge = (lot: any) => {
    if (!lot.open_expiry_date) return null;
    const daysLeft = differenceInDays(new Date(lot.open_expiry_date), new Date());
    
    if (daysLeft < 0) {
      return <Badge variant="destructive">EXPIRED</Badge>;
    }
    if (daysLeft === 0) {
      return <Badge variant="destructive">Expires TODAY</Badge>;
    }
    if (daysLeft <= 3) {
      return <Badge variant="secondary" className="bg-orange-100 text-orange-700">{daysLeft}d left</Badge>;
    }
    return <Badge variant="outline">{daysLeft}d</Badge>;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Open Containers</h1>
        </div>
        <Button onClick={() => setShowDisassembly(true)}>
          Open New Container
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">{openContainers?.length || 0}</p>
            <p className="text-sm text-muted-foreground">Total Open Containers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <div>
                <p className="text-2xl font-bold text-destructive">{expired.length}</p>
                <p className="text-sm text-muted-foreground">Expired</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold text-orange-600">{expiringSoon.length}</p>
                <p className="text-sm text-muted-foreground">Expiring in 3 days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by lot or material..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations?.map(loc => (
                  <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={expiryFilter} onValueChange={setExpiryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="expired">Expired Only</SelectItem>
                <SelectItem value="expiring_soon">Expiring Soon (3d)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Open Containers Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lot #</TableHead>
              <TableHead>Material</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Opened</TableHead>
              <TableHead>Open Expiry</TableHead>
              <TableHead>Original Expiry</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {openContainers?.map((lot) => (
              <TableRow key={lot.id}>
                <TableCell>
                  <p className="font-medium">{lot.internal_lot_number}</p>
                  {lot.parent_lot && (
                    <p className="text-xs text-muted-foreground">
                      From: {lot.parent_lot.internal_lot_number}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <p className="font-medium">{lot.material?.name}</p>
                  <p className="text-xs text-muted-foreground">{lot.material?.code}</p>
                </TableCell>
                <TableCell>
                  {lot.location?.name}
                </TableCell>
                <TableCell>
                  <span className="font-medium">{lot.quantity_received}</span>
                  <span className="text-muted-foreground ml-1">{lot.unit?.code}</span>
                </TableCell>
                <TableCell>
                  {lot.opened_date && format(new Date(lot.opened_date), 'MMM d')}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {lot.open_expiry_date && format(new Date(lot.open_expiry_date), 'MMM d')}
                    {getExpiryBadge(lot)}
                  </div>
                </TableCell>
                <TableCell>
                  {lot.expiry_date && format(new Date(lot.expiry_date), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedLot(lot);
                        setShowReassembly(true);
                      }}
                    >
                      Close/Return
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {(!openContainers || openContainers.length === 0) && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No open containers found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Dialogs */}
      {showDisassembly && (
        <DisassemblyDialog
          open={showDisassembly}
          onOpenChange={(open) => {
            setShowDisassembly(open);
            if (!open) refetch();
          }}
          lotId=""
        />
      )}

      {showReassembly && selectedLot && (
        <ReassemblyDialog
          lot={selectedLot}
          open={showReassembly}
          onClose={() => setShowReassembly(false)}
          onSuccess={() => {
            setShowReassembly(false);
            refetch();
          }}
        />
      )}
    </div>
  );
};

export default OpenContainers;
