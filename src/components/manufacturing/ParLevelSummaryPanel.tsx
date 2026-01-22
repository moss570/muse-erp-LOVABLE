import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Package, Boxes, AlertTriangle, CheckCircle } from "lucide-react";

interface ParLevelSummaryPanelProps {
  productId: string;
}

interface ProductSize {
  id: string;
  sku: string;
  size_name: string;
  size_type: string | null;
  target_weight_kg: number | null;
  units_per_case: number | null;
}

export function ParLevelSummaryPanel({ productId }: ParLevelSummaryPanelProps) {
  // Fetch all sizes (tubs and cases) for this product
  const { data: sizes = [], isLoading: loadingSizes } = useQuery({
    queryKey: ["all-sizes-for-par", productId],
    queryFn: async (): Promise<ProductSize[]> => {
      const { data, error } = await supabase
        .from("product_sizes")
        .select("id, sku, size_name, size_type, target_weight_kg, units_per_case")
        .eq("product_id", productId)
        .eq("is_active", true)
        .order("size_type")
        .order("size_value");

      if (error) throw error;
      return (data || []) as ProductSize[];
    },
    enabled: !!productId,
  });

  // Fetch par levels
  const { data: parLevels = [] } = useQuery({
    queryKey: ["par-levels-for-summary", productId],
    queryFn: async () => {
      const sizeIds = sizes.map(s => s.id);
      if (sizeIds.length === 0) return [];

      const { data, error } = await supabase
        .from("product_size_par_levels")
        .select("product_size_id, par_level")
        .in("product_size_id", sizeIds);

      if (error) throw error;

      // Aggregate
      const parBySize: Record<string, number> = {};
      (data || []).forEach((p: { product_size_id: string; par_level: number }) => {
        parBySize[p.product_size_id] = (parBySize[p.product_size_id] || 0) + p.par_level;
      });
      return parBySize;
    },
    enabled: sizes.length > 0,
  });

  // Fetch current stock
  const { data: currentStock = {} } = useQuery({
    queryKey: ["current-stock-for-summary", productId],
    queryFn: async () => {
      const sizeIds = sizes.map(s => s.id);
      if (sizeIds.length === 0) return {};

      const { data, error } = await supabase
        .from("production_lots")
        .select("product_size_id, quantity_available")
        .in("product_size_id", sizeIds)
        .eq("approval_status", "Approved")
        .gt("quantity_available", 0);

      if (error) throw error;

      const stockBySize: Record<string, number> = {};
      (data || []).forEach((lot: { product_size_id: string | null; quantity_available: number | null }) => {
        if (lot.product_size_id) {
          stockBySize[lot.product_size_id] = (stockBySize[lot.product_size_id] || 0) + (lot.quantity_available || 0);
        }
      });
      return stockBySize;
    },
    enabled: sizes.length > 0,
  });

  if (loadingSizes || !productId) {
    return null;
  }

  if (sizes.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">
            No sizes configured for this product.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Separate tubs and cases
  const tubs = sizes.filter(s => s.size_type === "unit");
  const cases = sizes.filter(s => s.size_type === "case");

  const renderSizeRow = (size: ProductSize) => {
    const par = (parLevels as Record<string, number>)[size.id] || 0;
    const stock = (currentStock as Record<string, number>)[size.id] || 0;
    const gap = Math.max(0, par - stock);
    const stockPct = par > 0 ? Math.round((stock / par) * 100) : (stock > 0 ? 100 : 0);
    const isLow = gap > 0;

    return (
      <TableRow key={size.id}>
        <TableCell className="text-xs font-mono">
          {size.sku}
          <span className="text-muted-foreground ml-1">
            ({size.size_name})
          </span>
        </TableCell>
        <TableCell className="text-xs text-right">
          {stock}
        </TableCell>
        <TableCell className="text-xs text-right">
          {par}
        </TableCell>
        <TableCell className="text-xs text-right">
          {isLow ? (
            <Badge variant="destructive" className="text-xs">
              -{gap}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-green-600 border-green-300">
              <CheckCircle className="h-3 w-3 mr-1" />
              OK
            </Badge>
          )}
        </TableCell>
        <TableCell className="text-xs text-right">
          <span className={stockPct < 50 ? "text-red-600" : stockPct < 80 ? "text-amber-600" : "text-green-600"}>
            {stockPct}%
          </span>
        </TableCell>
      </TableRow>
    );
  };

  const tubsWithGaps = tubs.filter(t => {
    const par = (parLevels as Record<string, number>)[t.id] || 0;
    const stock = (currentStock as Record<string, number>)[t.id] || 0;
    return par > stock;
  });

  const casesWithGaps = cases.filter(c => {
    const par = (parLevels as Record<string, number>)[c.id] || 0;
    const stock = (currentStock as Record<string, number>)[c.id] || 0;
    return par > stock;
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Boxes className="h-4 w-4" />
          Inventory vs Par Levels
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tubs Section */}
        {tubs.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-3 w-3" />
              <span className="text-xs font-medium">Individual Tubs</span>
              {tubsWithGaps.length > 0 && (
                <Badge variant="outline" className="text-xs text-amber-600">
                  {tubsWithGaps.length} below par
                </Badge>
              )}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">SKU</TableHead>
                  <TableHead className="text-xs text-right">Stock</TableHead>
                  <TableHead className="text-xs text-right">Par</TableHead>
                  <TableHead className="text-xs text-right">Gap</TableHead>
                  <TableHead className="text-xs text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tubs.map(renderSizeRow)}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Cases Section */}
        {cases.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Boxes className="h-3 w-3" />
              <span className="text-xs font-medium">Case Packs</span>
              {casesWithGaps.length > 0 && (
                <Badge variant="outline" className="text-xs text-amber-600">
                  {casesWithGaps.length} below par
                </Badge>
              )}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">SKU</TableHead>
                  <TableHead className="text-xs text-right">Stock</TableHead>
                  <TableHead className="text-xs text-right">Par</TableHead>
                  <TableHead className="text-xs text-right">Gap</TableHead>
                  <TableHead className="text-xs text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cases.map(renderSizeRow)}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Summary Warning */}
        {(tubsWithGaps.length > 0 || casesWithGaps.length > 0) && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md p-2 text-xs">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-3 w-3" />
              <span className="font-medium">
                {tubsWithGaps.length + casesWithGaps.length} SKU(s) below par level
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
