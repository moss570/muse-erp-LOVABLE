import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Calculator, Edit, Loader2, DollarSign, Clock, Package } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

interface RecipeDetail {
  id: string;
  recipe_code: string;
  recipe_name: string;
  recipe_version: string;
  batch_size: number;
  batch_uom: string;
  material_cost_per_batch: number;
  labor_cost_per_batch: number;
  overhead_cost_per_batch: number;
  total_cost_per_batch: number;
  cost_per_unit: number;
  standard_labor_hours: number;
  approval_status: string;
  notes: string | null;
  created_at: string;
  product?: { id: string; name: string; material_code: string } | null;
}

interface BOMItem {
  id: string;
  material_id: string;
  quantity_required: number;
  quantity_uom: string;
  unit_cost: number;
  extended_cost: number;
  waste_percentage: number;
  is_optional: boolean;
  sequence_order: number;
  stage: string | null;
  material?: { id: string; name: string; material_code: string } | null;
}

interface CostHistory {
  id: string;
  material_cost: number;
  labor_cost: number;
  overhead_cost: number;
  total_cost: number;
  cost_per_unit: number;
  calculation_reason: string;
  calculated_at: string;
}

export default function RecipeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("bom");

  const { data: recipe, isLoading } = useQuery({
    queryKey: ["recipe", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipes")
        .select(`
          *,
          product:materials!recipes_product_id_fkey(id, name, material_code)
        `)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as unknown as RecipeDetail;
    },
    enabled: !!id,
  });

  const { data: bomItems = [] } = useQuery({
    queryKey: ["recipe-bom", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipe_bom_items")
        .select(`
          *,
          material:materials(id, name, material_code)
        `)
        .eq("recipe_id", id)
        .order("sequence_order");
      if (error) throw error;
      return data as unknown as BOMItem[];
    },
    enabled: !!id,
  });

  const { data: costHistory = [] } = useQuery({
    queryKey: ["recipe-cost-history", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipe_cost_history")
        .select("*")
        .eq("recipe_id", id)
        .order("calculated_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as CostHistory[];
    },
    enabled: !!id,
  });

  const recalculateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("calculate_recipe_cost", {
        p_recipe_id: id,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipe", id] });
      queryClient.invalidateQueries({ queryKey: ["recipe-bom", id] });
      queryClient.invalidateQueries({ queryKey: ["recipe-cost-history", id] });
      toast.success("Recipe costs recalculated");
    },
    onError: (error: any) => {
      toast.error("Failed to recalculate", { description: error.message });
    },
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!recipe) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Recipe not found</p>
          <Button onClick={() => navigate("/manufacturing/recipes")} className="mt-4">
            Back to Recipes
          </Button>
        </div>
      </AppLayout>
    );
  }

  const costBreakdown = [
    { name: "Materials", value: recipe.material_cost_per_batch, color: "#3b82f6" },
    { name: "Labor", value: recipe.labor_cost_per_batch, color: "#10b981" },
    { name: "Overhead", value: recipe.overhead_cost_per_batch, color: "#f59e0b" },
  ];

  const costTrendData = costHistory.slice(0, 10).reverse().map((h) => ({
    date: format(new Date(h.calculated_at), "MMM d"),
    total: h.total_cost,
    material: h.material_cost,
    labor: h.labor_cost,
  }));

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/manufacturing/recipes")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                {recipe.recipe_name}
                <Badge variant="outline">v{recipe.recipe_version}</Badge>
              </h1>
              <p className="text-muted-foreground">
                {recipe.recipe_code} • {recipe.product?.name || "No product linked"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => recalculateMutation.mutate()} disabled={recalculateMutation.isPending}>
              <Calculator className="h-4 w-4 mr-2" />
              Recalculate Costs
            </Button>
            <Button>
              <Edit className="h-4 w-4 mr-2" />
              Edit Recipe
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Package className="h-4 w-4" />
                Batch Size
              </div>
              <p className="text-2xl font-bold">
                {recipe.batch_size} {recipe.batch_uom}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                Cost per Batch
              </div>
              <p className="text-2xl font-bold font-mono">
                ${recipe.total_cost_per_batch?.toFixed(2) || '0.00'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                Cost per Unit
              </div>
              <p className="text-2xl font-bold font-mono">
                ${recipe.cost_per_unit?.toFixed(4) || '0.0000'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="h-4 w-4" />
                Labor Hours
              </div>
              <p className="text-2xl font-bold">
                {recipe.standard_labor_hours?.toFixed(2) || '0.00'} hrs
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="bom">Bill of Materials</TabsTrigger>
            <TabsTrigger value="costs">Cost Breakdown</TabsTrigger>
            <TabsTrigger value="history">Cost History</TabsTrigger>
          </TabsList>

          <TabsContent value="bom" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Bill of Materials</CardTitle>
                <CardDescription>
                  {bomItems.length} materials • Total: ${recipe.material_cost_per_batch?.toFixed(2) || '0.00'}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Seq</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Waste %</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Extended</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bomItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.sequence_order}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.material?.name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{item.material?.material_code}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.stage ? <Badge variant="outline">{item.stage}</Badge> : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {item.quantity_required} {item.quantity_uom}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {item.waste_percentage}%
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${item.unit_cost?.toFixed(4) || '0.0000'}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          ${item.extended_cost?.toFixed(2) || '0.00'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {bomItems.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No materials in BOM. Add materials to calculate costs.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="costs" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Cost Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={costBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {costBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 space-y-2">
                    {costBreakdown.map((item) => (
                      <div key={item.name} className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span>{item.name}</span>
                        </div>
                        <span className="font-mono">${item.value?.toFixed(2) || '0.00'}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Cost Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {costTrendData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={costTrendData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                          <Legend />
                          <Line type="monotone" dataKey="total" stroke="#8b5cf6" name="Total" />
                          <Line type="monotone" dataKey="material" stroke="#3b82f6" name="Material" />
                          <Line type="monotone" dataKey="labor" stroke="#10b981" name="Labor" />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        No cost history available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Cost Calculation History</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead className="text-right">Material</TableHead>
                      <TableHead className="text-right">Labor</TableHead>
                      <TableHead className="text-right">Overhead</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Per Unit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {costHistory.map((h) => (
                      <TableRow key={h.id}>
                        <TableCell>{format(new Date(h.calculated_at), "MMM d, yyyy HH:mm")}</TableCell>
                        <TableCell>{h.calculation_reason || "—"}</TableCell>
                        <TableCell className="text-right font-mono">${h.material_cost?.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono">${h.labor_cost?.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono">${h.overhead_cost?.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono font-medium">${h.total_cost?.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono">${h.cost_per_unit?.toFixed(4)}</TableCell>
                      </TableRow>
                    ))}
                    {costHistory.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No cost history yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
