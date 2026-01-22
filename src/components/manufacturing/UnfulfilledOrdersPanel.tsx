import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, Construction } from "lucide-react";

interface UnfulfilledOrdersPanelProps {
  productId: string;
}

export function UnfulfilledOrdersPanel({ productId }: UnfulfilledOrdersPanelProps) {
  // Placeholder for future sales module integration
  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <ShoppingCart className="h-4 w-4" />
          Unfulfilled Sales Orders
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Construction className="h-4 w-4" />
          <p>
            Sales module integration pending. Once enabled, this section will display 
            orders that cannot be fulfilled due to insufficient stock of this product family.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
