import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useReceiving } from '@/hooks/useReceiving';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { format } from 'date-fns';
import { 
  Loader2, 
  Package, 
  Plus, 
  Trash2, 
  Thermometer, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  Tag,
  Printer
} from 'lucide-react';
import { ReceivingItemDialog } from './ReceivingItemDialog';
import { LabelPrintDialog } from '@/components/labels/LabelPrintDialog';

interface Props {
  sessionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReceivingDetailDialog({ sessionId, open, onOpenChange }: Props) {
  const { useSession, useSessionItems, deleteItem, completeSession } = useReceiving();
  const { data: session, isLoading: sessionLoading } = useSession(sessionId);
  const { data: items, isLoading: itemsLoading } = useSessionItems(sessionId);
  
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [inspectionPassed, setInspectionPassed] = useState(true);
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);
  const [printLotId, setPrintLotId] = useState<string | null>(null);

  // Get PO id from session
  const poId = (session?.purchase_order as { id?: string } | undefined)?.id;

  // Fetch PO items for this session's PO
  const { data: poItems } = useQuery({
    queryKey: ['po-items-for-receiving', poId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_order_items')
        .select(`
          *,
          material:materials(id, name, code, receiving_temperature_min, receiving_temperature_max),
          unit:units_of_measure(id, code, name)
        `)
        .eq('purchase_order_id', poId!)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!poId,
  });

  const handleDeleteItem = async (itemId: string) => {
    if (confirm('Remove this received item?')) {
      await deleteItem.mutateAsync({ id: itemId, sessionId });
    }
  };

  const handleComplete = async () => {
    if (!items?.length) {
      alert('Please add at least one received item');
      return;
    }

    setIsCompleting(true);
    try {
      await completeSession.mutateAsync({
        sessionId,
        inspectionPassed,
        inspectionNotes: inspectionNotes || undefined,
      });
      onOpenChange(false);
    } finally {
      setIsCompleting(false);
    }
  };

  const isInProgress = session?.status === 'in_progress';
  const isLoading = sessionLoading || itemsLoading;

  // Calculate remaining quantities for PO items
  const getItemsWithRemaining = () => {
    if (!poItems) return [];

    return poItems
      .map((item) => {
        const receivedInSession =
          items
            ?.filter((ri) => ri.po_item_id === item.id)
            .reduce((sum, ri) => sum + Number(ri.quantity_received), 0) || 0;

        // Source of truth: quantity_received maintained in DB
        const remaining = Math.max(0, Number(item.quantity_ordered) - Number(item.quantity_received));

        return {
          ...item,
          remaining,
          receivedInSession,
        };
      })
      .filter((item) => item.remaining > 0 || item.receivedInSession > 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {session?.receiving_number || 'Loading...'}
            {session && (
              <Badge variant={session.status === 'completed' ? 'default' : 'secondary'} className="ml-2">
                {session.status === 'completed' ? (
                  <><CheckCircle className="h-3 w-3 mr-1" /> Completed</>
                ) : (
                  <><Clock className="h-3 w-3 mr-1" /> In Progress</>
                )}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {session?.purchase_order?.po_number} - {session?.purchase_order?.supplier?.name}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Session Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Date</span>
                <p className="font-medium">
                  {session && format(new Date(session.received_date), 'MMM d, yyyy')}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Location</span>
                <p className="font-medium">{session?.location?.name || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Carrier</span>
                <p className="font-medium">{session?.carrier_name || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Seal</span>
                <p className="font-medium">
                  {session?.seal_number || '-'}
                  {session?.seal_intact !== null && (
                    <span className={session.seal_intact ? 'text-green-600' : 'text-red-600'}>
                      {' '}({session.seal_intact ? 'Intact' : 'Broken'})
                    </span>
                  )}
                </p>
              </div>
            </div>

            <Separator />

            {/* Received Items */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Received Items</h3>
                {isInProgress && (
                  <Button size="sm" onClick={() => setIsAddItemOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                )}
              </div>

              {!items?.length ? (
                <div className="text-center py-8 border rounded-lg bg-muted/50">
                  <Package className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No items received yet</p>
                  {isInProgress && (
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => setIsAddItemOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Item
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead>Lot #</TableHead>
                      <TableHead>Supplier Lot</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Temp</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.po_item?.material?.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {item.po_item?.material?.code}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {item.internal_lot_number}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {item.supplier_lot_number || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.quantity_received} {item.unit?.code}
                        </TableCell>
                        <TableCell>
                          {item.temperature_reading !== null ? (
                            <div className="flex items-center gap-1">
                              <Thermometer className={`h-4 w-4 ${
                                item.temperature_in_range ? 'text-green-600' : 'text-red-600'
                              }`} />
                              <span>{item.temperature_reading}°{item.temperature_unit || 'F'}</span>
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            item.inspection_status === 'approved' ? 'default' :
                            item.inspection_status === 'rejected' ? 'destructive' :
                            'secondary'
                          }>
                            {item.inspection_status || 'pending'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {item.receiving_lot_id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setPrintLotId(item.receiving_lot_id)}
                                title="Print Label"
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                            )}
                            {isInProgress && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Completion Section */}
            {isInProgress && items && items.length > 0 && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="font-semibold">Complete Receiving</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Overall Inspection</Label>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={inspectionPassed}
                          onCheckedChange={setInspectionPassed}
                        />
                        <span className={inspectionPassed ? 'text-green-600' : 'text-red-600'}>
                          {inspectionPassed ? 'Passed' : 'Failed'}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Inspection Notes</Label>
                      <Textarea
                        value={inspectionNotes}
                        onChange={(e) => setInspectionNotes(e.target.value)}
                        placeholder="Any notes about the inspection..."
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isInProgress ? 'Close (Save as Draft)' : 'Close'}
          </Button>
          {isInProgress && items && items.length > 0 && (
            <Button onClick={handleComplete} disabled={isCompleting}>
              {isCompleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <CheckCircle className="h-4 w-4 mr-2" />
              Complete Receiving
            </Button>
          )}
        </DialogFooter>

        {/* Add Item Dialog */}
        {isAddItemOpen && poItems && (
          <ReceivingItemDialog
            open={isAddItemOpen}
            onOpenChange={setIsAddItemOpen}
            sessionId={sessionId}
            poItems={getItemsWithRemaining()}
            existingItems={items || []}
          />
        )}

        {/* Label Print Dialog */}
        {printLotId && (
          <LabelPrintDialog
            open={!!printLotId}
            onOpenChange={(open) => !open && setPrintLotId(null)}
            lotId={printLotId}
            lotType="receiving"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
