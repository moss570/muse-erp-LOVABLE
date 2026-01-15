import { useRef, useState, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Environment } from "@react-three/drei";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { RotateCcw, Layers, Eye } from "lucide-react";

const PALLET_HEIGHT_IN = 6;
const INCH_TO_UNIT = 0.1; // Scale factor for 3D view

interface Pallet3DViewProps {
  ti: number;
  hi: number;
  boxLengthIn: number;
  boxWidthIn: number;
  boxHeightIn: number;
  palletLengthIn: number;
  palletWidthIn: number;
}

function PalletBase({ lengthIn, widthIn }: { lengthIn: number; widthIn: number }) {
  const length = lengthIn * INCH_TO_UNIT;
  const width = widthIn * INCH_TO_UNIT;
  const height = PALLET_HEIGHT_IN * INCH_TO_UNIT;

  return (
    <group position={[0, height / 2, 0]}>
      {/* Main pallet deck */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[length, height * 0.3, width]} />
        <meshStandardMaterial color="#8B7355" roughness={0.8} />
      </mesh>
      {/* Pallet stringers */}
      {[-0.35, 0, 0.35].map((pos, i) => (
        <mesh key={i} position={[0, -height * 0.2, pos * width]} castShadow>
          <boxGeometry args={[length, height * 0.4, width * 0.1]} />
          <meshStandardMaterial color="#6B5344" roughness={0.9} />
        </mesh>
      ))}
      {/* Bottom boards */}
      {[-0.4, 0, 0.4].map((pos, i) => (
        <mesh key={i} position={[pos * length, -height * 0.45, 0]} castShadow>
          <boxGeometry args={[length * 0.15, height * 0.1, width]} />
          <meshStandardMaterial color="#7B6355" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function BoxLayer({ 
  ti, 
  layerIndex, 
  boxLengthIn, 
  boxWidthIn, 
  boxHeightIn, 
  palletLengthIn, 
  palletWidthIn,
  opacity = 1,
  highlighted = false,
}: { 
  ti: number;
  layerIndex: number;
  boxLengthIn: number;
  boxWidthIn: number;
  boxHeightIn: number;
  palletLengthIn: number;
  palletWidthIn: number;
  opacity?: number;
  highlighted?: boolean;
}) {
  const boxL = boxLengthIn * INCH_TO_UNIT;
  const boxW = boxWidthIn * INCH_TO_UNIT;
  const boxH = boxHeightIn * INCH_TO_UNIT;
  const palletH = PALLET_HEIGHT_IN * INCH_TO_UNIT;
  
  // Calculate arrangement
  const cols1 = Math.floor(palletLengthIn / boxLengthIn);
  const rows1 = Math.floor(palletWidthIn / boxWidthIn);
  const fit1 = cols1 * rows1;
  
  const cols2 = Math.floor(palletLengthIn / boxWidthIn);
  const rows2 = Math.floor(palletWidthIn / boxLengthIn);
  const fit2 = cols2 * rows2;
  
  let cols: number, rows: number, actualBoxL: number, actualBoxW: number;
  
  if (fit1 >= ti || fit1 >= fit2) {
    cols = cols1; rows = rows1; actualBoxL = boxL; actualBoxW = boxW;
  } else {
    cols = cols2; rows = rows2; actualBoxL = boxW; actualBoxW = boxL;
  }

  const positions: [number, number, number][] = [];
  let count = 0;
  
  const startX = -(cols * actualBoxL) / 2 + actualBoxL / 2;
  const startZ = -(rows * actualBoxW) / 2 + actualBoxW / 2;
  const yPos = palletH + (layerIndex + 0.5) * boxH;
  
  for (let row = 0; row < rows && count < ti; row++) {
    for (let col = 0; col < cols && count < ti; col++) {
      positions.push([
        startX + col * actualBoxL,
        yPos,
        startZ + row * actualBoxW,
      ]);
      count++;
    }
  }

  const baseColor = layerIndex % 2 === 0 ? "#4A90D9" : "#5BA3E8";
  const color = highlighted ? "#FFD700" : baseColor;

  return (
    <group>
      {positions.map((pos, i) => (
        <mesh key={i} position={pos} castShadow>
          <boxGeometry args={[actualBoxL - 0.02, boxH - 0.01, actualBoxW - 0.02]} />
          <meshStandardMaterial 
            color={color} 
            roughness={0.4} 
            transparent={opacity < 1}
            opacity={opacity}
          />
        </mesh>
      ))}
    </group>
  );
}

function Scene({ 
  ti, 
  hi, 
  boxLengthIn, 
  boxWidthIn, 
  boxHeightIn, 
  palletLengthIn, 
  palletWidthIn,
  exploded,
  highlightedLayer,
  transparency,
}: Pallet3DViewProps & { 
  exploded: boolean; 
  highlightedLayer: number | null;
  transparency: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      // Subtle floating animation
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
    }
  });

  const explodeOffset = exploded ? boxHeightIn * INCH_TO_UNIT * 0.5 : 0;

  return (
    <group ref={groupRef}>
      <PalletBase lengthIn={palletLengthIn} widthIn={palletWidthIn} />
      {Array.from({ length: hi }).map((_, layer) => (
        <group key={layer} position={[0, layer * explodeOffset, 0]}>
          <BoxLayer
            ti={ti}
            layerIndex={layer}
            boxLengthIn={boxLengthIn}
            boxWidthIn={boxWidthIn}
            boxHeightIn={boxHeightIn}
            palletLengthIn={palletLengthIn}
            palletWidthIn={palletWidthIn}
            opacity={highlightedLayer !== null && highlightedLayer !== layer ? transparency : 1}
            highlighted={highlightedLayer === layer}
          />
        </group>
      ))}
    </group>
  );
}

export function Pallet3DView(props: Pallet3DViewProps) {
  const [exploded, setExploded] = useState(false);
  const [highlightedLayer, setHighlightedLayer] = useState<number | null>(null);
  const [transparency, setTransparency] = useState(0.3);

  const toggleExploded = () => setExploded(!exploded);
  
  const cycleHighlight = () => {
    if (highlightedLayer === null) {
      setHighlightedLayer(0);
    } else if (highlightedLayer >= props.hi - 1) {
      setHighlightedLayer(null);
    } else {
      setHighlightedLayer(highlightedLayer + 1);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2 justify-end">
        <Button
          variant={exploded ? "secondary" : "outline"}
          size="sm"
          onClick={toggleExploded}
          className="text-xs"
        >
          <Layers className="h-3 w-3 mr-1" />
          {exploded ? "Collapse" : "Explode"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={cycleHighlight}
          className="text-xs"
        >
          <Eye className="h-3 w-3 mr-1" />
          {highlightedLayer !== null ? `Layer ${highlightedLayer + 1}` : "Highlight"}
        </Button>
      </div>
      
      <div className="w-full h-[280px] rounded-lg border bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 overflow-hidden">
        <Canvas shadows>
          <Suspense fallback={null}>
            <PerspectiveCamera makeDefault position={[8, 6, 8]} fov={45} />
            <OrbitControls 
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              minDistance={3}
              maxDistance={20}
              target={[0, 2, 0]}
            />
            
            {/* Lighting */}
            <ambientLight intensity={0.4} />
            <directionalLight
              position={[10, 15, 10]}
              intensity={1}
              castShadow
              shadow-mapSize-width={1024}
              shadow-mapSize-height={1024}
            />
            <directionalLight position={[-5, 10, -5]} intensity={0.3} />
            
            {/* Ground plane */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
              <planeGeometry args={[20, 20]} />
              <meshStandardMaterial color="#e5e7eb" roughness={0.9} />
            </mesh>
            
            <Scene 
              {...props} 
              exploded={exploded} 
              highlightedLayer={highlightedLayer}
              transparency={transparency}
            />
          </Suspense>
        </Canvas>
      </div>
      
      <p className="text-xs text-muted-foreground text-center">
        Drag to rotate • Scroll to zoom • Shift+drag to pan
      </p>
    </div>
  );
}
