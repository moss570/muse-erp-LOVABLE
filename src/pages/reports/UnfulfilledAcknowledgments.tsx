import { useState } from "react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  FileText,
  Download,
  CalendarIcon,
  Eye,
  Loader2,
  ClipboardCheck,
} from "lucide-react";
import { UnfulfilledItem } from "@/hooks/useUnfulfilledSalesOrders";
import { PriorityBadge } from "@/components/manufacturing/PriorityBadge";
import { cn } from "@/lib/utils";

interface AcknowledgmentRecord {
  id: string;
  user_id: string;
  acknowledged_at: string;
  unfulfilled_items_snapshot: UnfulfilledItem[];
  work_order_id: string | null;
  notes: string | null;
  created_at: string;
  profile: { first_name: string | null; last_name: string | null } | null;
  work_order: { wo_number: string; wo_status: string } | null;
}

function getFullName(profile: { first_name: string | null; last_name: string | null } | null): string {
  if (!profile) return "Unknown";
  return [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Unknown";
}

export default function UnfulfilledAcknowledgments() {
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [snapshotModal, setSnapshotModal] = useState<UnfulfilledItem[] | null>(null);

  // Fetch users for filter
  const { data: users } = useQuery({
    queryKey: ["profiles-list-for-ack"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch acknowledgments
  const { data: acknowledgments, isLoading } = useQuery({
    queryKey: ["unfulfilled-acknowledgments", startDate, endDate, selectedUserId],
    queryFn: async () => {
      let query = supabase
        .from("unfulfilled_so_acknowledgments")
        .select(`
          *,
          profile:profiles!unfulfilled_so_acknowledgments_user_id_fkey(first_name, last_name),
          work_order:work_orders(wo_number, wo_status)
        `)
        .order("acknowledged_at", { ascending: false });

      if (selectedUserId !== "all") {
        query = query.eq("user_id", selectedUserId);
      }
      if (startDate) {
        query = query.gte("acknowledged_at", startDate.toISOString());
      }
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte("acknowledged_at", endOfDay.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as AcknowledgmentRecord[];
    },
  });

  const handleExportCSV = () => {
    if (!acknowledgments || acknowledgments.length === 0) return;

    const headers = [
      "Date/Time",
      "User",
      "# Items",
      "Work Order",
      "Notes",
    ];

    const rows = acknowledgments.map((ack) => [
      format(new Date(ack.acknowledged_at), "yyyy-MM-dd HH:mm:ss"),
      getFullName(ack.profile),
      (ack.unfulfilled_items_snapshot as unknown as UnfulfilledItem[] | null)?.length || 0,
      ack.work_order?.wo_number || "",
      ack.notes || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `acknowledgments_${format(new Date(), "yyyyMMdd")}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-8 w-8" />
            Unfulfilled Order Acknowledgments
          </h1>
          <p className="text-muted-foreground">
            History of production manager acknowledgments
          </p>
        </div>
        <Button onClick={handleExportCSV} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date Range */}
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* User Filter */}
            <div className="space-y-2">
              <Label>User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="All users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {users?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {[user.first_name, user.last_name].filter(Boolean).join(" ") || "Unknown"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Clear Filters */}
          {(startDate || endDate || selectedUserId !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => {
                setStartDate(undefined);
                setEndDate(undefined);
                setSelectedUserId("all");
              }}
            >
              Clear Filters
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !acknowledgments || acknowledgments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No acknowledgments found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date/Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right"># Items</TableHead>
                  <TableHead>Snapshot</TableHead>
                  <TableHead>Work Order</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {acknowledgments.map((ack) => {
                  const snapshot = ack.unfulfilled_items_snapshot as unknown as UnfulfilledItem[] | null;
                  return (
                    <TableRow key={ack.id}>
                      <TableCell>
                        {format(new Date(ack.acknowledged_at), "MMM d, yyyy h:mm a")}
                      </TableCell>
                      <TableCell>{getFullName(ack.profile)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {snapshot?.length || 0}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSnapshotModal(snapshot || [])}
                          className="gap-1"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                      </TableCell>
                      <TableCell>
                        {ack.work_order ? (
                          <Badge variant="outline">
                            {ack.work_order.wo_number}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {ack.notes || "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Snapshot Modal */}
      <Dialog open={!!snapshotModal} onOpenChange={() => setSnapshotModal(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Unfulfilled Items Snapshot</DialogTitle>
          </DialogHeader>
          {snapshotModal && snapshotModal.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Priority</TableHead>
                  <TableHead>Product Code</TableHead>
                  <TableHead className="text-right">Shortage</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right"># SOs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshotModal.map((item, index) => (
                  <TableRow key={item.product_size_id || index}>
                    <TableCell>
                      <PriorityBadge level={item.priority_level} rank={index + 1} />
                    </TableCell>
                    <TableCell className="font-mono">{item.product_code}</TableCell>
                    <TableCell className="text-right font-bold">
                      {item.shortage_quantity} CS
                    </TableCell>
                    <TableCell>
                      {item.earliest_due_date
                        ? format(new Date(item.earliest_due_date), "MMM d, yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.number_of_sales_orders}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              No items in snapshot
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
