import { useState, useCallback, useRef, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  useSensor,
  useSensors,
  PointerSensor,
  DragOverlay,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import {
  Type,
  QrCode,
  Image,
  Calendar,
  Hash,
  GripVertical,
  Trash2,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import JsBarcode from 'jsbarcode';

interface LabelElement {
  id: string;
  type: 'text' | 'barcode' | 'image' | 'field' | 'date';
  x: number; // percentage
  y: number; // percentage
  width: number; // percentage
  height: number; // percentage
  content: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  textAlign?: 'left' | 'center' | 'right';
  barcodeType?: string;
  fieldKey?: string;
}

interface LabelDesignerProps {
  widthInches: number;
  heightInches: number;
  elements: LabelElement[];
  onChange: (elements: LabelElement[]) => void;
  barcodeType?: string;
}

const FIELD_OPTIONS = [
  { value: 'lot_number', label: 'Lot Number', icon: Hash },
  { value: 'internal_lot_number', label: 'Internal Lot', icon: Hash },
  { value: 'material_name', label: 'Material Name', icon: Type },
  { value: 'material_code', label: 'Material Code', icon: Hash },
  { value: 'supplier_name', label: 'Supplier Name', icon: Type },
  { value: 'quantity', label: 'Quantity', icon: Hash },
  { value: 'unit', label: 'Unit', icon: Type },
  { value: 'expiry_date', label: 'Expiry Date', icon: Calendar },
  { value: 'received_date', label: 'Received Date', icon: Calendar },
  { value: 'location', label: 'Location', icon: Type },
  { value: 'allergens', label: 'Allergens', icon: Type },
  { value: 'product_name', label: 'Product Name', icon: Type },
  { value: 'product_sku', label: 'Product SKU', icon: Hash },
  { value: 'pallet_number', label: 'Pallet Number', icon: Hash },
];

const PALETTE_ITEMS = [
  { type: 'text', label: 'Text', icon: Type },
  { type: 'field', label: 'Data Field', icon: Hash },
  { type: 'barcode', label: 'Barcode', icon: QrCode },
  { type: 'image', label: 'Logo/Image', icon: Image },
  { type: 'date', label: 'Date', icon: Calendar },
];

function DraggableElement({
  element,
  onSelect,
  isSelected,
  onDelete,
  scale,
}: {
  element: LabelElement;
  onSelect: () => void;
  isSelected: boolean;
  onDelete: () => void;
  scale: number;
}) {
  const barcodeRef = useRef<SVGSVGElement>(null);
  
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: element.id,
  });

  useEffect(() => {
    if (element.type === 'barcode' && barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, element.content || '123456789', {
          format: element.barcodeType || 'CODE128',
          width: 2,
          height: 40,
          displayValue: true,
          fontSize: 10,
          margin: 2,
        });
      } catch {
        // Invalid barcode format, show placeholder
      }
    }
  }, [element.type, element.content, element.barcodeType]);

  const style = {
    left: `${element.x}%`,
    top: `${element.y}%`,
    width: `${element.width}%`,
    minHeight: `${element.height}%`,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'absolute cursor-move border-2 border-transparent rounded p-1 transition-colors',
        isSelected && 'border-primary bg-primary/5',
        isDragging && 'shadow-lg'
      )}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      {...listeners}
      {...attributes}
    >
      <div className="flex items-center gap-1">
        <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab flex-shrink-0" />
        <div className="flex-1 overflow-hidden">
          {element.type === 'text' && (
            <span
              style={{
                fontSize: (element.fontSize || 12) * scale,
                fontWeight: element.fontWeight || 'normal',
                textAlign: element.textAlign || 'left',
              }}
              className="block truncate"
            >
              {element.content || 'Text'}
            </span>
          )}
          {element.type === 'field' && (
            <Badge variant="secondary" className="text-xs">
              {`{{${element.fieldKey || 'field'}}}`}
            </Badge>
          )}
          {element.type === 'barcode' && (
            <svg ref={barcodeRef} className="w-full h-auto max-h-12" />
          )}
          {element.type === 'image' && (
            <div className="flex items-center justify-center h-10 bg-muted rounded text-xs text-muted-foreground">
              <Image className="h-4 w-4 mr-1" />
              Logo
            </div>
          )}
          {element.type === 'date' && (
            <Badge variant="outline" className="text-xs">
              {element.content || new Date().toLocaleDateString()}
            </Badge>
          )}
        </div>
        {isSelected && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function LabelDesigner({
  widthInches,
  heightInches,
  elements,
  onChange,
  barcodeType = 'CODE128',
}: LabelDesignerProps) {
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [draggedPaletteItem, setDraggedPaletteItem] = useState<string | null>(null);
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Calculate scale for rendering (100 DPI base)
  const DPI = 100;
  const canvasWidth = widthInches * DPI;
  const canvasHeight = heightInches * DPI;
  const scale = Math.min(400 / canvasWidth, 300 / canvasHeight, 1);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const addElement = useCallback(
    (type: string, x: number, y: number) => {
      const newElement: LabelElement = {
        id: `el-${Date.now()}`,
        type: type as LabelElement['type'],
        x,
        y,
        width: type === 'barcode' ? 60 : 30,
        height: type === 'barcode' ? 20 : 10,
        content: type === 'text' ? 'Sample Text' : type === 'date' ? 'MM/DD/YYYY' : '',
        fontSize: 12,
        fontWeight: 'normal',
        textAlign: 'left',
        barcodeType: type === 'barcode' ? barcodeType : undefined,
        fieldKey: type === 'field' ? 'lot_number' : undefined,
      };
      onChange([...elements, newElement]);
      setSelectedElement(newElement.id);
    },
    [elements, onChange, barcodeType]
  );

  const updateElement = useCallback(
    (id: string, updates: Partial<LabelElement>) => {
      onChange(elements.map((el) => (el.id === id ? { ...el, ...updates } : el)));
    },
    [elements, onChange]
  );

  const deleteElement = useCallback(
    (id: string) => {
      onChange(elements.filter((el) => el.id !== id));
      if (selectedElement === id) {
        setSelectedElement(null);
        setPropertiesOpen(false);
      }
    },
    [elements, onChange, selectedElement]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (String(active.id).startsWith('palette-')) {
      setDraggedPaletteItem(String(active.id).replace('palette-', ''));
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    setDraggedPaletteItem(null);

    const activeId = String(active.id);

    // Dropping from palette - skip for now, we use button clicks instead
    if (activeId.startsWith('palette-')) {
      return;
    }

    // Moving existing element - update position based on delta
    const element = elements.find((el) => el.id === activeId);
    if (element && canvasRef.current && (delta.x !== 0 || delta.y !== 0)) {
      const rect = canvasRef.current.getBoundingClientRect();
      const newX = Math.max(0, Math.min(100 - element.width, element.x + (delta.x / rect.width) * 100));
      const newY = Math.max(0, Math.min(100 - element.height, element.y + (delta.y / rect.height) * 100));
      updateElement(activeId, { x: newX, y: newY });
    }
  };

  const selectedEl = elements.find((el) => el.id === selectedElement);

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 h-full">
        {/* Palette */}
        <div className="w-48 border rounded-lg p-3 bg-card">
          <h4 className="font-medium mb-3 text-sm">Elements</h4>
          <div className="space-y-2">
            {PALETTE_ITEMS.map((item) => (
              <Button
                key={item.type}
                type="button"
                variant="outline"
                className="w-full justify-start text-sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  addElement(item.type, 10, 10 + elements.length * 15);
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <item.icon className="h-4 w-4 mr-2" />
                {item.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              Label Size: {widthInches}" × {heightInches}"
            </span>
            {selectedElement && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setPropertiesOpen(true);
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <Settings className="h-4 w-4 mr-1" />
                Properties
              </Button>
            )}
          </div>
          <div
            ref={canvasRef}
            id="canvas"
            className="relative border-2 border-dashed rounded-lg bg-white mx-auto"
            style={{
              width: canvasWidth * scale,
              height: canvasHeight * scale,
            }}
            onClick={() => {
              setSelectedElement(null);
              setPropertiesOpen(false);
            }}
          >
            {elements.map((element) => (
              <DraggableElement
                key={element.id}
                element={element}
                isSelected={selectedElement === element.id}
                onSelect={() => {
                  setSelectedElement(element.id);
                }}
                onDelete={() => deleteElement(element.id)}
                scale={scale}
              />
            ))}
            {elements.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                Click elements from palette to add
              </div>
            )}
          </div>
        </div>

        {/* Properties Panel */}
        <Sheet open={propertiesOpen} onOpenChange={setPropertiesOpen}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Element Properties</SheetTitle>
            </SheetHeader>
            {selectedEl && (
              <ScrollArea className="h-full pr-4 mt-4">
                <div className="space-y-4">
                  {(selectedEl.type === 'text' || selectedEl.type === 'date') && (
                    <>
                      <div className="space-y-2">
                        <Label>Content</Label>
                        <Input
                          value={selectedEl.content}
                          onChange={(e) =>
                            updateElement(selectedEl.id, { content: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Font Size</Label>
                        <Input
                          type="number"
                          value={selectedEl.fontSize || 12}
                          onChange={(e) =>
                            updateElement(selectedEl.id, {
                              fontSize: parseInt(e.target.value) || 12,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Font Weight</Label>
                        <Select
                          value={selectedEl.fontWeight || 'normal'}
                          onValueChange={(value) =>
                            updateElement(selectedEl.id, {
                              fontWeight: value as 'normal' | 'bold',
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="bold">Bold</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Text Align</Label>
                        <Select
                          value={selectedEl.textAlign || 'left'}
                          onValueChange={(value) =>
                            updateElement(selectedEl.id, {
                              textAlign: value as 'left' | 'center' | 'right',
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="left">Left</SelectItem>
                            <SelectItem value="center">Center</SelectItem>
                            <SelectItem value="right">Right</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {selectedEl.type === 'field' && (
                    <div className="space-y-2">
                      <Label>Data Field</Label>
                      <Select
                        value={selectedEl.fieldKey || 'lot_number'}
                        onValueChange={(value) =>
                          updateElement(selectedEl.id, { fieldKey: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FIELD_OPTIONS.map((field) => (
                            <SelectItem key={field.value} value={field.value}>
                              {field.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {selectedEl.type === 'barcode' && (
                    <>
                      <div className="space-y-2">
                        <Label>Barcode Data Field</Label>
                        <Select
                          value={selectedEl.fieldKey || 'lot_number'}
                          onValueChange={(value) =>
                            updateElement(selectedEl.id, {
                              fieldKey: value,
                              content: value, // For preview
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FIELD_OPTIONS.filter((f) =>
                              ['lot_number', 'internal_lot_number', 'material_code', 'product_sku', 'pallet_number'].includes(f.value)
                            ).map((field) => (
                              <SelectItem key={field.value} value={field.value}>
                                {field.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Sample Value (for preview)</Label>
                        <Input
                          value={selectedEl.content}
                          onChange={(e) =>
                            updateElement(selectedEl.id, { content: e.target.value })
                          }
                          placeholder="123456789"
                        />
                      </div>
                    </>
                  )}

                  {/* Position */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label>X Position (%)</Label>
                      <Input
                        type="number"
                        value={Math.round(selectedEl.x)}
                        onChange={(e) =>
                          updateElement(selectedEl.id, {
                            x: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)),
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Y Position (%)</Label>
                      <Input
                        type="number"
                        value={Math.round(selectedEl.y)}
                        onChange={(e) =>
                          updateElement(selectedEl.id, {
                            y: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)),
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Width (%)</Label>
                      <Input
                        type="number"
                        value={Math.round(selectedEl.width)}
                        onChange={(e) =>
                          updateElement(selectedEl.id, {
                            width: Math.max(5, Math.min(100, parseInt(e.target.value) || 20)),
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Height (%)</Label>
                      <Input
                        type="number"
                        value={Math.round(selectedEl.height)}
                        onChange={(e) =>
                          updateElement(selectedEl.id, {
                            height: Math.max(5, Math.min(100, parseInt(e.target.value) || 10)),
                          })
                        }
                      />
                    </div>
                  </div>

                  <Button
                    variant="destructive"
                    className="w-full mt-4"
                    onClick={() => deleteElement(selectedEl.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Element
                  </Button>
                </div>
              </ScrollArea>
            )}
          </SheetContent>
        </Sheet>
      </div>

      <DragOverlay>
        {draggedPaletteItem && (
          <div className="bg-primary text-primary-foreground px-3 py-1 rounded shadow-lg">
            {PALETTE_ITEMS.find((i) => i.type === draggedPaletteItem)?.label}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
