import { useState, useEffect, useCallback } from "react";
import { Loader2, FileText, Download, ZoomIn, ZoomOut, RotateCcw, Eye, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PdfJsViewer } from "@/components/shared/PdfJsViewer";
import { supabase } from "@/integrations/supabase/client";
import mammoth from "mammoth";

interface PolicyDocumentViewerProps {
  /** File path in the policy-attachments bucket */
  filePath: string;
  /** Original file name for display and type detection */
  fileName: string;
  /** Optional: File type/mime type */
  fileType?: string;
  /** Optional: Direct file URL for download link */
  fileUrl?: string;
  /** Optional: CSS class for container */
  className?: string;
}

type ViewMode = "visual" | "text";

export function PolicyDocumentViewer({
  filePath,
  fileName,
  fileType,
  fileUrl,
  className = "",
}: PolicyDocumentViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("visual");
  
  // PDF state
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  
  // Word document state (converted to HTML)
  const [wordHtml, setWordHtml] = useState<string | null>(null);
  const [wordMessages, setWordMessages] = useState<string[]>([]);
  
  // Zoom for Word documents
  const [wordZoom, setWordZoom] = useState(1);

  // Determine file type
  const isPdf = fileType?.includes("pdf") || fileName.toLowerCase().endsWith(".pdf");
  const isWord = fileType?.includes("word") || 
                 fileType?.includes("openxmlformats-officedocument") ||
                 fileName.toLowerCase().endsWith(".docx") ||
                 fileName.toLowerCase().endsWith(".doc");

  // Download file URL
  const downloadUrl = fileUrl || 
    (filePath ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/policy-attachments/${filePath}` : null);

  // Load document from storage
  const loadDocument = useCallback(async () => {
    if (!filePath) {
      setError("No file path provided");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: downloadError } = await supabase.storage
        .from("policy-attachments")
        .download(filePath);

      if (downloadError || !data) {
        throw new Error(downloadError?.message || "Failed to download document");
      }

      if (isPdf) {
        // For PDFs, convert Blob to Uint8Array for PdfJsViewer
        const arrayBuffer = await data.arrayBuffer();
        setPdfData(new Uint8Array(arrayBuffer));
      } else if (isWord) {
        // For Word docs, use mammoth to convert to HTML
        const arrayBuffer = await data.arrayBuffer();
        const result = await mammoth.convertToHtml(
          { arrayBuffer },
          {
            styleMap: [
              // Preserve table styling
              "table => table.policy-table",
              "tr => tr.policy-row",
              "td => td.policy-cell",
              "th => th.policy-header-cell",
              // Preserve headings
              "p[style-name='Heading 1'] => h1.policy-heading-1",
              "p[style-name='Heading 2'] => h2.policy-heading-2",
              "p[style-name='Heading 3'] => h3.policy-heading-3",
              // Bold paragraphs as headers
              "b => strong",
            ],
          }
        );
        
        setWordHtml(result.value);
        if (result.messages && result.messages.length > 0) {
          setWordMessages(result.messages.map((m: any) => m.message));
          console.log("Mammoth conversion messages:", result.messages);
        }
      } else {
        setError("Unsupported file type. Only PDF and Word documents are supported.");
      }
    } catch (err) {
      console.error("Error loading document:", err);
      setError(err instanceof Error ? err.message : "Failed to load document");
    } finally {
      setIsLoading(false);
    }
  }, [filePath, isPdf, isWord]);

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  // Zoom handlers for Word docs
  const handleZoomIn = () => setWordZoom((z) => Math.min(2, z + 0.1));
  const handleZoomOut = () => setWordZoom((z) => Math.max(0.5, z - 0.1));
  const handleZoomReset = () => setWordZoom(1);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] ${className}`}>
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-[400px] gap-4 ${className}`}>
        <FileText className="h-12 w-12 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{error}</p>
        {downloadUrl && (
          <Button variant="outline" size="sm" asChild>
            <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
              <Download className="h-4 w-4 mr-2" />
              Download Original
            </a>
          </Button>
        )}
      </div>
    );
  }

  // Render PDF
  if (isPdf && pdfData) {
    return (
      <div className={className}>
        <PdfJsViewer data={pdfData} className="h-full min-h-[500px]" />
      </div>
    );
  }

  // Render Word document as HTML
  if (isWord && wordHtml) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-2 border-b bg-background/60 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{fileName}</span>
          </div>
          
          {/* View mode toggle */}
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant={viewMode === "visual" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("visual")}
              className="h-7"
            >
              <Eye className="h-3.5 w-3.5 mr-1" />
              Visual
            </Button>
            <Button
              type="button"
              variant={viewMode === "text" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("text")}
              className="h-7"
            >
              <Code className="h-3.5 w-3.5 mr-1" />
              HTML
            </Button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={wordZoom <= 0.5}
              onClick={handleZoomOut}
              title="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground min-w-[3rem] text-center">
              {Math.round(wordZoom * 100)}%
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={wordZoom >= 2}
              onClick={handleZoomIn}
              title="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={wordZoom === 1}
              onClick={handleZoomReset}
              title="Reset zoom"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Download button */}
          {downloadUrl && (
            <Button variant="outline" size="sm" className="h-7" asChild>
              <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                <Download className="h-3.5 w-3.5 mr-1" />
                Download
              </a>
            </Button>
          )}
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-auto p-4 bg-background">
          {viewMode === "visual" ? (
            <div 
              className="policy-document-content max-w-4xl mx-auto"
              style={{ 
                transform: `scale(${wordZoom})`, 
                transformOrigin: "top center",
                transition: "transform 0.2s ease"
              }}
              dangerouslySetInnerHTML={{ __html: wordHtml }}
            />
          ) : (
            <pre className="text-xs font-mono whitespace-pre-wrap break-all">
              {wordHtml}
            </pre>
          )}
        </div>

        {/* Conversion warnings */}
        {wordMessages.length > 0 && (
          <div className="border-t px-3 py-2 bg-warning/10">
            <p className="text-xs text-warning-foreground">
              ⚠️ Some formatting may not have converted perfectly. {wordMessages.length} message(s).
            </p>
          </div>
        )}
      </div>
    );
  }

  // Fallback - unsupported or no content
  return (
    <div className={`flex flex-col items-center justify-center min-h-[400px] gap-4 ${className}`}>
      <FileText className="h-12 w-12 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Unable to preview this document type</p>
      {downloadUrl && (
        <Button variant="outline" size="sm" asChild>
          <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
            <Download className="h-4 w-4 mr-2" />
            Download Original
          </a>
        </Button>
      )}
    </div>
  );
}

export default PolicyDocumentViewer;
