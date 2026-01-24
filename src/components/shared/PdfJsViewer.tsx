import { useEffect, useMemo, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";

import { Button } from "@/components/ui/button";

// Configure PDF.js worker for Vite/ESM.
// This must be set before calling getDocument.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url,
).toString();

interface PdfJsViewerProps {
  /** Pass a Uint8Array. We'll copy its buffer before giving it to PDF.js (which detaches buffers). */
  data: Uint8Array;
  className?: string;
}

export function PdfJsViewer({ data, className }: PdfJsViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pdfDocRef = useRef<pdfjs.PDFDocumentProxy | null>(null);
  const renderSeq = useRef(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // IMPORTANT: PDF.js transfers (detaches) ArrayBuffers to the worker.
  // We receive a Uint8Array and copy its underlying buffer so each render gets a fresh buffer.
  // Using data.slice() on a Uint8Array creates a new Uint8Array with a new underlying ArrayBuffer.
  const bytes = useMemo(() => data.slice(), [data]);

  useEffect(() => {
    setPageNumber(1);
  }, [data]);

  // Load (or reload) the PDF document when bytes change
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsRendering(true);
      setError(null);
      pdfDocRef.current = null;

      try {
        const doc = await pdfjs.getDocument({ data: bytes }).promise;
        if (cancelled) return;
        pdfDocRef.current = doc;
        setNumPages(doc.numPages);
      } catch (e: unknown) {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : "Unknown error";
        setError(message);
      } finally {
        if (!cancelled) setIsRendering(false);
      }
    };

    load();

    return () => {
      cancelled = true;
      try {
        pdfDocRef.current?.destroy();
      } catch {
        // ignore
      }
      pdfDocRef.current = null;
    };
  }, [bytes]);

  // Render current page (and re-render on resize)
  useEffect(() => {
    let cancelled = false;
    let renderTask: ReturnType<pdfjs.PDFPageProxy["render"]> | null = null;
    let raf = 0;

    const render = async () => {
      const seq = ++renderSeq.current;
      setIsRendering(true);
      setError(null);

      try {
        const doc = pdfDocRef.current;
        if (!doc) return;

        const page = await doc.getPage(pageNumber);
        if (cancelled || seq !== renderSeq.current) return;

        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const viewport = page.getViewport({ scale: 1 });
        const containerWidth = Math.max(320, container.clientWidth);
        const scale = containerWidth / viewport.width;
        const scaledViewport = page.getViewport({ scale });

        canvas.width = Math.floor(scaledViewport.width);
        canvas.height = Math.floor(scaledViewport.height);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        renderTask?.cancel();
        renderTask = page.render({ canvasContext: ctx, viewport: scaledViewport, canvas });
        await renderTask.promise;
      } catch (e: unknown) {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : "Unknown error";
        setError(message);
      } finally {
        if (!cancelled) setIsRendering(false);
      }
    };

    const scheduleRender = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => void render());
    };

    scheduleRender();

    const ro = new ResizeObserver(() => {
      scheduleRender();
    });
    if (containerRef.current) ro.observe(containerRef.current);

    return () => {
      cancelled = true;
      ro.disconnect();
      cancelAnimationFrame(raf);
      try {
        renderTask?.cancel();
      } catch {
        // ignore
      }
    };
  }, [pageNumber, numPages]);

  const canPrev = pageNumber > 1;
  const canNext = numPages ? pageNumber < numPages : false;

  return (
    <div ref={containerRef} className={className}>
      <div className="flex items-center justify-between gap-2 border-b bg-background/60 px-2 py-1">
        <div className="text-xs text-muted-foreground">
          {numPages ? `Page ${pageNumber} of ${numPages}` : "Loading…"}
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!canPrev || isRendering}
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
          >
            Prev
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!canNext || isRendering}
            onClick={() => setPageNumber((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      <div className="flex justify-center overflow-auto p-2">
        {error ? (
          <div className="p-4 text-sm text-muted-foreground">Unable to render PDF: {error}</div>
        ) : (
          <canvas ref={canvasRef} className="max-w-full" />
        )}
      </div>
    </div>
  );
}
