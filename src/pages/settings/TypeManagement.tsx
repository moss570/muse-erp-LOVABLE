import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, FileText, Search } from 'lucide-react';
import { usePolicyTypes, useDeletePolicyType } from '@/hooks/usePolicyTypes';
import { TypeDialog } from '@/components/policies/TypeDialog';
import type { PolicyType } from '@/types/policies';
import { toast } from 'sonner';

export default function TypeManagement() {
  const { data: types, isLoading } = usePolicyTypes();
  const deleteType = useDeletePolicyType();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<PolicyType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleOpenCreate = () => {
    setEditingType(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (type: PolicyType) => {
    setEditingType(type);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the type "${name}"? This cannot be undone.`)) {
      try {
        await deleteType.mutateAsync(id);
        toast.success('Policy type deleted successfully');
      } catch (error) {
        toast.error('Failed to delete policy type');
      }
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingType(null);
  };

  const filteredTypes = types?.filter(type =>
    type.type_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    type.abbreviation.toLowerCase().includes(searchQuery.toLowerCase()) ||
    type.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">Loading policy types...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Policy Types</h1>
          <p className="text-muted-foreground mt-1">
            Define policy types with unique abbreviations and numbering
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Type
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Search Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, abbreviation, or description..."
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Types Table */}
      <Card>
        <CardHeader>
          <CardTitle>Policy Types ({filteredTypes.length})</CardTitle>
          <CardDescription>
            Manage policy types and their numbering sequences
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTypes.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Types Found</h3>
              <p className="text-sm text-muted-foreground mb-6">
                {searchQuery
                  ? 'No policy types match your search criteria'
                  : 'Get started by creating your first policy type'}
              </p>
              {!searchQuery && (
                <Button onClick={handleOpenCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Type
                </Button>
              )}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Abbreviation</TableHead>
                    <TableHead>Type Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Number Format</TableHead>
                    <TableHead>Next Number</TableHead>
                    <TableHead>Policies</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTypes.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono font-bold">
                          {type.abbreviation}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{type.type_name}</TableCell>
                      <TableCell className="max-w-xs">
                        <div className="line-clamp-2 text-sm text-muted-foreground">
                          {type.description || '—'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {type.number_format || '{abbreviation}-{number}'}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {type.next_number || 1}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {type.policy_count || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {type.is_active ? (
                          <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(type)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(type.id, type.type_name)}
                            disabled={deleteType.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Type Dialog */}
      <TypeDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        type={editingType}
      />
    </div>
  );
}
