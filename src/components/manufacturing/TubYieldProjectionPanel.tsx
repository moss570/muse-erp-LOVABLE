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
import { Package, TrendingUp, AlertTriangle } from "lucide-react";

interface TubYieldProjectionPanelProps {
  productId: string;
  targetQuantityKg: number;
}

interface TubSize {
  id: string;
  sku: string;
  size_name: string;
  target_weight_kg: number;
  container_size?: {
    name: string;
    volume_gallons: number;
  } | null;
}

interface ParLevel {
  location_id: string;
  par_level: number;
  location?: {
    name: string;
  };
}

export function TubYieldProjectionPanel({
  productId,
  targetQuantityKg,
}: TubYieldProjectionPanelProps) {
  // Fetch tub sizes (unit type) for this product
  const { data: tubSizes = [], isLoading: loadingSizes } = useQuery({
    queryKey: ["tub-sizes-for-yield", productId],
    queryFn: async (): Promise<TubSize[]> => {
      const { data, error } = await supabase
        .from("product_sizes")
        .select(`
          id, sku, size_name, target_weight_kg,
          container_size:container_sizes(name, volume_gallons)
        `)
        .eq("product_id", productId)
        .eq("size_type", "unit")
        .eq("is_active", true)
        .order("size_value");

      if (error) throw error;
      return (data || []) as unknown as TubSize[];
    },
    enabled: !!productId,
  });

  // Fetch par levels for all sizes
  const { data: parLevels = [], isLoading: loadingPar } = useQuery({
    queryKey: ["par-levels-for-yield", productId],
    queryFn: async (): Promise<Array<{ product_size_id: string; total_par: number }>> => {
      const sizeIds = tubSizes.map(s => s.id);
      if (sizeIds.length === 0) return [];

      const { data, error } = await supabase
        .from("product_size_par_levels")
        .select("product_size_id, par_level")
        .in("product_size_id", sizeIds);

      if (error) throw error;

      // Aggregate par levels by size
      const parBySize: Record<string, number> = {};
      (data || []).forEach((p: { product_size_id: string; par_level: number }) => {
        parBySize[p.product_size_id] = (parBySize[p.product_size_id] || 0) + p.par_level;
      });

      return Object.entries(parBySize).map(([product_size_id, total_par]) => ({
        product_size_id,
        total_par,
      }));
    },
    enabled: tubSizes.length > 0,
  });

  // Fetch current inventory for each size
  const { data: currentStock = [], isLoading: loadingStock } = useQuery({
    queryKey: ["current-stock-for-yield", productId],
    queryFn: async (): Promise<Array<{ product_size_id: string; quantity: number }>> => {
      const sizeIds = tubSizes.map(s => s.id);
      if (sizeIds.length === 0) return [];

      // Get approved production lots that have these sizes
      const { data, error } = await supabase
        .from("production_lots")
        .select("product_size_id, quantity_available")
        .in("product_size_id", sizeIds)
        .eq("approval_status", "Approved")
        .gt("quantity_available", 0);

      if (error) throw error;

      // Aggregate by size
      const stockBySize: Record<string, number> = {};
      (data || []).forEach((lot: { product_size_id: string | null; quantity_available: number | null }) => {
        if (lot.product_size_id) {
          stockBySize[lot.product_size_id] = (stockBySize[lot.product_size_id] || 0) + (lot.quantity_available || 0);
        }
      });

      return Object.entries(stockBySize).map(([product_size_id, quantity]) => ({
        product_size_id,
        quantity,
      }));
    },
    enabled: tubSizes.length > 0,
  });

  if (loadingSizes || !productId) {
    return null;
  }

  if (tubSizes.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">
            No tub sizes configured for this product. Add sizes in Product Settings.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate projections
  const projections = tubSizes.map(size => {
    const targetWeight = size.target_weight_kg || 2; // Default 2kg if not set
    const projectedYield = targetQuantityKg > 0 
      ? Math.floor(targetQuantityKg / targetWeight)
      : 0;
    
    const parData = parLevels.find(p => p.product_size_id === size.id);
    const totalPar = parData?.total_par || 0;
    
    const stockData = currentStock.find(s => s.product_size_id === size.id);
    const currentQty = stockData?.quantity || 0;
    
    const gap = Math.max(0, totalPar - currentQty);
    const suggestedQty = Math.max(0, gap);
    const wouldMeetPar = projectedYield >= gap;

    return {
      ...size,
      projectedYield,
      totalPar,
      currentQty,
      gap,
      suggestedQty,
      wouldMeetPar,
    };
  });

  // Find recommended size based on par level gaps
  const maxGapSize = projections.reduce((max, p) => 
    p.gap > max.gap ? p : max
  , projections[0]);

  const totalProjectedTubs = projections.reduce((sum, p) => sum + p.projectedYield, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Tub Yield Projection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {targetQuantityKg > 0 && (
          <p className="text-xs text-muted-foreground">
            Based on {targetQuantityKg} KG of flavored mix:
          </p>
        )}
        
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Tub Size</TableHead>
              <TableHead className="text-xs text-right">Weight</TableHead>
              <TableHead className="text-xs text-right">Yield</TableHead>
              <TableHead className="text-xs text-right">Stock</TableHead>
              <TableHead className="text-xs text-right">Par</TableHead>
              <TableHead className="text-xs text-right">Gap</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projections.map(size => (
              <TableRow key={size.id}>
                <TableCell className="text-xs font-mono">
                  {size.sku}
                  {size.container_size && (
                    <span className="text-muted-foreground ml-1">
                      ({size.container_size.name})
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-right">
                  {size.target_weight_kg?.toFixed(2) || "2.00"} kg
                </TableCell>
                <TableCell className="text-xs text-right font-medium">
                  {size.projectedYield}
                </TableCell>
                <TableCell className="text-xs text-right">
                  {size.currentQty}
                </TableCell>
                <TableCell className="text-xs text-right">
                  {size.totalPar}
                </TableCell>
                <TableCell className="text-xs text-right">
                  {size.gap > 0 ? (
                    <Badge variant={size.wouldMeetPar ? "default" : "destructive"} className="text-xs">
                      {size.gap}
                    </Badge>
                  ) : (
                    <span className="text-green-600">0</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {maxGapSize && maxGapSize.gap > 0 && (
          <div className="bg-muted/50 rounded-md p-2 text-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              <span className="font-medium">Recommendation:</span>
            </div>
            <p className="mt-1 text-muted-foreground">
              {maxGapSize.sku} has the largest par level gap ({maxGapSize.gap} units). 
              Consider producing {Math.ceil(maxGapSize.gap * (maxGapSize.target_weight_kg || 2))} KG 
              to meet par levels.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
