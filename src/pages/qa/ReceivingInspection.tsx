import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { 
  ClipboardCheck, 
  Thermometer, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  FileText
} from "lucide-react";
import { format } from "date-fns";

const ReceivingInspection = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Checklist state
  const [lotCodesVerified, setLotCodesVerified] = useState(false);
  const [quantitiesVerified, setQuantitiesVerified] = useState(false);
  const [packagingVerified, setPackagingVerified] = useState(false);
  const [temperaturesVerified, setTemperaturesVerified] = useState(false);
  
  // Signature
  const [inspectorInitials, setInspectorInitials] = useState("");
  
  // Notes
  const [notes, setNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  // Fetch session data
  const { data: session, isLoading } = useQuery({
    queryKey: ['receiving-session-inspection', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('po_receiving_sessions')
        .select(`
          *,
          lots:receiving_lots(
            id,
            internal_lot_number,
            supplier_lot_number,
            quantity_received,
            expiry_date,
            hold_status,
            material:materials(id, name, code, requires_coa),
            unit:units_of_measure(id, code),
            coa:receiving_coa_documents(id, validation_status)
          )
        `)
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      
      // Fetch related data
      let supplierName = null;
      let receiverName = null;
      let submittedByName = null;
      
      if (data.purchase_order_id) {
        const { data: po } = await supabase
          .from('purchase_orders')
          .select('supplier:suppliers(name)')
          .eq('id', data.purchase_order_id)
          .single();
        supplierName = (po?.supplier as any)?.name;
      }
      
      if (data.received_by) {
        const { data: receiver } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', data.received_by)
          .single();
        receiverName = receiver ? `${receiver.first_name || ''} ${receiver.last_name || ''}`.trim() : null;
      }
      
      if (data.submitted_to_qa_by) {
        const { data: submitter } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', data.submitted_to_qa_by)
          .single();
        submittedByName = submitter ? `${submitter.first_name || ''} ${submitter.last_name || ''}`.trim() : null;
      }
      
      return {
        ...data,
        supplierName,
        receiverName,
        submittedByName
      };
    }
  });

  // Check for issues
  const lotsOnHold = session?.lots?.filter((lot: any) => lot.hold_status === 'on_hold') || [];
  const lotsMissingCOA = session?.lots?.filter((lot: any) => 
    lot.material?.requires_coa && (!lot.coa || lot.coa.length === 0)
  ) || [];

  // All checklist items must be checked
  const checklistComplete = lotCodesVerified && quantitiesVerified && packagingVerified && temperaturesVerified;
  
  // Initials required
  const canApprove = checklistComplete && inspectorInitials.length >= 2;
  const canReject = inspectorInitials.length >= 2 && rejectionReason.length > 0;

  // Submit inspection
  const submitMutation = useMutation({
    mutationFn: async (result: 'approved' | 'rejected') => {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      // Create inspection record
      const { data: inspection, error: inspError } = await supabase
        .from('qa_receiving_inspections')
        .insert({
          receiving_session_id: sessionId,
          lot_codes_verified: lotCodesVerified,
          quantities_verified: quantitiesVerified,
          packaging_intact_verified: packagingVerified,
          temperatures_verified: temperaturesVerified,
          result,
          inspector_id: userId,
          inspector_initials: inspectorInitials,
          inspection_notes: notes,
          rejection_reason: result === 'rejected' ? rejectionReason : null
        })
        .select()
        .single();

      if (inspError) throw inspError;

      // Update session
      const { error: sessionError } = await supabase
        .from('po_receiving_sessions')
        .update({
          qa_inspection_status: result,
          qa_inspection_id: inspection.id,
          putaway_status: result === 'approved' ? 'pending' : null
        })
        .eq('id', sessionId);

      if (sessionError) throw sessionError;

      // If approved, update lots to ready for putaway and create putaway tasks
      if (result === 'approved' && session?.lots) {
        const approvedLots = session.lots.filter((lot: any) => lot.hold_status !== 'on_hold');
        const lotIds = approvedLots.map((lot: any) => lot.id);

        if (lotIds.length > 0) {
          await supabase
            .from('receiving_lots')
            .update({ status: 'ready_for_putaway' })
            .in('id', lotIds);

          // Fetch putaway deadline preference
          const { data: deadlinePref } = await supabase
            .from('inventory_preferences')
            .select('preference_value')
            .eq('preference_key', 'putaway_deadline_hours')
            .single();

          const deadlineHours = deadlinePref?.preference_value 
            ? parseInt(deadlinePref.preference_value) 
            : 24;

          // Create putaway tasks for each approved lot
          for (const lot of approvedLots) {
            await supabase.from('putaway_tasks').insert({
              receiving_lot_id: lot.id,
              receiving_session_id: sessionId,
              total_quantity: lot.quantity_received,
              putaway_quantity: 0,
              status: 'pending',
              deadline: new Date(Date.now() + deadlineHours * 60 * 60 * 1000).toISOString()
            });
          }
        }
      }

      // If rejected, place all lots on hold and create inventory_holds entries
      if (result === 'rejected' && session?.lots) {
        for (const lot of session.lots) {
          if (lot.hold_status !== 'on_hold') {
            // Update the receiving lot status
            await supabase
              .from('receiving_lots')
              .update({ hold_status: 'on_hold', status: 'hold' })
              .eq('id', lot.id);

            // Create an inventory_holds entry so it appears in the Hold Log
            await supabase
              .from('inventory_holds')
              .insert({
                receiving_lot_id: lot.id,
                hold_reason_code_id: '786d820c-a7b9-4a67-9393-3d905a85a1d8', // Visual Quality Concern
                hold_reason_description: rejectionReason || 'QA Inspection rejected',
                auto_hold: true,
                status: 'pending',
                priority: 'high',
                hold_placed_by: userId
              });
          }
        }
      }

      return inspection;
    },
    onSuccess: (_, result) => {
      toast({
        title: result === 'approved' ? "Inspection Approved" : "Inspection Rejected",
        description: result === 'approved' 
          ? "Materials are ready for putaway." 
          : "All lots have been placed on hold."
      });
      queryClient.invalidateQueries({ queryKey: ['qa-pending-inspections'] });
      queryClient.invalidateQueries({ queryKey: ['putaway-tasks'] });
      navigate('/qa/receiving-inspections');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!session) {
    return <div className="p-6">Session not found</div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ClipboardCheck className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-bold">QA 2nd Inspection</h1>
        <Badge variant="outline" className="text-lg">
          {session.receiving_number || session.id.slice(0, 8)}
        </Badge>
      </div>

      {/* Session Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Receiving Session Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Supplier:</span>
              <p className="font-medium">{session.supplierName || 'N/A'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Received By:</span>
              <p className="font-medium">{session.receiverName || 'N/A'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Received Date:</span>
              <p className="font-medium">{format(new Date(session.received_date), 'MMM d, yyyy')}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Submitted to QA:</span>
              <p className="font-medium">
                {session.submitted_to_qa_at && format(new Date(session.submitted_to_qa_at), 'h:mm a')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {lotsOnHold.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {lotsOnHold.length} lot(s) are already on HOLD and require separate resolution.
          </AlertDescription>
        </Alert>
      )}

      {lotsMissingCOA.length > 0 && (
        <Alert>
          <FileText className="h-4 w-4" />
          <AlertDescription>
            {lotsMissingCOA.length} lot(s) require COA but none has been uploaded.
          </AlertDescription>
        </Alert>
      )}

      {/* Lots Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Received Lots ({session.lots?.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lot #</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Supplier Lot</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>COA</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {session.lots?.map((lot: any) => (
                <TableRow key={lot.id}>
                  <TableCell className="font-mono">{lot.internal_lot_number}</TableCell>
                  <TableCell>{lot.material?.name}</TableCell>
                  <TableCell>{lot.supplier_lot_number}</TableCell>
                  <TableCell>{lot.quantity_received} {lot.unit?.code}</TableCell>
                  <TableCell>
                    {lot.expiry_date && format(new Date(lot.expiry_date), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    {lot.coa && lot.coa.length > 0 ? (
                      <Badge variant={lot.coa[0].validation_status === 'passed' ? 'default' : 'secondary'}>
                        {lot.coa[0].validation_status}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">None</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {lot.hold_status === 'on_hold' ? (
                      <Badge variant="destructive">ON HOLD</Badge>
                    ) : (
                      <Badge variant="secondary">Pending</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Inspection Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inspection Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="lotCodes"
                checked={lotCodesVerified}
                onCheckedChange={(checked) => setLotCodesVerified(checked as boolean)}
              />
              <Label htmlFor="lotCodes" className="cursor-pointer">
                <p className="font-medium">All lot codes and quantities entered correctly</p>
                <p className="text-sm text-muted-foreground">
                  Verify internal lot numbers match labels and quantities match PO
                </p>
              </Label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="quantities"
                checked={quantitiesVerified}
                onCheckedChange={(checked) => setQuantitiesVerified(checked as boolean)}
              />
              <Label htmlFor="quantities" className="cursor-pointer">
                <p className="font-medium">All quantities match PO and physical count</p>
                <p className="text-sm text-muted-foreground">
                  Spot check physical counts against entered quantities
                </p>
              </Label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="packaging"
                checked={packagingVerified}
                onCheckedChange={(checked) => setPackagingVerified(checked as boolean)}
              />
              <Label htmlFor="packaging" className="cursor-pointer">
                <p className="font-medium">All packaging intact except items on hold</p>
                <p className="text-sm text-muted-foreground">
                  No damage, tears, leaks, or signs of tampering
                </p>
              </Label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="temperatures"
                checked={temperaturesVerified}
                onCheckedChange={(checked) => setTemperaturesVerified(checked as boolean)}
              />
              <Label htmlFor="temperatures" className="cursor-pointer">
                <p className="font-medium">All temperatures recorded properly by receiver</p>
                <p className="text-sm text-muted-foreground">
                  Temperatures within acceptable range for each material type
                </p>
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inspector Signature */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inspector Signature</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Inspector Initials (required)</Label>
            <Input
              value={inspectorInitials}
              onChange={(e) => setInspectorInitials(e.target.value.toUpperCase())}
              placeholder="Enter your initials"
              maxLength={4}
              className="w-32 text-center text-xl font-bold mt-1"
            />
          </div>

          <div>
            <Label>Inspection Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter any notes about this inspection..."
              rows={3}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Rejection Reason */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-destructive">Rejection Reason (if rejecting)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Enter reason for rejection (required to reject)..."
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={() => navigate('/qa/receiving-inspections')}
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={() => submitMutation.mutate('rejected')}
          disabled={!canReject || submitMutation.isPending}
          className="flex-1"
        >
          <XCircle className="h-4 w-4 mr-2" />
          Reject - Place All on Hold
        </Button>
        <Button
          onClick={() => submitMutation.mutate('approved')}
          disabled={!canApprove || submitMutation.isPending}
          className="flex-1"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Approve - Ready for Putaway
        </Button>
      </div>
    </div>
  );
};

export default ReceivingInspection;
