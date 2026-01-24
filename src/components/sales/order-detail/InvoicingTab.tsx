import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';

export function InvoicingTab({ order }: { order: any }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <CardTitle>Invoicing</CardTitle>
          </div>
          <CardDescription>
            Generate invoices and track payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Invoice & Payment Management</h3>
            <p className="text-muted-foreground mb-4">
              Create invoices, process payments with AI remittance reading, and sync to Xero
            </p>
            <Badge variant="secondary">Coming in Phases 6-7</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
