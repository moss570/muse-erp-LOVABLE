import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Loader2, Beaker, Palette, Snowflake, Package } from "lucide-react";
import { useCreateWorkOrder, useUpdateWorkOrder, useApprovedLotsForWorkOrder, type WorkOrderType } from "@/hooks/useWorkOrders";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

const formSchema = z.object({
  work_order_type: z.enum(["base", "flavoring", "freezing", "case_pack"]),
  product_id: z.string().optional(),
  target_quantity: z.number().min(0.01, "Quantity must be greater than 0"),
  unit_id: z.string().optional(),
  scheduled_date: z.string().min(1, "Scheduled date is required"),
  scheduled_start_time: z.string().optional(),
  estimated_duration_hours: z.number().optional(),
  deadline: z.string().optional(),
  machine_id: z.string().optional(),
  priority: z.number().min(1).max(10).default(5),
  source_production_lot_id: z.string().optional(),
  quantity_to_consume: z.number().optional(),
  customer_id: z.string().optional(),
  sales_order_reference: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface WorkOrderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrder?: any;
  defaultType?: WorkOrderType;
}

const typeIcons: Record<WorkOrderType, React.ReactNode> = {
  base: <Beaker className="h-4 w-4" />,
  flavoring: <Palette className="h-4 w-4" />,
  freezing: <Snowflake className="h-4 w-4" />,
  case_pack: <Package className="h-4 w-4" />,
};

export function WorkOrderFormDialog({
  open,
  onOpenChange,
  workOrder,
  defaultType = "base",
}: WorkOrderFormDialogProps) {
  const [activeTab, setActiveTab] = useState("basic");
  const createWorkOrder = useCreateWorkOrder();
  const updateWorkOrder = useUpdateWorkOrder();
  const isEditing = !!workOrder;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      work_order_type: defaultType,
      target_quantity: 0,
      priority: 5,
      scheduled_date: format(new Date(), "yyyy-MM-dd"),
    },
  });

  const selectedType = form.watch("work_order_type");
  const needsSourceLot = selectedType !== "base";

  // Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ["products-for-wo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, sku, is_active")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch machines
  const { data: machines = [] } = useQuery({
    queryKey: ["machines-for-wo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("machines")
        .select("id, name, machine_number, is_active")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch units
  const { data: units = [] } = useQuery({
    queryKey: ["units-for-wo"],
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

  // Fetch customers
  const { data: customers = [] } = useQuery({
    queryKey: ["customers-for-wo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, code, is_active")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch approved source lots based on type
  const sourceStage = selectedType === "flavoring" ? "base" : "flavoring";
  const { data: sourceLots = [] } = useApprovedLotsForWorkOrder(
    needsSourceLot ? sourceStage : "base"
  );

  // Populate form when editing
  useEffect(() => {
    if (workOrder) {
      form.reset({
        work_order_type: workOrder.work_order_type,
        product_id: workOrder.product_id || undefined,
        target_quantity: workOrder.target_quantity,
        unit_id: workOrder.unit_id || undefined,
        scheduled_date: workOrder.scheduled_date,
        scheduled_start_time: workOrder.scheduled_start_time || undefined,
        estimated_duration_hours: workOrder.estimated_duration_hours || undefined,
        deadline: workOrder.deadline || undefined,
        machine_id: workOrder.machine_id || undefined,
        priority: workOrder.priority || 5,
        source_production_lot_id: workOrder.source_production_lot_id || undefined,
        quantity_to_consume: workOrder.quantity_to_consume || undefined,
        customer_id: workOrder.customer_id || undefined,
        sales_order_reference: workOrder.sales_order_reference || undefined,
        notes: workOrder.notes || undefined,
      });
    } else {
      form.reset({
        work_order_type: defaultType,
        target_quantity: 0,
        priority: 5,
        scheduled_date: format(new Date(), "yyyy-MM-dd"),
      });
    }
  }, [workOrder, defaultType, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEditing) {
        await updateWorkOrder.mutateAsync({
          id: workOrder.id,
          ...values,
        } as any);
      } else {
        await createWorkOrder.mutateAsync(values as any);
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isSubmitting = createWorkOrder.isPending || updateWorkOrder.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {typeIcons[selectedType]}
            {isEditing ? "Edit Work Order" : "Create Work Order"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? `Editing work order ${workOrder.work_order_number}`
              : "Schedule a new production work order"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="scheduling">Scheduling</TabsTrigger>
                <TabsTrigger value="tracking">Tracking</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 pt-4">
                {/* Work Order Type */}
                <FormField
                  control={form.control}
                  name="work_order_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Work Order Type</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isEditing}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="base">
                            <div className="flex items-center gap-2">
                              <Beaker className="h-4 w-4" /> Base Manufacturing
                            </div>
                          </SelectItem>
                          <SelectItem value="flavoring">
                            <div className="flex items-center gap-2">
                              <Palette className="h-4 w-4" /> Flavoring
                            </div>
                          </SelectItem>
                          <SelectItem value="freezing">
                            <div className="flex items-center gap-2">
                              <Snowflake className="h-4 w-4" /> Freezing
                            </div>
                          </SelectItem>
                          <SelectItem value="case_pack">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4" /> Case Pack
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Source Lot (for non-base types) */}
                {needsSourceLot && (
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="source_production_lot_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Source Lot (Approved {sourceStage})</FormLabel>
                          <Select value={field.value || ""} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select source lot" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {sourceLots.map((lot: any) => (
                                <SelectItem key={lot.id} value={lot.id}>
                                  {lot.lot_number} ({lot.quantity_available} available)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="quantity_to_consume"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity to Consume</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Product */}
                <FormField
                  control={form.control}
                  name="product_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product</FormLabel>
                      <Select value={field.value || ""} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} ({product.sku})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Quantity and Unit */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="target_quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Quantity</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="unit_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit</FormLabel>
                        <Select value={field.value || ""} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {units.map((unit) => (
                              <SelectItem key={unit.id} value={unit.id}>
                                {unit.name} ({unit.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Machine */}
                <FormField
                  control={form.control}
                  name="machine_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Machine</FormLabel>
                      <Select value={field.value || ""} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select machine" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {machines.map((machine) => (
                            <SelectItem key={machine.id} value={machine.id}>
                              {machine.name} ({machine.machine_number})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="scheduling" className="space-y-4 pt-4">
                {/* Scheduled Date and Time */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="scheduled_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Scheduled Date *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="scheduled_start_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Duration and Deadline */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="estimated_duration_hours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estimated Duration (hours)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.5"
                            {...field}
                            value={field.value || ""}
                            onChange={(e) =>
                              field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="deadline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deadline</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Priority */}
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority (1=Highest, 10=Lowest)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="10"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 5)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="tracking" className="space-y-4 pt-4">
                {/* Customer */}
                <FormField
                  control={form.control}
                  name="customer_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer (optional)</FormLabel>
                      <Select 
                        value={field.value || "__none__"} 
                        onValueChange={(val) => field.onChange(val === "__none__" ? undefined : val)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select customer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name} ({customer.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Sales Order Reference */}
                <FormField
                  control={form.control}
                  name="sales_order_reference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sales Order Reference</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="e.g., SO-2024-001" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Notes */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value || ""}
                          placeholder="Additional instructions or notes..."
                          rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? "Update Work Order" : "Create Work Order"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
