import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { DataTablePagination } from '@/components/ui/data-table/DataTablePagination';
import { LabelPrintDialog } from '@/components/labels/LabelPrintDialog';
import { useLabelTemplates } from '@/hooks/useLabelTemplates';
import { 
  Search, 
  Printer, 
  ChevronDown, 
  RefreshCw, 
  Package,
  ExternalLink,
  Filter,
  X,
} from 'lucide-react';
import { format } from 'date-fns';

interface InventoryLot {
  id: string;
  internal_lot_number: string;
  supplier_lot_number: string | null;
  quantity_in_base_unit: number;
  quantity_received: number;
  received_date: string;
  expiry_date: string | null;
  status: string | null;
  location_id: string | null;
  material: {
    id: string;
    code: string;
    name: string;
    category: string | null;
    min_stock_level: number | null;
    usage_unit_id: string | null;
    usage_unit_conversion: number | null;
    listed_material: { name: string } | null;
    usage_unit: { id: string; code: string; name: string } | null;
  };
  unit: {
    id: string;
    code: string;
    name: string;
  };
  location: {
    id: string;
    name: string;
    location_code: string;
  } | null;
  supplier: {
    id: string;
    name: string;
    code: string;
  } | null;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'available', label: 'Available' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'quarantine', label: 'Quarantine' },
  { value: 'consumed', label: 'Consumed' },
];

