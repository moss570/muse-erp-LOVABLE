import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package } from 'lucide-react';

export function PickingTab({ order }: { order: any }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            <CardTitle>Picking Status</CardTitle>
          </div>
          <CardDescription>
            Track picking progress and lot traceability
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Picking Functionality</h3>
            <p className="text-muted-foreground mb-4">
              Warehouse picking integration with lot traceability
            </p>
            <Badge variant="secondary">Coming in Phase 3</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
