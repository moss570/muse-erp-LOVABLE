import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, MoreHorizontal, Eye, Edit, Archive, AlertTriangle, CheckCircle, Clock, FileText } from "lucide-react";
import { useHACCPPlans, useDeleteHACCPPlan } from "@/hooks/useHACCP";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const statusConfig = {
  draft: { label: "Draft", color: "bg-muted text-muted-foreground", icon: FileText },
  review: { label: "In Review", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  approved: { label: "Approved", color: "bg-green-100 text-green-800", icon: CheckCircle },
  archived: { label: "Archived", color: "bg-gray-100 text-gray-800", icon: Archive },
};

export default function HACCPPlans() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const { data: plans, isLoading } = useHACCPPlans();
  const deletePlan = useDeleteHACCPPlan();

  const filteredPlans = plans?.filter(plan => {
    const matchesSearch = 
      plan.plan_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || plan.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this HACCP plan?")) {
      await deletePlan.mutateAsync(id);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">HACCP Plans</h1>
          <p className="text-muted-foreground">
            Manage Hazard Analysis and Critical Control Points documentation
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New HACCP Plan
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Plans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{plans?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active/Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {plans?.filter(p => p.status === "approved").length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Under Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {plans?.filter(p => p.status === "review").length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Review Due</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">
              {plans?.filter(p => p.review_date && new Date(p.review_date) <= new Date()).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plans Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All HACCP Plans</CardTitle>
              <CardDescription>Click on a plan to view details and manage CCPs</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search plans..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan #</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Effective Date</TableHead>
                <TableHead>Review Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading HACCP plans...
                  </TableCell>
                </TableRow>
              ) : filteredPlans?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No HACCP plans found. Create your first plan to get started.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPlans?.map((plan) => {
                  const status = statusConfig[plan.status as keyof typeof statusConfig];
                  const isReviewDue = plan.review_date && new Date(plan.review_date) <= new Date();
                  
                  return (
                    <TableRow key={plan.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-mono font-medium">{plan.plan_number}</TableCell>
                      <TableCell>
                        <div className="font-medium">{plan.name}</div>
                        {plan.intended_use && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {plan.intended_use}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>v{plan.version}</TableCell>
                      <TableCell>
                        {plan.effective_date ? format(new Date(plan.effective_date), "MMM d, yyyy") : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {plan.review_date ? format(new Date(plan.review_date), "MMM d, yyyy") : "—"}
                          {isReviewDue && (
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("gap-1", status?.color)}>
                          {status?.icon && <status.icon className="h-3 w-3" />}
                          {status?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Plan
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => { e.stopPropagation(); handleDelete(plan.id); }}
                              className="text-destructive"
                            >
                              <Archive className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
