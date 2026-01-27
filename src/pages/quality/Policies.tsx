import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Filter, Grid, List, Table as TableIcon, FileText, Eye, Edit, Trash2, Archive, FolderUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { usePolicies, usePolicyCategories, usePolicyTypes, useDeletePolicy, useArchivePolicy, type Policy } from "@/hooks/usePolicies";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import PolicyFormDialog from "@/components/policies/PolicyFormDialog";
import BulkPolicyUploadDialog from "@/components/policies/BulkPolicyUploadDialog";

type ViewMode = "grid" | "list" | "table";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  review: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  archived: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
  superseded: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
};

export default function Policies() {
  const navigate = useNavigate();
  const { isManager, isAdmin } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editPolicy, setEditPolicy] = useState<Policy | null>(null);
  
  const { data: policies, isLoading } = usePolicies({
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    category_id: categoryFilter !== "all" ? categoryFilter : undefined,
  });
  const { data: categories } = usePolicyCategories();
  const { data: types } = usePolicyTypes();
  const deletePolicy = useDeletePolicy();
  const archivePolicy = useArchivePolicy();

  const handleDelete = () => {
    if (deleteId) {
      deletePolicy.mutate(deleteId, {
        onSuccess: () => setDeleteId(null),
      });
    }
  };

  const handleArchive = (id: string) => {
    archivePolicy.mutate(id);
  };

  const PolicyCard = ({ policy }: { policy: Policy }) => (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/quality/policies/${policy.id}`)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {policy.category?.icon && <span className="text-xl">{policy.category.icon}</span>}
            <Badge className={statusColors[policy.status]}>{policy.status}</Badge>
          </div>
          <span className="text-xs text-muted-foreground">{policy.policy_number}</span>
        </div>
        <CardTitle className="text-lg line-clamp-2">{policy.title}</CardTitle>
        {policy.summary && (
          <CardDescription className="line-clamp-2">{policy.summary}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{policy.category?.name || "Uncategorized"}</span>
          <span>v{policy.version}</span>
        </div>
        {policy.effective_date && (
          <div className="text-xs text-muted-foreground mt-1">
            Effective: {format(new Date(policy.effective_date), "MMM d, yyyy")}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const PolicyListItem = ({ policy }: { policy: Policy }) => (
    <div 
      className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent/50 cursor-pointer"
      onClick={() => navigate(`/quality/policies/${policy.id}`)}
    >
      <div className="flex items-center gap-2 flex-shrink-0">
        {policy.category?.icon && <span className="text-xl">{policy.category.icon}</span>}
        <FileText className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{policy.title}</span>
          <Badge className={statusColors[policy.status]} variant="secondary">{policy.status}</Badge>
        </div>
        <div className="text-sm text-muted-foreground">
          {policy.policy_number} • {policy.category?.name || "Uncategorized"} • v{policy.version}
        </div>
      </div>
      <div className="text-sm text-muted-foreground flex-shrink-0">
        {policy.updated_at && format(new Date(policy.updated_at), "MMM d, yyyy")}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Policies & SOPs</h1>
          <p className="text-muted-foreground">Manage your organization's policies, procedures, and documentation</p>
        </div>
        {isManager && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsBulkUploadOpen(true)}>
              <FolderUp className="h-4 w-4 mr-2" />
              Bulk Import
            </Button>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Policy
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search policies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="review">In Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories?.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1 ml-auto">
          <Button 
            variant={viewMode === "grid" ? "secondary" : "ghost"} 
            size="icon"
            onClick={() => setViewMode("grid")}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button 
            variant={viewMode === "list" ? "secondary" : "ghost"} 
            size="icon"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button 
            variant={viewMode === "table" ? "secondary" : "ghost"} 
            size="icon"
            onClick={() => setViewMode("table")}
          >
            <TableIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : !policies?.length ? (
        <Card className="p-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No policies found</h3>
          <p className="text-muted-foreground mb-4">
            {search || statusFilter !== "all" || categoryFilter !== "all"
              ? "Try adjusting your filters"
              : "Get started by creating your first policy"}
          </p>
          {isManager && !search && statusFilter === "all" && categoryFilter === "all" && (
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Policy
            </Button>
          )}
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {policies.map((policy) => (
            <PolicyCard key={policy.id} policy={policy} />
          ))}
        </div>
      ) : viewMode === "list" ? (
        <div className="space-y-2">
          {policies.map((policy) => (
            <PolicyListItem key={policy.id} policy={policy} />
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Policy Number</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Effective Date</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.map((policy) => (
                <TableRow key={policy.id} className="cursor-pointer" onClick={() => navigate(`/quality/policies/${policy.id}`)}>
                  <TableCell className="font-mono text-sm">{policy.policy_number}</TableCell>
                  <TableCell className="font-medium max-w-[300px] truncate">{policy.title}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1">
                      {policy.category?.icon} {policy.category?.name || "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[policy.status]}>{policy.status}</Badge>
                  </TableCell>
                  <TableCell>v{policy.version}</TableCell>
                  <TableCell>
                    {policy.effective_date ? format(new Date(policy.effective_date), "MMM d, yyyy") : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(policy.updated_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {isManager && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Filter className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/quality/policies/${policy.id}`)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditPolicy(policy)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleArchive(policy.id)}>
                            <Archive className="h-4 w-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                          {isAdmin && (
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => setDeleteId(policy.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Create Dialog */}
      <PolicyFormDialog 
        open={isCreateOpen} 
        onOpenChange={setIsCreateOpen}
        categories={categories || []}
        types={types || []}
      />

      {/* Bulk Upload Dialog */}
      <BulkPolicyUploadDialog
        open={isBulkUploadOpen}
        onOpenChange={setIsBulkUploadOpen}
        categories={categories || []}
        types={types || []}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Policy</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this policy? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Policy Dialog */}
      {categories && types && editPolicy && (
        <PolicyFormDialog
          open={!!editPolicy}
          onOpenChange={(open) => !open && setEditPolicy(null)}
          categories={categories}
          types={types}
          policy={editPolicy}
        />
      )}
    </div>
  );
}
