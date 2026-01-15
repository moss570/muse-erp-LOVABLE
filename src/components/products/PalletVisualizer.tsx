import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OverhangResult, getOverhangSeverity } from "@/lib/palletCalculations";

interface PalletVisualizerProps {
  ti: number; // Cases per layer (tier)
  hi: number; // Number of layers (height)
  boxLengthIn: number;
  boxWidthIn: number;
  boxHeightIn: number;
  palletLengthIn?: number; // Default 48"
  palletWidthIn?: number;  // Default 40"
  overhang?: OverhangResult | null; // Overhang data for visualization
}

// Standard pallet dimensions (48" x 40")
const DEFAULT_PALLET_LENGTH_IN = 48;
const DEFAULT_PALLET_WIDTH_IN = 40;
const PALLET_HEIGHT_IN = 6; // Standard pallet height ~6"

export function PalletVisualizer({
  ti,
  hi,
  boxLengthIn,
  boxWidthIn,
  boxHeightIn,
  palletLengthIn = DEFAULT_PALLET_LENGTH_IN,
  palletWidthIn = DEFAULT_PALLET_WIDTH_IN,
  overhang,
}: PalletVisualizerProps) {
  const overhangSeverity = overhang ? getOverhangSeverity(overhang.maxOverhang) : 'none';
  // Calculate optimal box arrangement
  const arrangement = useMemo(() => {
    if (!ti || !boxLengthIn || !boxWidthIn) return null;

    // Try different arrangements to fit Ti boxes on the pallet
    // Arrangement 1: All boxes same orientation (length along pallet length)
    const cols1 = Math.floor(palletLengthIn / boxLengthIn);
    const rows1 = Math.floor(palletWidthIn / boxWidthIn);
    const fit1 = cols1 * rows1;

    // Arrangement 2: All boxes rotated 90 degrees
    const cols2 = Math.floor(palletLengthIn / boxWidthIn);
    const rows2 = Math.floor(palletWidthIn / boxLengthIn);
    const fit2 = cols2 * rows2;

    // Use the arrangement that fits the Ti value best
    let cols: number, rows: number, boxW: number, boxL: number;
    
    if (fit1 >= ti && fit1 <= fit2) {
      cols = cols1;
      rows = rows1;
      boxL = boxLengthIn;
      boxW = boxWidthIn;
    } else if (fit2 >= ti) {
      cols = cols2;
      rows = rows2;
      boxL = boxWidthIn;
      boxW = boxLengthIn;
    } else {
      // Neither arrangement fits Ti exactly, use the one that fits more
      if (fit1 >= fit2) {
        cols = cols1;
        rows = rows1;
        boxL = boxLengthIn;
        boxW = boxWidthIn;
      } else {
        cols = cols2;
        rows = rows2;
        boxL = boxWidthIn;
        boxW = boxLengthIn;
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
  }, [ti, boxLengthIn, boxWidthIn, palletLengthIn, palletWidthIn]);

  // Calculate total stack height
  const totalStackHeight = useMemo(() => {
    if (!hi || !boxHeightIn) return PALLET_HEIGHT_IN;
    return PALLET_HEIGHT_IN + (hi * boxHeightIn);
  }, [hi, boxHeightIn]);

  // SVG scale factors (scale inches to pixels)
  const topViewWidth = 280;
  const topViewHeight = 240;
  const sideViewWidth = 280;
  const sideViewHeight = 200;
  
  const topScale = Math.min(
    (topViewWidth - 40) / palletLengthIn,
    (topViewHeight - 40) / palletWidthIn
  );
  
  const sideScale = Math.min(
    (sideViewWidth - 40) / palletLengthIn,
    (sideViewHeight - 40) / (totalStackHeight || 50)
  );

  if (!ti || !hi || !boxLengthIn || !boxWidthIn || !boxHeightIn) {
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
              width={palletLengthIn * topScale}
              height={palletWidthIn * topScale}
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
                y1={20 + palletWidthIn * topScale * pos}
                x2={20 + palletLengthIn * topScale}
                y2={20 + palletWidthIn * topScale * pos}
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
                  fill={overhangSeverity === 'danger' 
                    ? "hsl(var(--destructive) / 0.7)" 
                    : overhangSeverity === 'warning'
                    ? "hsl(30 90% 50% / 0.7)"
                    : "hsl(var(--primary) / 0.7)"
                  }
                  stroke={overhangSeverity === 'danger' 
                    ? "hsl(var(--destructive))" 
                    : overhangSeverity === 'warning'
                    ? "hsl(30 90% 40%)"
                    : "hsl(var(--primary))"
                  }
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

            {/* Overhang indicators */}
            {overhang && overhang.hasOverhang && (
              <>
                {/* Visual overhang zone - draw bounding box of all cases */}
                {arrangement && (
                  <rect
                    x={20 - (overhang.left * topScale)}
                    y={20 - (overhang.front * topScale)}
                    width={(palletLengthIn + overhang.left + overhang.right) * topScale}
                    height={(palletWidthIn + overhang.front + overhang.back) * topScale}
                    fill="none"
                    stroke={overhangSeverity === 'danger' ? "hsl(var(--destructive))" : "hsl(30 90% 50%)"}
                    strokeWidth={2}
                    strokeDasharray="4,4"
                    rx={2}
                  />
                )}
              </>
            )}

            {/* Dimension labels */}
            <text
              x={20 + (palletLengthIn * topScale) / 2}
              y={topViewHeight - 5}
              textAnchor="middle"
              fontSize={10}
              fill="hsl(var(--muted-foreground))"
            >
              {palletLengthIn}"
            </text>
            <text
              x={10}
              y={20 + (palletWidthIn * topScale) / 2}
              textAnchor="middle"
              fontSize={10}
              fill="hsl(var(--muted-foreground))"
              transform={`rotate(-90, 10, ${20 + (palletWidthIn * topScale) / 2})`}
            >
              {palletWidthIn}"
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
              y={sideViewHeight - 20 - PALLET_HEIGHT_IN * sideScale}
              width={palletLengthIn * sideScale}
              height={PALLET_HEIGHT_IN * sideScale}
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
                y={sideViewHeight - 20 - PALLET_HEIGHT_IN * sideScale - (layer + 1) * boxHeightIn * sideScale}
                width={palletLengthIn * sideScale}
                height={boxHeightIn * sideScale - 1}
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
                y={sideViewHeight - 20 - PALLET_HEIGHT_IN * sideScale - (layer + 0.5) * boxHeightIn * sideScale}
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
              {totalStackHeight.toFixed(1)}"
            </text>
          </svg>
        </CardContent>
      </Card>
    </div>
  );
}
