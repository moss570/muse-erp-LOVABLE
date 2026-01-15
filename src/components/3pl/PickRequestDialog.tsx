import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormDialogFooter } from "@/components/ui/form-dialog-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { useCreatePickRequest } from "@/hooks/use3PL";

interface PickRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string;
}

interface PickItem {
  productId: string;
  quantity: number;
  unitType: string;
}

export function PickRequestDialog({
  open,
  onOpenChange,
  locationId,
}: PickRequestDialogProps) {
  const [customerId, setCustomerId] = useState<string>("");
  const [priority, setPriority] = useState<string>("normal");
  const [notes, setNotes] = useState<string>("");
  const [items, setItems] = useState<PickItem[]>([{ productId: "", quantity: 1, unitType: "case" }]);

  const createPickRequest = useCreatePickRequest();

  // Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ["products-for-pick"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, sku")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch customers
  const { data: customers = [] } = useQuery({
    queryKey: ["customers-for-pick"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, code")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const handleAddItem = () => {
    setItems([...items, { productId: "", quantity: 1, unitType: "case" }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof PickItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = () => {
    const validItems = items.filter((item) => item.productId && item.quantity > 0);
    if (validItems.length === 0) return;

    createPickRequest.mutate(
      {
        locationId,
        customerId: customerId || undefined,
        priority,
        notes: notes || undefined,
        items: validItems,
      },
      {
        onSuccess: () => {
          resetForm();
        },
      }
    );
  };

  const resetForm = () => {
    setCustomerId("");
    setPriority("normal");
    setNotes("");
    setItems([{ productId: "", quantity: 1, unitType: "case" }]);
  };

  const canSubmit = items.some((item) => item.productId && item.quantity > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Pick Request</DialogTitle>
          <DialogDescription>
            Create a new pick request for products at this 3PL location
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Customer Selection */}
          <div className="space-y-2">
            <Label>Customer (Optional)</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select customer..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No customer</SelectItem>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name} ({customer.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
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

          {/* Items */}
          <div className="space-y-2">
            <Label>Products to Pick</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {items.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Select
                    value={item.productId}
                    onValueChange={(v) => handleItemChange(index, "productId", v)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select product..." />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, "quantity", parseInt(e.target.value) || 1)}
                    className="w-20"
                  />
                  <Select
                    value={item.unitType}
                    onValueChange={(v) => handleItemChange(index, "unitType", v)}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="case">Cases</SelectItem>
                      <SelectItem value="pallet">Pallets</SelectItem>
                    </SelectContent>
                  </Select>
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
              <Plus className="h-4 w-4 mr-1" />
              Add Product
            </Button>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Special instructions..."
              rows={2}
            />
          </div>
        </div>

        <FormDialogFooter
          onClose={() => onOpenChange(false)}
          onSave={handleSubmit}
          onSaveAndClose={() => {
            const validItems = items.filter((item) => item.productId && item.quantity > 0);
            if (validItems.length === 0) return;
            createPickRequest.mutate(
              {
                locationId,
                customerId: customerId || undefined,
                priority,
                notes: notes || undefined,
                items: validItems,
              },
              {
                onSuccess: () => {
                  resetForm();
                  onOpenChange(false);
                },
              }
            );
          }}
          isSaving={createPickRequest.isPending}
          disabled={!canSubmit}
          saveLabel="Create Pick Request"
          saveAndCloseLabel="Create & Close"
        />
      </DialogContent>
    </Dialog>
  );
}