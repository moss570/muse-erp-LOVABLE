import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProductSizes } from "@/hooks/useProductSizes";
import { generateUPCPair } from "@/lib/upcGenerator";
import { formatUPCForDisplay } from "@/lib/upcUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Wand2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ProductSizesTabProps {
  productId: string;
  requiresUpc?: boolean;
}

export function ProductSizesTab({ productId, requiresUpc = false }: ProductSizesTabProps) {
  const { sizes, createSize, updateSize, deleteSize, isLoading } = useProductSizes(productId);
  const [isAddingSize, setIsAddingSize] = useState(false);
  const [generatingUpc, setGeneratingUpc] = useState<string | null>(null);

  // Form state for new size
  const [newSize, setNewSize] = useState({
    size_name: "",
    size_value: "",
    size_unit_id: "",
    units_per_case: "1",
    case_weight_kg: "",
  });

  // Fetch units of measure
  const { data: units = [] } = useQuery({
    queryKey: ["units-of-measure-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units_of_measure")
        .select("id, name, code")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const handleAddSize = async () => {
    if (!newSize.size_name || !newSize.size_value) {
      toast.error("Size name and value are required");
      return;
    }

    await createSize.mutateAsync({
      product_id: productId,
      size_name: newSize.size_name,
      size_value: parseFloat(newSize.size_value),
      size_unit_id: newSize.size_unit_id || null,
      units_per_case: parseInt(newSize.units_per_case) || 1,
      case_weight_kg: newSize.case_weight_kg ? parseFloat(newSize.case_weight_kg) : null,
      is_default: sizes.length === 0, // First size is default
    });

    setNewSize({
      size_name: "",
      size_value: "",
      size_unit_id: "",
      units_per_case: "1",
      case_weight_kg: "",
    });
    setIsAddingSize(false);
  };

  const handleGenerateUPC = async (sizeId: string) => {
    setGeneratingUpc(sizeId);
    try {
      // Find the size to get units_per_case for packaging indicator lookup
      const size = sizes.find(s => s.id === sizeId);
      const unitsPerCase = size?.units_per_case || 1;
      
      const { tubUpc, caseUpc } = await generateUPCPair(unitsPerCase);
      
      if (!tubUpc) {
        toast.error("GS1 company prefix not configured. Please set it in Company Settings.");
        return;
      }

      await updateSize.mutateAsync({
        id: sizeId,
        upc_code: tubUpc,
        case_upc_code: caseUpc,
      });

      toast.success("UPC codes generated successfully");
    } catch (error) {
      console.error("Failed to generate UPC codes:", error);
      toast.error("Failed to generate UPC codes");
    } finally {
      setGeneratingUpc(null);
    }
  };

  const handleSetDefault = async (sizeId: string) => {
    // First, unset all defaults
    for (const size of sizes) {
      if (size.is_default && size.id !== sizeId) {
        await updateSize.mutateAsync({ id: size.id, is_default: false });
      }
    }
    // Set new default
    await updateSize.mutateAsync({ id: sizeId, is_default: true });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
          <CardHeader>
            <CardTitle>Pack Sizes</CardTitle>
            <CardDescription>
              Configure different pack sizes for this product. Each size can have its own UPC codes.
              {!requiresUpc && (
                <span className="block mt-1 text-xs text-muted-foreground">
                  Note: “Requires UPC” is currently turned off for this product, but you can still generate codes here.
                </span>
              )}
            </CardDescription>
          </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Size Name</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Units/Case</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Tub UPC (12-digit)</TableHead>
                <TableHead>Case UPC (GTIN-14)</TableHead>
                <TableHead>Default</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sizes.map((size) => (
                <TableRow key={size.id}>
                  <TableCell className="font-medium">{size.size_name}</TableCell>
                  <TableCell>
                    {size.size_value} {size.size_unit?.code || ""}
                  </TableCell>
                  <TableCell>{size.units_per_case}</TableCell>
                  <TableCell>
                    {(size as any).sku ? (
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">
                        {(size as any).sku}
                      </code>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {size.upc_code ? (
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">
                        {formatUPCForDisplay(size.upc_code)}
                      </code>
                    ) : (
                      <span className="text-muted-foreground text-sm">Not set</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {size.case_upc_code ? (
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">
                        {formatUPCForDisplay(size.case_upc_code)}
                      </code>
                    ) : (
                      <span className="text-muted-foreground text-sm">Not set</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={size.is_default}
                      onCheckedChange={() => handleSetDefault(size.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleGenerateUPC(size.id)}
                        disabled={generatingUpc === size.id}
                        title="Generate UPC codes"
                      >
                        {generatingUpc === size.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Wand2 className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteSize.mutate(size.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {sizes.length === 0 && !isAddingSize && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No sizes configured. Add a size to get started.
                  </TableCell>
                </TableRow>
              )}

              {isAddingSize && (
                <TableRow>
                  <TableCell>
                    <Input
                      placeholder="e.g., Pint"
                      value={newSize.size_name}
                      onChange={(e) => setNewSize({ ...newSize, size_name: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Value"
                        className="w-20"
                        value={newSize.size_value}
                        onChange={(e) => setNewSize({ ...newSize, size_value: e.target.value })}
                      />
                      <Select
                        value={newSize.size_unit_id || "__none__"}
                        onValueChange={(val) => setNewSize({ ...newSize, size_unit_id: val === "__none__" ? "" : val })}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue placeholder="Unit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {units.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="w-20"
                      value={newSize.units_per_case}
                      onChange={(e) => setNewSize({ ...newSize, units_per_case: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground text-sm">Auto-generated</span>
                  </TableCell>
                  <TableCell colSpan={2}>
                    <span className="text-muted-foreground text-sm">Generate after saving</span>
                  </TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" onClick={handleAddSize}>
                        Add
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setIsAddingSize(false)}>
                        Cancel
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {!isAddingSize && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setIsAddingSize(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Size
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
