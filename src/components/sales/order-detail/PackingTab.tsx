import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package2 } from 'lucide-react';

export function PackingTab({ order }: { order: any }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Package2 className="h-5 w-5" />
            <CardTitle>Packing</CardTitle>
          </div>
          <CardDescription>
            Build pallets and prepare for shipment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Package2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Pallet Building</h3>
            <p className="text-muted-foreground mb-4">
              Organize picked items onto pallets for shipment
            </p>
            <Badge variant="secondary">Coming in Phase 5</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
