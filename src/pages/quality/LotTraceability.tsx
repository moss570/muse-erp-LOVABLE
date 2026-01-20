import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  ArrowRight, 
  ArrowLeft, 
  Package, 
  Factory
} from "lucide-react";
import { format } from "date-fns";

interface SelectedLot {
  id: string;
  type: 'material' | 'production';
  internal_lot_number?: string;
  lot_number?: string;
  [key: string]: any;
}

const LotTraceability = () => {
  const [searchLot, setSearchLot] = useState("");
  const [selectedLot, setSelectedLot] = useState<SelectedLot | null>(null);
  const [traceDirection, setTraceDirection] = useState<'forward' | 'backward'>('forward');

  // Search for lot
  const { data: lotResults, refetch: searchLots } = useQuery({
    queryKey: ['lot-search', searchLot],
    queryFn: async () => {
      if (!searchLot || searchLot.length < 3) return null;

      // Search receiving lots
      const { data: receivingLots } = await supabase
        .from('receiving_lots')
        .select(`
          id, internal_lot_number, supplier_lot_number,
          quantity_received, received_date, expiry_date,
          material:materials(id, name, code),
          supplier:suppliers(name),
          unit:units_of_measure(id, code)
        `)
        .or(`internal_lot_number.ilike.%${searchLot}%,supplier_lot_number.ilike.%${searchLot}%`)
        .limit(20);

      // Search production lots
      const { data: productionLots } = await supabase
        .from('production_lots')
        .select(`
          id, lot_number, production_date, quantity_produced,
          product:products(id, name, sku),
          unit:units_of_measure(id, code)
        `)
        .ilike('lot_number', `%${searchLot}%`)
        .limit(20);

      return {
        receivingLots: receivingLots || [],
        productionLots: productionLots || []
      };
    },
    enabled: false
  });

  // Forward trace (material lot -> production lots)
  const { data: forwardTrace } = useQuery({
    queryKey: ['forward-trace', selectedLot?.id],
    queryFn: async () => {
      if (!selectedLot || selectedLot.type !== 'material') return null;

      // Find production lots that used this material
      const { data: productionUsage } = await supabase
        .from('production_lot_materials')
        .select(`
          quantity_used,
          production_lot:production_lots(
            id, lot_number, production_date, quantity_produced,
            product:products(name, sku)
          )
        `)
        .eq('receiving_lot_id', selectedLot.id);

      return {
        productionLots: productionUsage?.map(p => p.production_lot) || [],
        shipments: []
      };
    },
    enabled: !!selectedLot && selectedLot.type === 'material'
  });

  // Backward trace (production lot -> materials used)
  const { data: backwardTrace } = useQuery({
    queryKey: ['backward-trace', selectedLot?.id],
    queryFn: async () => {
      if (!selectedLot || selectedLot.type !== 'production') return null;

      // Find materials used in this production
      const { data: materialsUsed } = await supabase
        .from('production_lot_materials')
        .select(`
          quantity_used,
          receiving_lot:receiving_lots(
            id, internal_lot_number, supplier_lot_number,
            material:materials(name, code),
            supplier:suppliers(name),
            unit:units_of_measure(code)
          )
        `)
        .eq('production_lot_id', selectedLot.id);

      return {
        materials: materialsUsed?.map(m => ({
          ...m.receiving_lot,
          quantity_used: m.quantity_used
        })) || []
      };
    },
    enabled: !!selectedLot && selectedLot.type === 'production'
  });

  const handleSearch = () => {
    searchLots();
  };

  const selectLot = (lot: any, type: 'material' | 'production') => {
    setSelectedLot({ ...lot, type });
    setTraceDirection(type === 'material' ? 'forward' : 'backward');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Search className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Lot Traceability</h1>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>Search Lot Number</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={searchLot}
                  onChange={(e) => setSearchLot(e.target.value)}
                  placeholder="Enter lot number (internal or supplier)..."
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch}>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {lotResults && (
        <Card>
          <CardHeader>
            <CardTitle>Search Results</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="materials">
              <TabsList>
                <TabsTrigger value="materials">
                  Material Lots ({lotResults.receivingLots.length})
                </TabsTrigger>
                <TabsTrigger value="production">
                  Production Lots ({lotResults.productionLots.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="materials">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lot #</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Received</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lotResults.receivingLots.map((lot: any) => (
                      <TableRow key={lot.id}>
                        <TableCell className="font-mono">{lot.internal_lot_number}</TableCell>
                        <TableCell>{lot.material?.name}</TableCell>
                        <TableCell>{lot.supplier?.name}</TableCell>
                        <TableCell>
                          {lot.received_date && format(new Date(lot.received_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => selectLot(lot, 'material')}
                          >
                            <ArrowRight className="h-3 w-3 mr-1" />
                            Trace Forward
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="production">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lot #</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Produced</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lotResults.productionLots.map((lot: any) => (
                      <TableRow key={lot.id}>
                        <TableCell className="font-mono">{lot.lot_number}</TableCell>
                        <TableCell>{lot.product?.name}</TableCell>
                        <TableCell>
                          {lot.production_date && format(new Date(lot.production_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>{lot.quantity_produced} {lot.unit?.code}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => selectLot(lot, 'production')}
                          >
                            <ArrowLeft className="h-3 w-3 mr-1" />
                            Trace Backward
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Trace Results */}
      {selectedLot && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {traceDirection === 'forward' ? (
                <><ArrowRight className="h-5 w-5" /> Forward Trace</>
              ) : (
                <><ArrowLeft className="h-5 w-5" /> Backward Trace</>
              )}
              <Badge variant="outline" className="ml-2">
                {selectedLot.internal_lot_number || selectedLot.lot_number}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Forward Trace Results */}
            {traceDirection === 'forward' && forwardTrace && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Factory className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Production Lots ({forwardTrace.productionLots.length})</h3>
                </div>
                {forwardTrace.productionLots.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Lot #</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Production Date</TableHead>
                        <TableHead>Quantity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {forwardTrace.productionLots.map((lot: any) => (
                        <TableRow key={lot.id}>
                          <TableCell className="font-mono">{lot.lot_number}</TableCell>
                          <TableCell>{lot.product?.name}</TableCell>
                          <TableCell>
                            {lot.production_date && format(new Date(lot.production_date), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>{lot.quantity_produced}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground">No production lots found using this material.</p>
                )}
              </div>
            )}

            {/* Backward Trace Results */}
            {traceDirection === 'backward' && backwardTrace && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Materials Used ({backwardTrace.materials.length})</h3>
                </div>
                {backwardTrace.materials.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Lot #</TableHead>
                        <TableHead>Material</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Qty Used</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {backwardTrace.materials.map((mat: any) => (
                        <TableRow key={mat.id}>
                          <TableCell className="font-mono">{mat.internal_lot_number}</TableCell>
                          <TableCell>{mat.material?.name}</TableCell>
                          <TableCell>{mat.supplier?.name}</TableCell>
                          <TableCell>{mat.quantity_used} {mat.unit?.code}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground">No material records found.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LotTraceability;
