import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PALLET_HEIGHT_IN = 6;

interface PalletSideViewsProps {
  ti: number;
  hi: number;
  boxLengthIn: number;
  boxWidthIn: number;
  boxHeightIn: number;
  palletLengthIn: number;
  palletWidthIn: number;
}

type ViewDirection = 'front' | 'back' | 'left' | 'right';

function SideViewSVG({ 
  viewWidth,
  viewHeight,
  hi,
  boxHeightIn,
  palletDimensionIn,
  direction,
}: {
  viewWidth: number;
  viewHeight: number;
  hi: number;
  boxHeightIn: number;
  palletDimensionIn: number;
  direction: ViewDirection;
}) {
  const padding = 25;
  const totalStackHeight = PALLET_HEIGHT_IN + (hi * boxHeightIn);
  
  const scale = Math.min(
    (viewWidth - padding * 2) / palletDimensionIn,
    (viewHeight - padding * 2) / totalStackHeight
  );

  const isReversed = direction === 'back' || direction === 'right';

  return (
    <svg 
      width={viewWidth} 
      height={viewHeight} 
      viewBox={`0 0 ${viewWidth} ${viewHeight}`}
      className="border rounded bg-muted/30"
    >
      {/* Ground line */}
      <line
        x1={padding - 10}
        y1={viewHeight - padding}
        x2={viewWidth - padding + 10}
        y2={viewHeight - padding}
        stroke="hsl(var(--border))"
        strokeWidth={2}
      />

      {/* Pallet base */}
      <rect
        x={padding}
        y={viewHeight - padding - PALLET_HEIGHT_IN * scale}
        width={palletDimensionIn * scale}
        height={PALLET_HEIGHT_IN * scale}
        fill="hsl(35 30% 40%)"
        stroke="hsl(var(--border))"
        strokeWidth={1.5}
        rx={1}
      />

      {/* Pallet slats on base */}
      <line
        x1={padding}
        y1={viewHeight - padding - PALLET_HEIGHT_IN * scale / 2}
        x2={padding + palletDimensionIn * scale}
        y2={viewHeight - padding - PALLET_HEIGHT_IN * scale / 2}
        stroke="hsl(35 20% 30%)"
        strokeWidth={1}
      />

      {/* Stack layers */}
      {Array.from({ length: hi }).map((_, layer) => {
        const layerIndex = isReversed ? hi - 1 - layer : layer;
        const yPos = viewHeight - padding - PALLET_HEIGHT_IN * scale - (layer + 1) * boxHeightIn * scale;
        
        return (
          <g key={layer}>
            <rect
              x={padding}
              y={yPos}
              width={palletDimensionIn * scale}
              height={boxHeightIn * scale - 1}
              fill={layerIndex % 2 === 0 ? "hsl(var(--primary) / 0.8)" : "hsl(var(--primary) / 0.6)"}
              stroke="hsl(var(--primary))"
              strokeWidth={1}
              rx={1}
            />
            {/* Layer separator line */}
            <line
              x1={padding + 2}
              y1={yPos + boxHeightIn * scale / 2}
              x2={padding + palletDimensionIn * scale - 2}
              y2={yPos + boxHeightIn * scale / 2}
              stroke="hsl(var(--primary) / 0.3)"
              strokeWidth={0.5}
              strokeDasharray="2,2"
            />
          </g>
        );
      })}

      {/* Layer labels */}
      {Array.from({ length: hi }).map((_, layer) => (
        <text
          key={layer}
          x={viewWidth - padding + 8}
          y={viewHeight - padding - PALLET_HEIGHT_IN * scale - (layer + 0.5) * boxHeightIn * scale}
          textAnchor="start"
          dominantBaseline="middle"
          fontSize={9}
          fill="hsl(var(--muted-foreground))"
        >
          L{layer + 1}
        </text>
      ))}

      {/* Height dimension line */}
      <line
        x1={padding - 12}
        y1={viewHeight - padding}
        x2={padding - 12}
        y2={viewHeight - padding - totalStackHeight * scale}
        stroke="hsl(var(--muted-foreground))"
        strokeWidth={1}
      />
      <line
        x1={padding - 16}
        y1={viewHeight - padding}
        x2={padding - 8}
        y2={viewHeight - padding}
        stroke="hsl(var(--muted-foreground))"
        strokeWidth={1}
      />
      <line
        x1={padding - 16}
        y1={viewHeight - padding - totalStackHeight * scale}
        x2={padding - 8}
        y2={viewHeight - padding - totalStackHeight * scale}
        stroke="hsl(var(--muted-foreground))"
        strokeWidth={1}
      />
      <text
        x={padding - 18}
        y={viewHeight - padding - (totalStackHeight * scale) / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={9}
        fill="hsl(var(--muted-foreground))"
        transform={`rotate(-90, ${padding - 18}, ${viewHeight - padding - (totalStackHeight * scale) / 2})`}
      >
        {totalStackHeight.toFixed(1)}"
      </text>

      {/* Width dimension */}
      <text
        x={padding + (palletDimensionIn * scale) / 2}
        y={viewHeight - 5}
        textAnchor="middle"
        fontSize={10}
        fill="hsl(var(--muted-foreground))"
      >
        {palletDimensionIn}"
      </text>

      {/* View direction label */}
      <text
        x={viewWidth / 2}
        y={12}
        textAnchor="middle"
        fontSize={10}
        fill="hsl(var(--muted-foreground))"
        fontWeight="500"
      >
        {direction.charAt(0).toUpperCase() + direction.slice(1)} View
      </text>
    </svg>
  );
}

export function PalletSideViews({
  ti,
  hi,
  boxLengthIn,
  boxWidthIn,
  boxHeightIn,
  palletLengthIn,
  palletWidthIn,
}: PalletSideViewsProps) {
  const [activeView, setActiveView] = useState<ViewDirection>('front');
  const viewWidth = 300;
  const viewHeight = 200;

  return (
    <div className="space-y-2">
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as ViewDirection)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="front" className="text-xs">Front</TabsTrigger>
          <TabsTrigger value="back" className="text-xs">Back</TabsTrigger>
          <TabsTrigger value="left" className="text-xs">Left</TabsTrigger>
          <TabsTrigger value="right" className="text-xs">Right</TabsTrigger>
        </TabsList>
        
        <TabsContent value="front" className="flex justify-center mt-2">
          <SideViewSVG
            viewWidth={viewWidth}
            viewHeight={viewHeight}
            hi={hi}
            boxHeightIn={boxHeightIn}
            palletDimensionIn={palletLengthIn}
            direction="front"
          />
        </TabsContent>
        
        <TabsContent value="back" className="flex justify-center mt-2">
          <SideViewSVG
            viewWidth={viewWidth}
            viewHeight={viewHeight}
            hi={hi}
            boxHeightIn={boxHeightIn}
            palletDimensionIn={palletLengthIn}
            direction="back"
          />
        </TabsContent>
        
        <TabsContent value="left" className="flex justify-center mt-2">
          <SideViewSVG
            viewWidth={viewWidth}
            viewHeight={viewHeight}
            hi={hi}
            boxHeightIn={boxHeightIn}
            palletDimensionIn={palletWidthIn}
            direction="left"
          />
        </TabsContent>
        
        <TabsContent value="right" className="flex justify-center mt-2">
          <SideViewSVG
            viewWidth={viewWidth}
            viewHeight={viewHeight}
            hi={hi}
            boxHeightIn={boxHeightIn}
            palletDimensionIn={palletWidthIn}
            direction="right"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
