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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { DataTablePagination } from '@/components/ui/data-table/DataTablePagination';
import { LabelPrintDialog } from '@/components/labels/LabelPrintDialog';
import { useLabelTemplates } from '@/hooks/useLabelTemplates';
import { 
  Search, 
  Printer, 
  ChevronDown, 
  ChevronRight,
  RefreshCw, 
  Package,
  ExternalLink,
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

interface MaterialGroup {
  materialId: string;
  materialCode: string;
  materialName: string;
  category: string | null;
  minStockLevel: number | null;
  usageUnit: { id: string; code: string; name: string } | null;
  usageUnitConversion: number | null;
  baseUnit: { id: string; code: string; name: string } | null;
  totalOnHand: number;
  lotCount: number;
  lots: InventoryLot[];
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
  const [expandedMaterials, setExpandedMaterials] = useState<Set<string>>(new Set());
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

  // Group lots by material
  const materialGroups = useMemo(() => {
    const groups = new Map<string, MaterialGroup>();
    
    filteredLots.forEach((lot) => {
      if (!lot.material?.id) return;
      
      const materialId = lot.material.id;
      const existing = groups.get(materialId);
      
      if (existing) {
        existing.totalOnHand += lot.quantity_in_base_unit;
        existing.lotCount += 1;
        existing.lots.push(lot);
      } else {
        groups.set(materialId, {
          materialId,
          materialCode: lot.material.code,
          materialName: lot.material.name,
          category: lot.material.category,
          minStockLevel: lot.material.min_stock_level,
          usageUnit: lot.material.usage_unit,
          usageUnitConversion: lot.material.usage_unit_conversion,
          baseUnit: lot.unit,
          totalOnHand: lot.quantity_in_base_unit,
          lotCount: 1,
          lots: [lot],
        });
      }
    });
    
    // Sort groups by material name
    return Array.from(groups.values()).sort((a, b) => 
      a.materialName.localeCompare(b.materialName)
    );
  }, [filteredLots]);

  // Pagination on material groups
  const totalItems = materialGroups.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedGroups = materialGroups.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Toggle material expansion
  const toggleMaterialExpansion = (materialId: string) => {
    const newExpanded = new Set(expandedMaterials);
    if (newExpanded.has(materialId)) {
      newExpanded.delete(materialId);
    } else {
      newExpanded.add(materialId);
    }
    setExpandedMaterials(newExpanded);
  };

  // Expand/Collapse all
  const expandAll = () => {
    setExpandedMaterials(new Set(paginatedGroups.map(g => g.materialId)));
  };

  const collapseAll = () => {
    setExpandedMaterials(new Set());
  };

  // Selection handlers
  const handleSelectLot = (lotId: string, checked: boolean) => {
    const newSelected = new Set(selectedLots);
    if (checked) {
      newSelected.add(lotId);
    } else {
      newSelected.delete(lotId);
    }
    setSelectedLots(newSelected);
  };

  const handleSelectMaterialLots = (lots: InventoryLot[], checked: boolean) => {
    const newSelected = new Set(selectedLots);
    lots.forEach((lot) => {
      if (checked) {
        newSelected.add(lot.id);
      } else {
        newSelected.delete(lot.id);
      }
    });
    setSelectedLots(newSelected);
  };

  const isMaterialFullySelected = (lots: InventoryLot[]) => {
    return lots.length > 0 && lots.every((lot) => selectedLots.has(lot.id));
  };

  const isMaterialPartiallySelected = (lots: InventoryLot[]) => {
    return lots.some((lot) => selectedLots.has(lot.id)) && !isMaterialFullySelected(lots);
  };

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
              View on-hand inventory grouped by material
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Expand/Collapse buttons */}
            <Button variant="outline" size="sm" onClick={expandAll}>
              Expand All
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>
              Collapse All
            </Button>

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
            <span>{selectedLots.size} lot(s) selected</span>
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
          Showing {paginatedGroups.length} of {materialGroups.length} materials ({filteredLots.length} lots total)
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
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead className="text-center">Lots</TableHead>
                  <TableHead className="text-right">Total On Hand</TableHead>
                  <TableHead className="text-right">Par Level</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedGroups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      <Package className="mx-auto h-10 w-10 mb-3 opacity-30" />
                      <p className="font-medium">No inventory found</p>
                      <p className="text-sm">Try adjusting your search or filters</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedGroups.map((group) => {
                    const isExpanded = expandedMaterials.has(group.materialId);
                    const isLowStock = group.minStockLevel && group.totalOnHand < group.minStockLevel;
                    const isFullySelected = isMaterialFullySelected(group.lots);
                    const isPartiallySelected = isMaterialPartiallySelected(group.lots);
                    
                    return (
                      <Collapsible key={group.materialId} open={isExpanded} asChild>
                        <>
                          {/* Material Summary Row */}
                          <TableRow className="bg-muted/30 hover:bg-muted/50 cursor-pointer">
                            <TableCell>
                              <CollapsibleTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => toggleMaterialExpansion(group.materialId)}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                            </TableCell>
                            <TableCell>
                              <Checkbox
                                checked={isFullySelected}
                                ref={(el) => {
                                  if (el) {
                                    (el as HTMLButtonElement).dataset.state = isPartiallySelected ? 'indeterminate' : (isFullySelected ? 'checked' : 'unchecked');
                                  }
                                }}
                                onCheckedChange={(checked) => handleSelectMaterialLots(group.lots, !!checked)}
                              />
                            </TableCell>
                            <TableCell>
                              {group.category ? (
                                <Badge variant="outline" className="font-normal">
                                  {group.category}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-mono text-xs text-muted-foreground">
                                  {group.materialCode}
                                </span>
                                <span className="font-medium">
                                  {group.materialName}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary">{group.lotCount}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {group.usageUnit && group.usageUnitConversion ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className={`cursor-help font-semibold ${isLowStock ? 'text-destructive' : ''}`}>
                                        {Number(group.totalOnHand).toLocaleString()}
                                        <span className="text-muted-foreground ml-1 text-xs font-normal">
                                          {group.baseUnit?.code}
                                        </span>
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>
                                        {(group.totalOnHand * group.usageUnitConversion).toLocaleString(undefined, { maximumFractionDigits: 2 })} {group.usageUnit.code}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                <span className={`font-semibold ${isLowStock ? 'text-destructive' : ''}`}>
                                  {Number(group.totalOnHand).toLocaleString()}
                                  <span className="text-muted-foreground ml-1 text-xs font-normal">
                                    {group.baseUnit?.code}
                                  </span>
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {group.minStockLevel ? (
                                <span className="text-muted-foreground">
                                  {Number(group.minStockLevel).toLocaleString()}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {isLowStock && (
                                <Badge variant="destructive">Low Stock</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                          
                          {/* Lot Detail Rows */}
                          <CollapsibleContent asChild>
                            <>
                              {group.lots.map((lot) => (
                                <TableRow 
                                  key={lot.id}
                                  className={`bg-background ${selectedLots.has(lot.id) ? 'bg-primary/5' : ''}`}
                                >
                                  <TableCell></TableCell>
                                  <TableCell>
                                    <Checkbox
                                      checked={selectedLots.has(lot.id)}
                                      onCheckedChange={(checked) => handleSelectLot(lot.id, !!checked)}
                                    />
                                  </TableCell>
                                  <TableCell className="pl-8 text-muted-foreground text-sm">
                                    {lot.location?.name || '-'}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-4 text-sm">
                                      <div>
                                        <span className="text-muted-foreground">Internal: </span>
                                        <button
                                          className="font-mono text-primary hover:underline cursor-pointer"
                                          onClick={() => handleViewReceiving(lot.id)}
                                        >
                                          {lot.internal_lot_number}
                                        </button>
                                      </div>
                                      {lot.supplier_lot_number && (
                                        <div>
                                          <span className="text-muted-foreground">Supplier: </span>
                                          <span className="font-mono">{lot.supplier_lot_number}</span>
                                        </div>
                                      )}
                                      {lot.expiry_date && (
                                        <div>
                                          <span className="text-muted-foreground">Exp: </span>
                                          <span className={
                                            new Date(lot.expiry_date) < new Date() 
                                              ? 'text-destructive font-medium' 
                                              : ''
                                          }>
                                            {format(new Date(lot.expiry_date), 'MM/dd/yyyy')}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell></TableCell>
                                  <TableCell className="text-right text-sm">
                                    {Number(lot.quantity_in_base_unit).toLocaleString()}
                                    <span className="text-muted-foreground ml-1 text-xs">
                                      {lot.unit?.code}
                                    </span>
                                  </TableCell>
                                  <TableCell></TableCell>
                                  <TableCell className="text-center">
                                    <Badge 
                                      variant={
                                        lot.status === 'available' ? 'default' :
                                        lot.status === 'on_hold' ? 'secondary' :
                                        lot.status === 'quarantine' ? 'destructive' :
                                        'outline'
                                      }
                                      className="capitalize text-xs"
                                    >
                                      {lot.status?.replace('_', ' ') || 'Available'}
                                    </Badge>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 ml-2"
                                      onClick={() => handleViewReceiving(lot.id)}
                                      title="View receiving record"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </>
                          </CollapsibleContent>
                        </>
                      </Collapsible>
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
