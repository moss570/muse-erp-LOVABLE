import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PalletVisualizerProps {
  ti: number; // Cases per layer (tier)
  hi: number; // Number of layers (height)
  boxLengthCm: number;
  boxWidthCm: number;
  boxHeightCm: number;
  palletLengthCm?: number; // Default 48" = 121.92cm
  palletWidthCm?: number;  // Default 40" = 101.6cm
}

// Standard pallet dimensions (48" x 40")
const DEFAULT_PALLET_LENGTH_CM = 121.92;
const DEFAULT_PALLET_WIDTH_CM = 101.6;
const PALLET_HEIGHT_CM = 15; // Standard pallet height ~6"

export function PalletVisualizer({
  ti,
  hi,
  boxLengthCm,
  boxWidthCm,
  boxHeightCm,
  palletLengthCm = DEFAULT_PALLET_LENGTH_CM,
  palletWidthCm = DEFAULT_PALLET_WIDTH_CM,
}: PalletVisualizerProps) {
  // Calculate optimal box arrangement
  const arrangement = useMemo(() => {
    if (!ti || !boxLengthCm || !boxWidthCm) return null;

    // Try different arrangements to fit Ti boxes on the pallet
    // Arrangement 1: All boxes same orientation (length along pallet length)
    const cols1 = Math.floor(palletLengthCm / boxLengthCm);
    const rows1 = Math.floor(palletWidthCm / boxWidthCm);
    const fit1 = cols1 * rows1;

    // Arrangement 2: All boxes rotated 90 degrees
    const cols2 = Math.floor(palletLengthCm / boxWidthCm);
    const rows2 = Math.floor(palletWidthCm / boxLengthCm);
    const fit2 = cols2 * rows2;

    // Use the arrangement that fits the Ti value best
    let cols: number, rows: number, boxW: number, boxL: number;
    
    if (fit1 >= ti && fit1 <= fit2) {
      cols = cols1;
      rows = rows1;
      boxL = boxLengthCm;
      boxW = boxWidthCm;
    } else if (fit2 >= ti) {
      cols = cols2;
      rows = rows2;
      boxL = boxWidthCm;
      boxW = boxLengthCm;
    } else {
      // Neither arrangement fits Ti exactly, use the one that fits more
      if (fit1 >= fit2) {
        cols = cols1;
        rows = rows1;
        boxL = boxLengthCm;
        boxW = boxWidthCm;
      } else {
        cols = cols2;
        rows = rows2;
        boxL = boxWidthCm;
        boxW = boxLengthCm;
      }
    }

    // Calculate positions for Ti boxes
    const positions: { x: number; y: number; w: number; h: number }[] = [];
    let count = 0;
    for (let row = 0; row < rows && count < ti; row++) {
      for (let col = 0; col < cols && count < ti; col++) {
        positions.push({
          x: col * boxL,
          y: row * boxW,
          w: boxL,
          h: boxW,
        });
        count++;
      }
    }

    return {
      positions,
      cols,
      rows,
      boxL,
      boxW,
      maxFit: cols * rows,
    };
  }, [ti, boxLengthCm, boxWidthCm, palletLengthCm, palletWidthCm]);

  // Calculate total stack height
  const totalStackHeight = useMemo(() => {
    if (!hi || !boxHeightCm) return PALLET_HEIGHT_CM;
    return PALLET_HEIGHT_CM + (hi * boxHeightCm);
  }, [hi, boxHeightCm]);

  // SVG scale factors
  const topViewWidth = 280;
  const topViewHeight = 240;
  const sideViewWidth = 280;
  const sideViewHeight = 200;
  
  const topScale = Math.min(
    (topViewWidth - 40) / palletLengthCm,
    (topViewHeight - 40) / palletWidthCm
  );
  
  const sideScale = Math.min(
    (sideViewWidth - 40) / palletLengthCm,
    (sideViewHeight - 40) / (totalStackHeight || 100)
  );

  if (!ti || !hi || !boxLengthCm || !boxWidthCm || !boxHeightCm) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Enter Ti, Hi, and box dimensions to see pallet visualization
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Top-Down View */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Top View (Layer Arrangement)</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <svg 
            width={topViewWidth} 
            height={topViewHeight} 
            viewBox={`0 0 ${topViewWidth} ${topViewHeight}`}
            className="border rounded bg-muted/30"
          >
            {/* Pallet outline */}
            <rect
              x={20}
              y={20}
              width={palletLengthCm * topScale}
              height={palletWidthCm * topScale}
              fill="hsl(var(--muted))"
              stroke="hsl(var(--border))"
              strokeWidth={2}
              rx={2}
            />
            
            {/* Pallet slats */}
            {[0.2, 0.5, 0.8].map((pos, i) => (
              <line
                key={i}
                x1={20}
                y1={20 + palletWidthCm * topScale * pos}
                x2={20 + palletLengthCm * topScale}
                y2={20 + palletWidthCm * topScale * pos}
                stroke="hsl(var(--border))"
                strokeWidth={1}
                strokeDasharray="4,4"
              />
            ))}

            {/* Boxes */}
            {arrangement?.positions.map((pos, i) => (
              <g key={i}>
                <rect
                  x={20 + pos.x * topScale}
                  y={20 + pos.y * topScale}
                  width={pos.w * topScale - 2}
                  height={pos.h * topScale - 2}
                  fill="hsl(var(--primary) / 0.7)"
                  stroke="hsl(var(--primary))"
                  strokeWidth={1}
                  rx={2}
                />
                <text
                  x={20 + pos.x * topScale + (pos.w * topScale) / 2}
                  y={20 + pos.y * topScale + (pos.h * topScale) / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={10}
                  fill="hsl(var(--primary-foreground))"
                  fontWeight="bold"
                >
                  {i + 1}
                </text>
              </g>
            ))}

            {/* Dimension labels */}
            <text
              x={20 + (palletLengthCm * topScale) / 2}
              y={topViewHeight - 5}
              textAnchor="middle"
              fontSize={10}
              fill="hsl(var(--muted-foreground))"
            >
              48" ({Math.round(palletLengthCm)}cm)
            </text>
            <text
              x={10}
              y={20 + (palletWidthCm * topScale) / 2}
              textAnchor="middle"
              fontSize={10}
              fill="hsl(var(--muted-foreground))"
              transform={`rotate(-90, 10, ${20 + (palletWidthCm * topScale) / 2})`}
            >
              40" ({Math.round(palletWidthCm)}cm)
            </text>
          </svg>
        </CardContent>
      </Card>

      {/* Side View */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Side View (Stack Height)</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <svg 
            width={sideViewWidth} 
            height={sideViewHeight} 
            viewBox={`0 0 ${sideViewWidth} ${sideViewHeight}`}
            className="border rounded bg-muted/30"
          >
            {/* Pallet base */}
            <rect
              x={20}
              y={sideViewHeight - 20 - PALLET_HEIGHT_CM * sideScale}
              width={palletLengthCm * sideScale}
              height={PALLET_HEIGHT_CM * sideScale}
              fill="hsl(var(--muted))"
              stroke="hsl(var(--border))"
              strokeWidth={2}
              rx={2}
            />

            {/* Stack layers */}
            {Array.from({ length: hi }).map((_, layer) => (
              <rect
                key={layer}
                x={20}
                y={sideViewHeight - 20 - PALLET_HEIGHT_CM * sideScale - (layer + 1) * boxHeightCm * sideScale}
                width={palletLengthCm * sideScale}
                height={boxHeightCm * sideScale - 1}
                fill={layer % 2 === 0 ? "hsl(var(--primary) / 0.7)" : "hsl(var(--primary) / 0.5)"}
                stroke="hsl(var(--primary))"
                strokeWidth={1}
                rx={2}
              />
            ))}

            {/* Layer labels */}
            {Array.from({ length: hi }).map((_, layer) => (
              <text
                key={layer}
                x={sideViewWidth - 25}
                y={sideViewHeight - 20 - PALLET_HEIGHT_CM * sideScale - (layer + 0.5) * boxHeightCm * sideScale}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={9}
                fill="hsl(var(--muted-foreground))"
              >
                L{layer + 1}
              </text>
            ))}

            {/* Height dimension */}
            <line
              x1={sideViewWidth - 10}
              y1={sideViewHeight - 20}
              x2={sideViewWidth - 10}
              y2={sideViewHeight - 20 - totalStackHeight * sideScale}
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={1}
            />
            <text
              x={sideViewWidth - 5}
              y={sideViewHeight - 20 - (totalStackHeight * sideScale) / 2}
              textAnchor="start"
              dominantBaseline="middle"
              fontSize={9}
              fill="hsl(var(--muted-foreground))"
              transform={`rotate(-90, ${sideViewWidth - 5}, ${sideViewHeight - 20 - (totalStackHeight * sideScale) / 2})`}
            >
              {Math.round(totalStackHeight)}cm
            </text>
          </svg>
        </CardContent>
      </Card>
    </div>
  );
}
