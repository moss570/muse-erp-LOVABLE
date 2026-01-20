import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ClipboardCheck, AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface SubmitToQAButtonProps {
  session: any;
  onSuccess: () => void;
}

const SubmitToQAButton = ({ session, onSuccess }: SubmitToQAButtonProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if all lots have required data
  const lotsValid = session.lots?.every((lot: any) => 
    lot.internal_lot_number && 
    lot.quantity_received
  );

  // Check for lots on hold
  const lotsOnHold = session.lots?.filter((lot: any) => lot.hold_status === 'on_hold') || [];

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('po_receiving_sessions')
        .update({
          submitted_to_qa_at: new Date().toISOString(),
          submitted_to_qa_by: (await supabase.auth.getUser()).data.user?.id,
          qa_inspection_status: 'pending'
        })
        .eq('id', session.id);

      if (error) throw error;

      return true;
    },
    onSuccess: () => {
      toast({
        title: "Submitted to QA",
        description: "Receiving session has been submitted for 2nd inspection."
      });
      queryClient.invalidateQueries({ queryKey: ['receiving-session', session.id] });
      queryClient.invalidateQueries({ queryKey: ['qa-pending-inspections'] });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Already submitted
  if (session.submitted_to_qa_at) {
    return (
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          Submitted to QA on {format(new Date(session.submitted_to_qa_at), 'MMM d, yyyy h:mm a')}
          <br />
          Status: {session.qa_inspection_status}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      {lotsOnHold.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {lotsOnHold.length} lot(s) are on hold. They will be flagged for QA review.
          </AlertDescription>
        </Alert>
      )}

      {!lotsValid && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            All lots must have lot codes and quantities recorded before submitting.
          </AlertDescription>
        </Alert>
      )}

      <Button
        onClick={() => submitMutation.mutate()}
        disabled={!lotsValid || submitMutation.isPending}
        className="w-full"
      >
        <ClipboardCheck className="h-4 w-4 mr-2" />
        Submit to QA for 2nd Inspection
      </Button>
    </div>
  );
};

export default SubmitToQAButton;
