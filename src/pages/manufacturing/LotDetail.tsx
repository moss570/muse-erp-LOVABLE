import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Edit, CheckCircle, Ban, GitBranch, Package } from "lucide-react";
import { toast } from "sonner";

export default function LotDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: lot, isLoading } = useQuery({
    queryKey: ["manufacturing-lot", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manufacturing_lots")
        .select(`
          *,
          material:materials(name, material_code),
          production_line:production_lines(line_name, line_code)
        `)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: genealogy } = useQuery({
    queryKey: ["lot-genealogy", id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_lot_genealogy_tree", {
        p_lot_id: id,
        p_direction: "both",
      });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: consumptionHistory } = useQuery({
    queryKey: ["lot-consumption", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lot_consumption")
        .select(`
          *,
          material:materials(material_name)
        `)
        .eq("consumed_lot_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("manufacturing_lots")
        .update({
          lot_status: "Approved",
          approved_date: new Date().toISOString(),
          approved_by: userData?.user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manufacturing-lot", id] });
      toast.success("Lot approved successfully");
    },
  });

  const holdMutation = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("manufacturing_lots")
        .update({
          lot_status: "Hold",
          hold_date: new Date().toISOString(),
          hold_by: userData?.user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manufacturing-lot", id] });
      toast.success("Lot placed on hold");
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      Approved: "default",
      Pending: "secondary",
      Hold: "destructive",
      Rejected: "destructive",
      Consumed: "outline",
      Expired: "outline",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <p>Loading lot details...</p>
      </div>
    );
  }

  if (!lot) {
    return (
      <div className="container mx-auto py-6">
        <p>Lot not found</p>
      </div>
    );
  }

  const parents = genealogy?.filter((g: any) => g.relationship === "parent") || [];
  const children = genealogy?.filter((g: any) => g.relationship === "child") || [];

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-6xl">
      <Button variant="ghost" onClick={() => navigate("/manufacturing/lots")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Lots
      </Button>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold font-mono">{lot.lot_number}</h1>
            {getStatusBadge(lot.lot_status)}
          </div>
          <p className="text-muted-foreground">{(lot.material as any)?.name}</p>
        </div>
        <div className="flex gap-2">
          {lot.lot_status === "Pending" && (
            <>
              <Button onClick={() => approveMutation.mutate()}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve
              </Button>
              <Button variant="destructive" onClick={() => holdMutation.mutate()}>
                <Ban className="mr-2 h-4 w-4" />
                Hold
              </Button>
            </>
          )}
          <Button variant="outline" onClick={() => navigate(`/manufacturing/lots/${id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Quantity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {Number(lot.quantity).toFixed(2)} {lot.quantity_uom}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Remaining
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {Number(lot.quantity_remaining).toFixed(2)} {lot.quantity_uom}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Production Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {new Date(lot.production_date).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Expiration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {lot.expiration_date
                ? new Date(lot.expiration_date).toLocaleDateString()
                : "-"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="genealogy">
            <GitBranch className="mr-2 h-4 w-4" />
            Genealogy ({parents.length + children.length})
          </TabsTrigger>
          <TabsTrigger value="consumption">
            <Package className="mr-2 h-4 w-4" />
            Consumption ({consumptionHistory?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lot Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Material:</span>{" "}
                  <span className="font-medium">{(lot.material as any)?.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Material Code:</span>{" "}
                  <span className="font-medium font-mono">{(lot.material as any)?.material_code}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Lot Type:</span>{" "}
                  <Badge variant="outline">{lot.lot_type}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Production Line:</span>{" "}
                  <span className="font-medium">
                    {lot.production_line?.line_name || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Storage Location:</span>{" "}
                  <span className="font-medium">{lot.storage_location || "N/A"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Is Opened:</span>{" "}
                  <span className="font-medium">{lot.is_opened ? "Yes" : "No"}</span>
                </div>
              </div>
              {lot.notes && (
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <p className="text-sm">{lot.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {lot.lot_status === "Hold" && lot.hold_reason && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Hold Information</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{lot.hold_reason}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Placed on hold: {new Date(lot.hold_date!).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="genealogy">
          <Card>
            <CardHeader>
              <CardTitle>Lot Genealogy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {parents.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 text-green-600">
                      Parent Lots (Inputs) - {parents.length}
                    </h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Lot Number</TableHead>
                          <TableHead>Material</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parents.map((p: any) => (
                          <TableRow
                            key={p.lot_id}
                            className="cursor-pointer hover:bg-muted"
                            onClick={() => navigate(`/manufacturing/lots/${p.lot_id}`)}
                          >
                            <TableCell className="font-mono">{p.lot_number}</TableCell>
                            <TableCell>{p.material_name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{p.lot_type}</Badge>
                            </TableCell>
                            <TableCell>
                              {Number(p.quantity).toFixed(2)} {p.quantity_uom}
                            </TableCell>
                            <TableCell>{getStatusBadge(p.lot_status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {children.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 text-purple-600">
                      Child Lots (Outputs) - {children.length}
                    </h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Lot Number</TableHead>
                          <TableHead>Material</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {children.map((c: any) => (
                          <TableRow
                            key={c.lot_id}
                            className="cursor-pointer hover:bg-muted"
                            onClick={() => navigate(`/manufacturing/lots/${c.lot_id}`)}
                          >
                            <TableCell className="font-mono">{c.lot_number}</TableCell>
                            <TableCell>{c.material_name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{c.lot_type}</Badge>
                            </TableCell>
                            <TableCell>
                              {Number(c.quantity).toFixed(2)} {c.quantity_uom}
                            </TableCell>
                            <TableCell>{getStatusBadge(c.lot_status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {parents.length === 0 && children.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No genealogy relationships found for this lot
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consumption">
          <Card>
            <CardHeader>
              <CardTitle>Consumption History</CardTitle>
            </CardHeader>
            <CardContent>
              {consumptionHistory?.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No consumption records found
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consumptionHistory?.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>
                          {new Date(c.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {Number(c.quantity_consumed).toFixed(2)} {c.quantity_uom}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{c.consumption_method}</Badge>
                        </TableCell>
                        <TableCell>{c.stage || "-"}</TableCell>
                        <TableCell>
                          {c.actual_total_cost
                            ? `$${Number(c.actual_total_cost).toFixed(2)}`
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
