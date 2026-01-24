import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TruckIcon } from 'lucide-react';

export function ShippingTab({ order }: { order: any }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TruckIcon className="h-5 w-5" />
            <CardTitle>Shipping</CardTitle>
          </div>
          <CardDescription>
            Track shipments and generate BOLs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <TruckIcon className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Shipment Management</h3>
            <p className="text-muted-foreground mb-4">
              Create bills of lading and track deliveries with partial shipment support
            </p>
            <Badge variant="secondary">Coming in Phase 5</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
