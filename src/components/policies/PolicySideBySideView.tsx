import { useState } from "react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Eye, FileCode, X } from "lucide-react";
import PolicyDocumentViewer from "./PolicyDocumentViewer";
import PolicyContentWithHighlights from "./PolicyContentWithHighlights";
import SQFCodeDetailPanel from "./SQFCodeDetailPanel";
import { cn } from "@/lib/utils";

interface PolicySideBySideViewProps {
  policy: {
    id: string;
    title: string;
    content?: string | null;
  };
  attachment?: {
    file_path: string;
    file_name: string;
    file_type?: string | null;
    file_url?: string | null;
  } | null;
  selectedMapping: {
    id: string;
    compliance_status?: string | null;
    notes?: string | null;
    gap_description?: string | null;
    evidence_excerpts?: string[] | null;
    sqf_code?: {
      id: string;
      code_number: string;
      title: string;
      requirement_text?: string | null;
      guidance_notes?: string | null;
      evidence_requirements?: string | null;
      is_mandatory?: boolean;
      category?: string | null;
    } | null;
  } | null;
  onClose?: () => void;
  className?: string;
}

export default function PolicySideBySideView({
  policy,
  attachment,
  selectedMapping,
  onClose,
  className,
}: PolicySideBySideViewProps) {
  const [viewMode, setViewMode] = useState<"visual" | "text">("text");
  
  const evidenceExcerpts = selectedMapping?.evidence_excerpts || [];

  return (
    <div className={cn("h-[700px] border rounded-lg overflow-hidden", className)}>
      <ResizablePanelGroup direction="horizontal">
        {/* Left Panel: Policy Document */}
        <ResizablePanel defaultSize={55} minSize={30}>
          <div className="h-full flex flex-col">
            {/* Panel Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
              <h3 className="font-medium text-sm">Policy Document</h3>
              <div className="flex items-center gap-1 border rounded-lg p-0.5">
                <Button
                  variant={viewMode === "visual" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => setViewMode("visual")}
                  disabled={!attachment}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Original
                </Button>
                <Button
                  variant={viewMode === "text" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => setViewMode("text")}
                  disabled={!policy.content}
                >
                  <FileCode className="h-3 w-3 mr-1" />
                  Text
                </Button>
              </div>
            </div>
            
            {/* Panel Content */}
            <div className="flex-1 overflow-auto">
              {viewMode === "visual" && attachment ? (
                <PolicyDocumentViewer
                  filePath={attachment.file_path}
                  fileName={attachment.file_name}
                  fileType={attachment.file_type || undefined}
                  fileUrl={attachment.file_url || undefined}
                  className="h-full"
                />
              ) : viewMode === "text" && policy.content ? (
                <>
                  {evidenceExcerpts.length === 0 && (
                    <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 text-xs border-b">
                      No evidence excerpts saved for this mapping. Click Re-analyze on the policy to generate them.
                    </div>
                  )}
                  <PolicyContentWithHighlights
                    content={policy.content}
                    evidenceExcerpts={evidenceExcerpts}
                    isActive={!!selectedMapping}
                  />
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  {!attachment && !policy.content
                    ? "No document content available"
                    : viewMode === "visual" && !attachment
                    ? "No original document attached"
                    : "No extracted text available"}
                </div>
              )}
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Panel: SQF Code Details */}
        <ResizablePanel defaultSize={45} minSize={25}>
          <div className="h-full flex flex-col">
            {/* Panel Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
              <h3 className="font-medium text-sm">SQF Code Details</h3>
              {onClose && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            {/* Panel Content */}
            <div className="flex-1 overflow-auto">
              {selectedMapping ? (
                <SQFCodeDetailPanel mapping={selectedMapping} />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground p-4 text-center">
                  <p>Select an SQF code from the list to view its requirements and compare with the policy</p>
                </div>
              )}
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
