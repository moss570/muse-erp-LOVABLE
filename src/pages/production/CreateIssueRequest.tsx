import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowRightLeft, 
  Plus, 
  Trash2, 
  Lightbulb
} from "lucide-react";
import { format, addHours } from "date-fns";

interface RequestItem {
  id: string;
  materialId: string;
  materialName: string;
  quantityRequested: number;
  usageUnitId: string;
  usageUnitCode: string;
  purchaseUnitId: string;
  purchaseUnitCode: string;
  conversionFactor: number;
  wholePurchaseUnits: number;
  disassembleRequired: boolean;
  disassembleQuantity: number;
  remainingAfterUse: number;
  availableInventory: number;
  sufficient: boolean;
}

const CreateIssueRequest = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const batchId = searchParams.get('batch');

  const [items, setItems] = useState<RequestItem[]>([]);
  const [deliveryLocationId, setDeliveryLocationId] = useState("");
  const [neededBy, setNeededBy] = useState(
    format(addHours(new Date(), 2), "yyyy-MM-dd'T'HH:mm")
  );
  const [priority, setPriority] = useState("normal");
  const [notes, setNotes] = useState("");
  const [selectedMaterialId, setSelectedMaterialId] = useState("");

  // Fetch materials
  const { data: materials } = useQuery({
    queryKey: ['materials-for-issue'],
    queryFn: async () => {
      const { data } = await supabase
        .from('materials')
        .select(`
          *,
          base_unit:units_of_measure!materials_base_unit_id_fkey(id, code, name),
          usage_unit:units_of_measure!materials_usage_unit_id_fkey(id, code, name)
        `)
        .eq('is_active', true)
        .order('name');
      return data;
    }
  });

  // Fetch production locations
  const { data: locations } = useQuery({
    queryKey: ['production-locations'],
    queryFn: async () => {
      const { data } = await supabase
        .from('locations')
        .select('*')
        .in('location_type', ['production', 'production_floor'])
        .eq('is_active', true);
      return data;
    }
  });

  // Fetch batch recipe if linked
  const { data: batchRecipe } = useQuery({
    queryKey: ['batch-recipe', batchId],
    queryFn: async () => {
      if (!batchId) return null;
      const { data } = await supabase
        .from('production_lots')
        .select(`
          *,
          recipe:product_recipes(
            *,
            ingredients:product_recipe_items(
              material_id,
              quantity,
              unit_id,
              material:materials(name, code)
            )
          )
        `)
        .eq('id', batchId)
        .single();
      return data;
    },
    enabled: !!batchId
  });

  // Calculate breakdown for a material
  const createItemFromMaterial = (material: any, quantity: number): RequestItem | null => {
    if (!material) return null;

    const conversionFactor = material.usage_unit_conversion || 1;
    const totalPurchaseUnits = quantity / conversionFactor;
    const wholePurchaseUnits = Math.floor(totalPurchaseUnits);
    const fractionalPart = totalPurchaseUnits - wholePurchaseUnits;
    const disassembleRequired = fractionalPart > 0;
    const disassembleQuantity = disassembleRequired ? conversionFactor : 0;
    const remainingAfterUse = disassembleRequired 
      ? conversionFactor - (quantity % conversionFactor)
      : 0;

    return {
      id: crypto.randomUUID(),
      materialId: material.id,
      materialName: material.name,
      quantityRequested: quantity,
      usageUnitId: material.usage_unit?.id || material.base_unit?.id,
      usageUnitCode: material.usage_unit?.code || material.base_unit?.code || 'ea',
      purchaseUnitId: material.base_unit?.id,
      purchaseUnitCode: material.base_unit?.code || 'ea',
      conversionFactor,
      wholePurchaseUnits,
      disassembleRequired,
      disassembleQuantity,
      remainingAfterUse,
      availableInventory: 0,
      sufficient: true
    };
  };

  // Auto-populate from recipe
  useEffect(() => {
    if (batchRecipe?.recipe?.ingredients && items.length === 0 && materials) {
      const recipeItems: RequestItem[] = batchRecipe.recipe.ingredients
        .map((ing: any) => {
          const material = materials?.find(m => m.id === ing.material_id);
          return createItemFromMaterial(material, ing.quantity);
        })
        .filter(Boolean) as RequestItem[];
      setItems(recipeItems);
    }
  }, [batchRecipe, materials, items.length]);

  // Add material to request
  const addMaterial = () => {
    const material = materials?.find(m => m.id === selectedMaterialId);
    if (!material) return;

    const newItem = createItemFromMaterial(material, 0);
    if (newItem) {
      setItems([...items, newItem]);
      setSelectedMaterialId("");
    }
  };

  // Update item quantity
  const updateItemQuantity = (itemId: string, quantity: number) => {
    setItems(items.map(item => {
      if (item.id !== itemId) return item;

      const totalPurchaseUnits = quantity / item.conversionFactor;
      const wholePurchaseUnits = Math.floor(totalPurchaseUnits);
      const fractionalPart = totalPurchaseUnits - wholePurchaseUnits;
      const disassembleRequired = fractionalPart > 0;
      const disassembleQuantity = disassembleRequired ? item.conversionFactor : 0;
      const remainingAfterUse = disassembleRequired 
        ? item.conversionFactor - (quantity % item.conversionFactor)
        : 0;

      return {
        ...item,
        quantityRequested: quantity,
        wholePurchaseUnits,
        disassembleRequired,
        disassembleQuantity,
        remainingAfterUse
      };
    }));
  };

  // Remove item
  const removeItem = (itemId: string) => {
    setItems(items.filter(i => i.id !== itemId));
  };

  // Submit request
  const submitMutation = useMutation({
    mutationFn: async () => {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      // Create request header - let database generate request_number via trigger
      const insertData: any = {
        requested_by: userId,
        needed_by: neededBy,
        priority,
        notes,
        status: 'pending'
      };
      
      if (batchId) insertData.production_batch_id = batchId;
      if (deliveryLocationId) insertData.delivery_location_id = deliveryLocationId;

      const { data: request, error: reqError } = await supabase
        .from('production_issue_requests')
        .insert(insertData)
        .select()
        .single();

      if (reqError) throw reqError;

      // Create line items
      const lineItems = items.map((item, index) => ({
        issue_request_id: request.id,
        material_id: item.materialId,
        quantity_requested: item.quantityRequested,
        usage_unit_id: item.usageUnitId,
        quantity_purchase_uom: item.wholePurchaseUnits,
        purchase_unit_id: item.purchaseUnitId,
        disassemble_required: item.disassembleRequired,
        disassemble_quantity: item.disassembleQuantity,
        remaining_after_use: item.remainingAfterUse,
        sort_order: index
      }));

      const { error: itemsError } = await supabase
        .from('production_issue_request_items')
        .insert(lineItems);

      if (itemsError) throw itemsError;

      return request;
    },
    onSuccess: (request) => {
      toast({
        title: "Request Created",
        description: `Issue request ${request.request_number} has been submitted.`
      });
      queryClient.invalidateQueries({ queryKey: ['pending-issue-requests'] });
      navigate('/production/issue-requests');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <ArrowRightLeft className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-bold">Create Issue Request</h1>
        {batchRecipe && (
          <Badge variant="secondary">Linked to Batch #{batchRecipe.lot_number}</Badge>
        )}
      </div>

      {/* Request Details */}
      <Card>
        <CardHeader>
          <CardTitle>Request Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Delivery Location *</Label>
            <Select value={deliveryLocationId} onValueChange={setDeliveryLocationId}>
              <SelectTrigger>
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {locations?.map(loc => (
                  <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Needed By *</Label>
            <Input
              type="datetime-local"
              value={neededBy}
              onChange={(e) => setNeededBy(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Add Material */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Materials
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Select value={selectedMaterialId} onValueChange={setSelectedMaterialId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select material to add" />
              </SelectTrigger>
              <SelectContent>
                {materials?.filter(m => !items.find(i => i.materialId === m.id)).map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.name} ({m.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={addMaterial} disabled={!selectedMaterialId}>
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>

          {/* Items Table */}
          {items.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Quantity Needed</TableHead>
                  <TableHead>Sealed Units</TableHead>
                  <TableHead>Disassemble</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.materialName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={item.quantityRequested || ''}
                          onChange={(e) => updateItemQuantity(item.id, Number(e.target.value))}
                          className="w-24"
                        />
                        <span className="text-muted-foreground">{item.usageUnitCode}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {item.wholePurchaseUnits} × {item.purchaseUnitCode}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.disassembleRequired ? (
                        <Badge variant="secondary">
                          + Open 1 {item.purchaseUnitCode}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.remainingAfterUse > 0 && (
                        <span className="text-sm text-muted-foreground">
                          {item.remainingAfterUse.toFixed(1)} {item.usageUnitCode} stays in production
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {items.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No materials added. Select a material above to add.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Smart Calculator Info */}
      {items.some(i => i.disassembleRequired) && (
        <Alert>
          <Lightbulb className="h-4 w-4" />
          <AlertDescription>
            Smart Breakdown: Some materials require opening a sealed unit.
            The remaining quantity will stay in the production area for future use.
          </AlertDescription>
        </Alert>
      )}

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes for warehouse..."
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Cancel
        </Button>
        <Button
          onClick={() => submitMutation.mutate()}
          disabled={items.length === 0 || !deliveryLocationId || submitMutation.isPending}
        >
          Submit Request
        </Button>
      </div>
    </div>
  );
};

export default CreateIssueRequest;