export default function MaterialInventory() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showOnlyActive, setShowOnlyActive] = useState(true);
  const [selectedLots, setSelectedLots] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  
  // Print dialog state
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [printLotId, setPrintLotId] = useState<string>('');

  // Fetch label templates
  const { data: labelTemplates } = useLabelTemplates('receiving');

  // Fetch inventory lots
  const { data: lots, isLoading, refetch } = useQuery({
    queryKey: ['material-inventory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receiving_lots')
        .select(`
          id,
          internal_lot_number,
          supplier_lot_number,
          quantity_in_base_unit,
          quantity_received,
          received_date,
          expiry_date,
          status,
          location_id,
          material:materials(
            id, 
            code, 
            name, 
            category, 
            min_stock_level,
            usage_unit_id,
            usage_unit_conversion,
            listed_material:listed_material_names(name),
            usage_unit:units_of_measure!materials_usage_unit_id_fkey(id, code, name)
          ),
          unit:units_of_measure(id, code, name),
          location:locations(id, name, location_code),
          supplier:suppliers(id, name, code)
        `)
        .order('received_date', { ascending: false });
      if (error) throw error;
      return data as unknown as InventoryLot[];
    },
  });

  // Fetch locations for filter
  const { data: locations } = useQuery({
    queryKey: ['locations-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, location_code')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch categories for filter
  const categories = useMemo(() => {
    if (!lots) return [];
    const cats = new Set<string>();
    lots.forEach((lot) => {
      if (lot.material?.category) cats.add(lot.material.category);
    });
    return Array.from(cats).sort();
  }, [lots]);

  // Filter lots
  const filteredLots = useMemo(() => {
    if (!lots) return [];
    
    return lots.filter((lot) => {
      // Status filter
      if (statusFilter !== 'all' && lot.status !== statusFilter) return false;
      
      // Location filter
      if (locationFilter !== 'all' && lot.location_id !== locationFilter) return false;
      
      // Category filter
      if (categoryFilter !== 'all' && lot.material?.category !== categoryFilter) return false;
      
      // Only show lots with quantity > 0 if showOnlyActive
      if (showOnlyActive && lot.quantity_in_base_unit <= 0) return false;
      
      // Search filter - matches multiple fields
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesItemNumber = lot.material?.code?.toLowerCase().includes(searchLower);
        const matchesMaterialName = lot.material?.name?.toLowerCase().includes(searchLower);
        const matchesCategory = lot.material?.category?.toLowerCase().includes(searchLower);
        const matchesLocation = lot.location?.name?.toLowerCase().includes(searchLower);
        const matchesInternalLot = lot.internal_lot_number?.toLowerCase().includes(searchLower);
        const matchesSupplierLot = lot.supplier_lot_number?.toLowerCase().includes(searchLower);
        const matchesListedName = lot.material?.listed_material?.name?.toLowerCase().includes(searchLower);
        
        if (!matchesItemNumber && !matchesMaterialName && !matchesCategory && 
            !matchesLocation && !matchesInternalLot && !matchesSupplierLot && !matchesListedName) {
          return false;
        }
      }
      
      return true;
    });
  }, [lots, search, statusFilter, locationFilter, categoryFilter, showOnlyActive]);

  // Pagination
  const totalItems = filteredLots.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedLots = filteredLots.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLots(new Set(paginatedLots.map((lot) => lot.id)));
    } else {
      setSelectedLots(new Set());
    }
  };

  const handleSelectLot = (lotId: string, checked: boolean) => {
    const newSelected = new Set(selectedLots);
    if (checked) {
      newSelected.add(lotId);
    } else {
      newSelected.delete(lotId);
    }
    setSelectedLots(newSelected);
  };

  const isAllSelected = paginatedLots.length > 0 && 
    paginatedLots.every((lot) => selectedLots.has(lot.id));

  // Handle print for single or first selected lot
  const handlePrintLabel = (templateId?: string) => {
    const selectedArray = Array.from(selectedLots);
    if (selectedArray.length > 0) {
      setPrintLotId(selectedArray[0]);
      setPrintDialogOpen(true);
    }
  };

  // Navigate to receiving record
  const handleViewReceiving = (lotId: string) => {
    // Find the receiving session for this lot
    navigate(`/purchasing/receiving?lot=${lotId}`);
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setLocationFilter('all');
    setCategoryFilter('all');
    setShowOnlyActive(true);
    setCurrentPage(1);
  };

  const hasActiveFilters = search || statusFilter !== 'all' || 
    locationFilter !== 'all' || categoryFilter !== 'all' || !showOnlyActive;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Material Inventory</h1>
            <p className="text-muted-foreground">
              View on-hand inventory by lot
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Print Button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  disabled={selectedLots.size === 0}
                  className="gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Print
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {labelTemplates?.map((template) => (
                  <DropdownMenuItem 
                    key={template.id}
                    onClick={() => handlePrintLabel(template.id)}
                  >
                    {template.name}
                  </DropdownMenuItem>
                ))}
                {(!labelTemplates || labelTemplates.length === 0) && (
                  <DropdownMenuItem disabled>
                    No label templates configured
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button 
              variant="outline" 
              size="icon"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Selection info */}
        {selectedLots.size > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{selectedLots.size} item(s) selected</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSelectedLots(new Set())}
            >
              Clear selection
            </Button>
          </div>
        )}

        {/* Search and Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by item #, name, category, location, lot #..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9"
            />
          </div>

          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={locationFilter} onValueChange={(v) => { setLocationFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations?.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={showOnlyActive}
              onCheckedChange={(checked) => {
                setShowOnlyActive(!!checked);
                setCurrentPage(1);
              }}
            />
            <span>Only active</span>
          </label>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
              <X className="h-4 w-4" />
              Clear filters
            </Button>
          )}
        </div>

        {/* Results count */}
        <div className="text-sm text-muted-foreground">
          Showing {paginatedLots.length} of {filteredLots.length} lots
          {lots && filteredLots.length !== lots.length && ` (${lots.length} total)`}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border bg-card">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Internal Lot #</TableHead>
                  <TableHead>Supplier Lot #</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead className="text-right">On Hand</TableHead>
                  <TableHead className="text-right">Par Level</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLots.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-12 text-muted-foreground">
                      <Package className="mx-auto h-10 w-10 mb-3 opacity-30" />
                      <p className="font-medium">No inventory found</p>
                      <p className="text-sm">Try adjusting your search or filters</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLots.map((lot) => {
                    const isLowStock = lot.material?.min_stock_level && 
                      lot.quantity_in_base_unit < lot.material.min_stock_level;
                    
                    return (
                      <TableRow 
                        key={lot.id}
                        className={selectedLots.has(lot.id) ? 'bg-primary/5' : ''}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedLots.has(lot.id)}
                            onCheckedChange={(checked) => handleSelectLot(lot.id, !!checked)}
                          />
                        </TableCell>
                        <TableCell>
                          {lot.material?.category ? (
                            <Badge variant="outline" className="font-normal">
                              {lot.material.category}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-mono text-xs text-muted-foreground">
                              {lot.material?.code}
                            </span>
                            <span className="font-medium truncate max-w-[200px]" title={lot.material?.name}>
                              {lot.material?.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {lot.location?.name || (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <button
                            className="font-mono text-primary hover:underline cursor-pointer"
                            onClick={() => handleViewReceiving(lot.id)}
                          >
                            {lot.internal_lot_number}
                          </button>
                        </TableCell>
                        <TableCell>
                          {lot.supplier_lot_number || (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {lot.expiry_date ? (
                            <span className={
                              new Date(lot.expiry_date) < new Date() 
                                ? 'text-destructive font-medium' 
                                : ''
                            }>
                              {format(new Date(lot.expiry_date), 'MM/dd/yyyy')}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {lot.material?.usage_unit && lot.material?.usage_unit_conversion ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className={`cursor-help ${isLowStock ? 'text-destructive font-medium' : ''}`}>
                                    {Number(lot.quantity_in_base_unit).toLocaleString()}
                                    <span className="text-muted-foreground ml-1 text-xs">
                                      {lot.unit?.code}
                                    </span>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>
                                    {(lot.quantity_in_base_unit * lot.material.usage_unit_conversion).toLocaleString(undefined, { maximumFractionDigits: 2 })} {lot.material.usage_unit.code}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <>
                              <span className={isLowStock ? 'text-destructive font-medium' : ''}>
                                {Number(lot.quantity_in_base_unit).toLocaleString()}
                              </span>
                              <span className="text-muted-foreground ml-1 text-xs">
                                {lot.unit?.code}
                              </span>
                            </>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {lot.material?.min_stock_level ? (
                            <span className="text-muted-foreground">
                              {Number(lot.material.min_stock_level).toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant={
                              lot.status === 'available' ? 'default' :
                              lot.status === 'on_hold' ? 'secondary' :
                              lot.status === 'quarantine' ? 'destructive' :
                              'outline'
                            }
                            className="capitalize"
                          >
                            {lot.status?.replace('_', ' ') || 'Available'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleViewReceiving(lot.id)}
                            title="View receiving record"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>

            {totalItems > 0 && (
              <DataTablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={totalItems}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
              />
            )}
          </>
        )}
      </div>

      {/* Print Dialog */}
      <LabelPrintDialog
        open={printDialogOpen}
        onOpenChange={setPrintDialogOpen}
        lotId={printLotId}
        lotType="receiving"
      />
    </div>
  );
}
