import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Sparkles } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const lotSchema = z.object({
  material_id: z.string().uuid("Please select a material"),
  lot_type: z.enum(["Raw Material", "Base", "Flavored Mix", "Finished Good", "Packaging", "Rework"]),
  production_date: z.string(),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  quantity_uom: z.string().min(1, "Unit of measure is required"),
  production_line_id: z.string().optional(),
  storage_location: z.string().optional(),
  notes: z.string().optional(),
});

type LotFormValues = z.infer<typeof lotSchema>;

export default function CreateManufacturingLot() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [generatedLotNumber, setGeneratedLotNumber] = useState<string>("");

  const form = useForm<LotFormValues>({
    resolver: zodResolver(lotSchema),
    defaultValues: {
      production_date: new Date().toISOString().split("T")[0],
      quantity: 0,
      quantity_uom: "gal",
      lot_type: "Raw Material",
    },
  });

  const { data: materials } = useQuery({
    queryKey: ["materials-for-lots"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materials")
        .select("id, name, material_code, purchase_uom, material_type")
        .eq("is_active", true)
        .order("material_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: productionLines } = useQuery({
    queryKey: ["production-lines-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_lines")
        .select("id, line_name, line_code")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const generateLotNumberMutation = useMutation({
    mutationFn: async ({
      materialId,
      productionDate,
    }: {
      materialId: string;
      productionDate: string;
    }) => {
      const { data, error } = await supabase.rpc("generate_lot_number", {
        p_material_id: materialId,
        p_production_date: productionDate,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (lotNumber) => {
      setGeneratedLotNumber(lotNumber);
      toast.success("Lot number generated", { description: lotNumber });
    },
    onError: (error: any) => {
      toast.error("Failed to generate lot number", {
        description: error.message,
      });
    },
  });

  const createLotMutation = useMutation({
    mutationFn: async (values: LotFormValues & { lot_number: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const productionDate = new Date(values.production_date);
      const expirationDate = new Date(productionDate);
      expirationDate.setDate(expirationDate.getDate() + 180);

      const { data, error } = await supabase
        .from("manufacturing_lots")
        .insert({
          lot_number: values.lot_number,
          material_id: values.material_id,
          lot_type: values.lot_type,
          production_date: values.production_date,
          expiration_date: expirationDate.toISOString().split("T")[0],
          quantity: values.quantity,
          quantity_uom: values.quantity_uom,
          quantity_remaining: values.quantity,
          production_line_id: values.production_line_id || null,
          storage_location: values.storage_location || null,
          notes: values.notes || null,
          lot_status: "Pending",
          created_by: userData?.user?.id,
          updated_by: userData?.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["manufacturing-lots"] });
      toast.success("Lot created successfully", {
        description: `Lot ${data.lot_number} has been created`,
      });
      navigate(`/manufacturing/lots/${data.id}`);
    },
    onError: (error: any) => {
      toast.error("Failed to create lot", {
        description: error.message,
      });
    },
  });

  const handleGenerateLotNumber = () => {
    const materialId = form.getValues("material_id");
    const productionDate = form.getValues("production_date");

    if (!materialId) {
      toast.error("Please select a material first");
      return;
    }

    generateLotNumberMutation.mutate({ materialId, productionDate });
  };

  const onSubmit = (values: LotFormValues) => {
    if (!generatedLotNumber) {
      toast.error("Please generate a lot number first");
      return;
    }

    createLotMutation.mutate({ ...values, lot_number: generatedLotNumber });
  };

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => navigate("/manufacturing/lots")}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Lots
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Create Manufacturing Lot</CardTitle>
          <CardDescription>
            Create a new lot with automatic lot number generation (YY-JJJ-MMBB format)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="material_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Material *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a material" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {materials?.map((material: any) => (
                            <SelectItem key={material.id} value={material.id}>
                              {material.name} ({material.material_code})
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
                  name="lot_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lot Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select lot type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Raw Material">Raw Material</SelectItem>
                          <SelectItem value="Base">Base</SelectItem>
                          <SelectItem value="Flavored Mix">Flavored Mix</SelectItem>
                          <SelectItem value="Finished Good">Finished Good</SelectItem>
                          <SelectItem value="Packaging">Packaging</SelectItem>
                          <SelectItem value="Rework">Rework</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="production_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Production Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <FormLabel>Lot Number *</FormLabel>
                  <div className="flex gap-2">
                    <Input
                      value={generatedLotNumber}
                      placeholder="Click Generate to create"
                      readOnly
                      className="font-mono"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleGenerateLotNumber}
                      disabled={generateLotNumberMutation.isPending}
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate
                    </Button>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.001"
                          {...field}
                          onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quantity_uom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit of Measure *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select UOM" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="gal">Gallons</SelectItem>
                          <SelectItem value="lbs">Pounds</SelectItem>
                          <SelectItem value="kg">Kilograms</SelectItem>
                          <SelectItem value="oz">Ounces</SelectItem>
                          <SelectItem value="each">Each</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="production_line_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Production Line</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select production line" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {productionLines?.map((line) => (
                            <SelectItem key={line.id} value={line.id}>
                              {line.line_name}
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
                  name="storage_location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Storage Location</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Freezer A-1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional notes about this lot..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/manufacturing/lots")}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createLotMutation.isPending || !generatedLotNumber}
                >
                  {createLotMutation.isPending ? "Creating..." : "Create Lot"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
