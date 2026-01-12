import { useRef, useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Pencil,
  Eraser,
  Trash2,
  Undo,
  Download,
  Palette,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StylusCanvasProps {
  onSave?: (dataUrl: string) => void;
  initialImage?: string;
  className?: string;
}

type Tool = "pen" | "eraser";

const COLORS = [
  "#000000", // Black
  "#1e40af", // Blue
  "#dc2626", // Red
  "#16a34a", // Green
  "#ca8a04", // Yellow/Gold
  "#7c3aed", // Purple
];

export function StylusCanvas({ onSave, initialImage, className }: StylusCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<Tool>("pen");
  const [brushSize, setBrushSize] = useState(3);
  const [color, setColor] = useState("#000000");
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Set canvas size to match container
    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      // Save current content
      const ctx = canvas.getContext("2d");
      const currentContent = ctx?.getImageData(0, 0, canvas.width, canvas.height);
      
      canvas.width = rect.width * dpr;
      canvas.height = 300 * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = "300px";
      
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        
        // Fill with white background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, rect.width, 300);
        
        // Restore content if exists
        if (currentContent && currentContent.width > 0) {
          ctx.putImageData(currentContent, 0, 0);
        }
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    
    // Load initial image if provided
    if (initialImage) {
      const img = new Image();
      img.onload = () => {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          saveToHistory();
        }
      };
      img.src = initialImage;
    } else {
      saveToHistory();
    }

    return () => window.removeEventListener("resize", resizeCanvas);
  }, [initialImage]);

  const saveToHistory = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(imageData);
      return newHistory.slice(-20); // Keep last 20 states
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 19));
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const prevIndex = historyIndex - 1;
    const prevState = history[prevIndex];
    if (prevState) {
      ctx.putImageData(prevState, 0, 0);
      setHistoryIndex(prevIndex);
    }
  }, [history, historyIndex]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    saveToHistory();
  }, [saveToHistory]);

  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    const { x, y } = getCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
    ctx.lineWidth = tool === "eraser" ? brushSize * 3 : brushSize;
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    
    // Use pressure sensitivity if available
    const pressure = e.pressure > 0 ? e.pressure : 0.5;
    ctx.lineWidth = (tool === "eraser" ? brushSize * 3 : brushSize) * pressure * 2;
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveToHistory();
      
      // Auto-save when drawing stops
      if (onSave && canvasRef.current) {
        onSave(canvasRef.current.toDataURL("image/png"));
      }
    }
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = `trial-notes-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Trial Notes Canvas
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={undo}
              disabled={historyIndex <= 0}
              title="Undo"
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={clearCanvas}
              title="Clear"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={downloadCanvas}
              title="Download"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Toolbar */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Tool Selection */}
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button
              variant={tool === "pen" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setTool("pen")}
              className="gap-1"
            >
              <Pencil className="h-4 w-4" />
              Pen
            </Button>
            <Button
              variant={tool === "eraser" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setTool("eraser")}
              className="gap-1"
            >
              <Eraser className="h-4 w-4" />
              Eraser
            </Button>
          </div>

          {/* Color Picker */}
          {tool === "pen" && (
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-muted-foreground" />
              <div className="flex gap-1">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    className={cn(
                      "w-6 h-6 rounded-full border-2 transition-transform",
                      color === c ? "border-primary scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Brush Size */}
          <div className="flex items-center gap-2 min-w-[120px]">
            <Label className="text-xs text-muted-foreground">Size</Label>
            <Slider
              value={[brushSize]}
              onValueChange={([v]) => setBrushSize(v)}
              min={1}
              max={10}
              step={1}
              className="flex-1"
            />
          </div>
        </div>

        {/* Canvas */}
        <div
          ref={containerRef}
          className="border rounded-lg overflow-hidden bg-white touch-none"
        >
          <canvas
            ref={canvasRef}
            onPointerDown={startDrawing}
            onPointerMove={draw}
            onPointerUp={stopDrawing}
            onPointerLeave={stopDrawing}
            className="cursor-crosshair"
            style={{ touchAction: "none" }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Use stylus or finger to draw. Notes auto-save after each stroke.
        </p>
      </CardContent>
    </Card>
  );
}