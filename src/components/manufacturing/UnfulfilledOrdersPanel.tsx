import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, Loader2 } from "lucide-react";
import { useUnfulfilledSalesOrders } from "@/hooks/useUnfulfilledSalesOrders";
import { UnfulfilledItemsTable } from "./UnfulfilledItemsTable";

interface UnfulfilledOrdersPanelProps {
  productId: string;
}

export function UnfulfilledOrdersPanel({ productId }: UnfulfilledOrdersPanelProps) {
  const { data, isLoading, refetch } = useUnfulfilledSalesOrders();
  
  // Filter items to only show those related to the selected product family
  const items = data?.items.filter(item => item.product_id === productId) || [];
  
  if (isLoading) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Unfulfilled Sales Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="border-dashed border-green-200 dark:border-green-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Unfulfilled Sales Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
            <span>✅</span>
            <p>
              No unfulfilled orders for this product family. All sales orders can be fulfilled with current stock.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 dark:border-amber-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <ShoppingCart className="h-4 w-4" />
          Unfulfilled Sales Orders ({items.length} items)
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <UnfulfilledItemsTable 
          items={items} 
          compact 
          onRefresh={() => refetch()}
        />
      </CardContent>
    </Card>
  );
}
