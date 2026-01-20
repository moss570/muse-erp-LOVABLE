import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoreVertical, Plus, Download, Eye, Edit, Ban, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function ManufacturingLots() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: lots, isLoading } = useQuery({
    queryKey: ["manufacturing-lots", searchTerm, statusFilter, typeFilter],
    queryFn: async () => {
      let query = supabase
        .from("manufacturing_lots")
        .select(`
          *,
          material:materials(name, material_code),
          production_line:production_lines(line_name)
        `)
        .order("production_date", { ascending: false });

      if (searchTerm) {
        query = query.or(`lot_number.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`);
      }

      if (statusFilter !== "all") {
        query = query.eq("lot_status", statusFilter);
      }

      if (typeFilter !== "all") {
        query = query.eq("lot_type", typeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const approveLotMutation = useMutation({
    mutationFn: async (lotId: string) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("manufacturing_lots")
        .update({
          lot_status: "Approved",
          approved_date: new Date().toISOString(),
          approved_by: userData?.user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", lotId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manufacturing-lots"] });
      toast.success("Lot approved successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to approve lot", { description: error.message });
    },
  });

  const holdLotMutation = useMutation({
    mutationFn: async (lotId: string) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("manufacturing_lots")
        .update({
          lot_status: "Hold",
          hold_date: new Date().toISOString(),
          hold_by: userData?.user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", lotId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manufacturing-lots"] });
      toast.success("Lot placed on hold");
    },
    onError: (error: any) => {
      toast.error("Failed to hold lot", { description: error.message });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      Approved: { variant: "default", label: "Approved" },
      Pending: { variant: "secondary", label: "Pending" },
      Hold: { variant: "destructive", label: "Hold" },
      Rejected: { variant: "destructive", label: "Rejected" },
      Consumed: { variant: "outline", label: "Consumed" },
      Expired: { variant: "outline", label: "Expired" },
    };

    const config = variants[status] || { variant: "secondary" as const, label: status };

    return (
      <Badge variant={config.variant} className="gap-1">
        {status === "Approved" && <CheckCircle className="h-3 w-3" />}
        {status === "Hold" && <Ban className="h-3 w-3" />}
        {config.label}
      </Badge>
    );
  };

  const handleExport = () => {
    toast.success("Export started", { description: "Your file will download shortly" });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Manufacturing Lots</h1>
          <p className="text-muted-foreground">Manage production lot traceability</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => navigate("/manufacturing/lots/create")}>
            <Plus className="mr-2 h-4 w-4" />
            Create Lot
          </Button>
        </div>
      </div>

      <div className="flex gap-4 items-center flex-wrap">
        <Input
          placeholder="Search lot number or notes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Approved">Approved</SelectItem>
            <SelectItem value="Hold">Hold</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
            <SelectItem value="Consumed">Consumed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Raw Material">Raw Material</SelectItem>
            <SelectItem value="Base">Base</SelectItem>
            <SelectItem value="Flavored Mix">Flavored Mix</SelectItem>
            <SelectItem value="Finished Good">Finished Good</SelectItem>
            <SelectItem value="Packaging">Packaging</SelectItem>
            <SelectItem value="Rework">Rework</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lot Number</TableHead>
              <TableHead>Material</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Production Date</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Remaining</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Line</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center">
                  Loading lots...
                </TableCell>
              </TableRow>
            ) : lots?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center">
                  No lots found
                </TableCell>
              </TableRow>
            ) : (
              lots?.map((lot) => (
                <TableRow key={lot.id}>
                  <TableCell className="font-mono font-medium">
                    {lot.lot_number}
                  </TableCell>
                  <TableCell>{(lot.material as any)?.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{lot.lot_type}</Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(lot.production_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {Number(lot.quantity).toFixed(2)} {lot.quantity_uom}
                  </TableCell>
                  <TableCell>
                    {Number(lot.quantity_remaining).toFixed(2)} {lot.quantity_uom}
                  </TableCell>
                  <TableCell>{getStatusBadge(lot.lot_status)}</TableCell>
                  <TableCell>{lot.production_line?.line_name || "-"}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => navigate(`/manufacturing/lots/${lot.id}`)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => navigate(`/manufacturing/lots/${lot.id}/edit`)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        {lot.lot_status === "Pending" && (
                          <>
                            <DropdownMenuItem
                              onClick={() => approveLotMutation.mutate(lot.id)}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => holdLotMutation.mutate(lot.id)}
                            >
                              <Ban className="mr-2 h-4 w-4" />
                              Place on Hold
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
