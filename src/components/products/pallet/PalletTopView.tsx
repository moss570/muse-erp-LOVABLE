import { useMemo } from "react";
import { OverhangResult, getOverhangSeverity } from "@/lib/palletCalculations";

interface PalletTopViewProps {
  ti: number;
  boxLengthIn: number;
  boxWidthIn: number;
  palletLengthIn: number;
  palletWidthIn: number;
  overhang?: OverhangResult | null;
  showGrid?: boolean;
  showDimensions?: boolean;
}

export function PalletTopView({
  ti,
  boxLengthIn,
  boxWidthIn,
  palletLengthIn,
  palletWidthIn,
  overhang,
  showGrid = true,
  showDimensions = true,
}: PalletTopViewProps) {
  const overhangSeverity = overhang ? getOverhangSeverity(overhang.maxOverhang) : 'none';
  
  const arrangement = useMemo(() => {
    if (!ti || !boxLengthIn || !boxWidthIn) return null;

    const cols1 = Math.floor(palletLengthIn / boxLengthIn);
    const rows1 = Math.floor(palletWidthIn / boxWidthIn);
    const fit1 = cols1 * rows1;

    const cols2 = Math.floor(palletLengthIn / boxWidthIn);
    const rows2 = Math.floor(palletWidthIn / boxLengthIn);
    const fit2 = cols2 * rows2;

    let cols: number, rows: number, boxW: number, boxL: number;
    
    if (fit1 >= ti && fit1 <= fit2) {
      cols = cols1; rows = rows1; boxL = boxLengthIn; boxW = boxWidthIn;
    } else if (fit2 >= ti) {
      cols = cols2; rows = rows2; boxL = boxWidthIn; boxW = boxLengthIn;
    } else {
      if (fit1 >= fit2) {
        cols = cols1; rows = rows1; boxL = boxLengthIn; boxW = boxWidthIn;
      } else {
        cols = cols2; rows = rows2; boxL = boxWidthIn; boxW = boxLengthIn;
      }
    }

    const positions: { x: number; y: number; w: number; h: number }[] = [];
    let count = 0;
    for (let row = 0; row < rows && count < ti; row++) {
      for (let col = 0; col < cols && count < ti; col++) {
        positions.push({ x: col * boxL, y: row * boxW, w: boxL, h: boxW });
        count++;
      }
    }

    return { positions, cols, rows, boxL, boxW, maxFit: cols * rows };
  }, [ti, boxLengthIn, boxWidthIn, palletLengthIn, palletWidthIn]);

  const viewWidth = 320;
  const viewHeight = 280;
  const padding = 30;
  
  const scale = Math.min(
    (viewWidth - padding * 2) / palletLengthIn,
    (viewHeight - padding * 2) / palletWidthIn
  );

  // Grid lines (every 6 inches)
  const gridSpacing = 6;
  const gridLinesX = Math.floor(palletLengthIn / gridSpacing);
  const gridLinesY = Math.floor(palletWidthIn / gridSpacing);

  return (
    <svg 
      width={viewWidth} 
      height={viewHeight} 
      viewBox={`0 0 ${viewWidth} ${viewHeight}`}
      className="border rounded bg-muted/30"
    >
      {/* Grid overlay */}
      {showGrid && (
        <g opacity={0.3}>
          {Array.from({ length: gridLinesX + 1 }).map((_, i) => (
            <line
              key={`gx-${i}`}
              x1={padding + i * gridSpacing * scale}
              y1={padding}
              x2={padding + i * gridSpacing * scale}
              y2={padding + palletWidthIn * scale}
              stroke="hsl(var(--border))"
              strokeWidth={0.5}
            />
          ))}
          {Array.from({ length: gridLinesY + 1 }).map((_, i) => (
            <line
              key={`gy-${i}`}
              x1={padding}
              y1={padding + i * gridSpacing * scale}
              x2={padding + palletLengthIn * scale}
              y2={padding + i * gridSpacing * scale}
              stroke="hsl(var(--border))"
              strokeWidth={0.5}
            />
          ))}
        </g>
      )}

      {/* Pallet outline */}
      <rect
        x={padding}
        y={padding}
        width={palletLengthIn * scale}
        height={palletWidthIn * scale}
        fill="hsl(var(--muted))"
        stroke="hsl(var(--border))"
        strokeWidth={2}
        rx={2}
      />
      
      {/* Pallet slats */}
      {[0.2, 0.5, 0.8].map((pos, i) => (
        <line
          key={i}
          x1={padding}
          y1={padding + palletWidthIn * scale * pos}
          x2={padding + palletLengthIn * scale}
          y2={padding + palletWidthIn * scale * pos}
          stroke="hsl(var(--border))"
          strokeWidth={1}
          strokeDasharray="4,4"
        />
      ))}

      {/* Overhang zone highlight */}
      {overhang && overhang.hasOverhang && (
        <rect
          x={padding - (overhang.left * scale)}
          y={padding - (overhang.front * scale)}
          width={(palletLengthIn + overhang.left + overhang.right) * scale}
          height={(palletWidthIn + overhang.front + overhang.back) * scale}
          fill={overhangSeverity === 'danger' ? "hsl(var(--destructive) / 0.1)" : "hsl(30 90% 50% / 0.1)"}
          stroke={overhangSeverity === 'danger' ? "hsl(var(--destructive))" : "hsl(30 90% 50%)"}
          strokeWidth={2}
          strokeDasharray="6,4"
          rx={2}
        />
      )}

      {/* Boxes */}
      {arrangement?.positions.map((pos, i) => (
        <g key={i}>
          <rect
            x={padding + pos.x * scale}
            y={padding + pos.y * scale}
            width={pos.w * scale - 2}
            height={pos.h * scale - 2}
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
          {/* Box number */}
          <text
            x={padding + pos.x * scale + (pos.w * scale) / 2}
            y={padding + pos.y * scale + (pos.h * scale) / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={Math.min(10, pos.w * scale / 3)}
            fill="hsl(var(--primary-foreground))"
            fontWeight="bold"
          >
            {i + 1}
          </text>
          {/* Box dimensions on hover (first box only) */}
          {i === 0 && (
            <title>{`${boxLengthIn}" × ${boxWidthIn}"`}</title>
          )}
        </g>
      ))}

      {/* Dimension labels */}
      {showDimensions && (
        <>
          <text
            x={padding + (palletLengthIn * scale) / 2}
            y={viewHeight - 8}
            textAnchor="middle"
            fontSize={11}
            fill="hsl(var(--muted-foreground))"
            fontWeight="500"
          >
            {palletLengthIn}"
          </text>
          <text
            x={12}
            y={padding + (palletWidthIn * scale) / 2}
            textAnchor="middle"
            fontSize={11}
            fill="hsl(var(--muted-foreground))"
            fontWeight="500"
            transform={`rotate(-90, 12, ${padding + (palletWidthIn * scale) / 2})`}
          >
            {palletWidthIn}"
          </text>
        </>
      )}

      {/* Corner labels for overhang */}
      {overhang && overhang.hasOverhang && showDimensions && (
        <>
          {overhang.front > 0 && (
            <text x={padding + (palletLengthIn * scale) / 2} y={padding - 8} textAnchor="middle" fontSize={9} fill="hsl(var(--destructive))">
              +{overhang.front.toFixed(1)}"
            </text>
          )}
          {overhang.left > 0 && (
            <text x={padding - 8} y={padding + (palletWidthIn * scale) / 2} textAnchor="middle" fontSize={9} fill="hsl(var(--destructive))" transform={`rotate(-90, ${padding - 8}, ${padding + (palletWidthIn * scale) / 2})`}>
              +{overhang.left.toFixed(1)}"
            </text>
          )}
        </>
      )}
    </svg>
  );
}
