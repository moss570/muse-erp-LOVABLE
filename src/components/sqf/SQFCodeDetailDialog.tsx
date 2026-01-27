import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Database } from "@/integrations/supabase/types";

type SQFCode = Database["public"]["Tables"]["sqf_codes"]["Row"];

interface SQFCodeDetailDialogProps {
  code: SQFCode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SQFCodeDetailDialog({ 
  code, 
  open, 
  onOpenChange 
}: SQFCodeDetailDialogProps) {
  if (!code) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="font-mono text-lg font-bold text-primary">{code.code_number}</span>
            {code.is_mandatory && <Badge variant="destructive">Required</Badge>}
            {code.is_fundamental && <Badge variant="secondary">Fundamental</Badge>}
          </div>
          <DialogTitle className="text-xl">{code.title}</DialogTitle>
          <DialogDescription className="sr-only">
            Details for SQF code {code.code_number}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Category/Module Info */}
            {(code.module || code.category || code.section) && (
              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                {code.module && <span>Module: {code.module}</span>}
                {code.category && <span>• {code.category}</span>}
                {code.section && <span>• Section {code.section}</span>}
                {code.subsection && <span>• {code.subsection}</span>}
              </div>
            )}

            {/* Requirement Text */}
            {code.requirement_text && (
              <div>
                <h4 className="font-semibold mb-2">Requirement</h4>
                <p className="text-sm whitespace-pre-wrap bg-muted/50 p-4 rounded-lg">
                  {code.requirement_text}
                </p>
              </div>
            )}

            <Separator />

            {/* Guidance Notes */}
            {code.guidance_notes && (
              <div>
                <h4 className="font-semibold mb-2">Guidance Notes</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {code.guidance_notes}
                </p>
              </div>
            )}

            {/* Evidence Required */}
            {code.evidence_required && (
              <div>
                <h4 className="font-semibold mb-2">Evidence Required</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {code.evidence_required}
                </p>
              </div>
            )}

            {/* Verification Method */}
            {code.verification_method && (
              <div>
                <h4 className="font-semibold mb-2">Verification Method</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {code.verification_method}
                </p>
              </div>
            )}

            {/* Implementation Tips */}
            {code.implementation_tips && (
              <div>
                <h4 className="font-semibold mb-2">Implementation Tips</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {code.implementation_tips}
                </p>
              </div>
            )}

            {/* Common Non-Conformances */}
            {code.common_nonconformances && (
              <div>
                <h4 className="font-semibold mb-2">Common Non-Conformances</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {code.common_nonconformances}
                </p>
              </div>
            )}

            {/* Related Codes */}
            {code.related_codes && code.related_codes.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Related Codes</h4>
                <div className="flex flex-wrap gap-2">
                  {code.related_codes.map((relatedCode, idx) => (
                    <Badge key={idx} variant="outline" className="font-mono">
                      {relatedCode}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Supersedes */}
            {code.supersedes_code && (
              <div>
                <h4 className="font-semibold mb-2">Supersedes</h4>
                <Badge variant="outline" className="font-mono">
                  {code.supersedes_code}
                </Badge>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
