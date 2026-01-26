import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Upload, Star, StarOff, Trash2, Eye, Download, MoreVertical } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useSQFEditions, useSetActiveSQFEdition, useDeleteSQFEdition } from '@/hooks/useSQFEditions';
import { formatDate, formatFileSize } from '@/utils/policies/policyFormatters';
import { toast } from 'sonner';
import type { SQFEdition } from '@/types/sqf';

export default function SQFEditionManagement() {
  const navigate = useNavigate();
  const { data: editions, isLoading } = useSQFEditions();
  const setActive = useSetActiveSQFEdition();
  const deleteEdition = useDeleteSQFEdition();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editionToDelete, setEditionToDelete] = useState<string | null>(null);

  const handleSetActive = async (editionId: string) => {
    try {
      await setActive.mutateAsync(editionId);
      toast.success('Active edition updated');
    } catch (error: any) {
      toast.error(`Failed to set active edition: ${error.message}`);
    }
  };

  const handleDelete = async () => {
    if (!editionToDelete) return;

    try {
      await deleteEdition.mutateAsync(editionToDelete);
      toast.success('Edition deleted successfully');
      setDeleteDialogOpen(false);
      setEditionToDelete(null);
    } catch (error: any) {
      toast.error(`Failed to delete edition: ${error.message}`);
    }
  };

  const getStatusBadge = (edition: SQFEdition) => {
    if (edition.is_active) {
      return <Badge className="bg-green-600">Active</Badge>;
    }
    switch (edition.status) {
      case 'Draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'Archived':
        return <Badge variant="secondary">Archived</Badge>;
      case 'Deprecated':
        return <Badge variant="destructive">Deprecated</Badge>;
      default:
        return <Badge>{edition.status}</Badge>;
    }
  };

  const getParsingStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return <Badge className="bg-green-600">Completed</Badge>;
      case 'Parsing':
        return <Badge className="bg-blue-600">Parsing...</Badge>;
      case 'Failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading SQF editions...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">SQF Code Editions</h1>
          <p className="text-muted-foreground mt-1">
            Manage SQF code requirement editions and versions
          </p>
        </div>
        <Button onClick={() => navigate('/settings/sqf-editions/upload')}>
          <Upload className="h-4 w-4 mr-2" />
          Upload New Edition
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{editions?.length || 0}</div>
            <div className="text-sm text-muted-foreground mt-1">Total Editions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {editions?.filter((e) => e.is_active).length || 0}
            </div>
            <div className="text-sm text-muted-foreground mt-1">Active Edition</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {editions?.reduce((sum, e) => sum + e.total_codes_extracted, 0) || 0}
            </div>
            <div className="text-sm text-muted-foreground mt-1">Total Codes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {editions?.filter((e) => e.parsing_status === 'Completed').length || 0}
            </div>
            <div className="text-sm text-muted-foreground mt-1">Fully Parsed</div>
          </CardContent>
        </Card>
      </div>

      {/* Editions Table */}
      <Card>
        <CardHeader>
          <CardTitle>SQF Editions</CardTitle>
          <CardDescription>
            All uploaded SQF code requirement editions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!editions || editions.length === 0 ? (
            <div className="text-center py-12">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No SQF Editions</h3>
              <p className="text-muted-foreground mb-4">
                Upload your first SQF code requirements document to get started
              </p>
              <Button onClick={() => navigate('/settings/sqf-editions/upload')}>
                <Plus className="h-4 w-4 mr-2" />
                Upload Edition
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Edition</TableHead>
                  <TableHead>Release Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Parsing</TableHead>
                  <TableHead className="text-right">Codes</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {editions.map((edition) => (
                  <TableRow key={edition.id}>
                    <TableCell>
                      {edition.is_active ? (
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      ) : (
                        <button
                          onClick={() => handleSetActive(edition.id)}
                          className="text-muted-foreground hover:text-yellow-500"
                          title="Set as active"
                        >
                          <StarOff className="h-4 w-4" />
                        </button>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{edition.edition_name}</div>
                        {edition.description && (
                          <div className="text-sm text-muted-foreground">
                            {edition.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(edition.release_date, 'PP')}</TableCell>
                    <TableCell>{getStatusBadge(edition)}</TableCell>
                    <TableCell>{getParsingStatusBadge(edition.parsing_status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="font-medium">{edition.total_codes_extracted}</div>
                      <div className="text-xs text-muted-foreground">
                        {edition.total_sections} sections
                      </div>
                    </TableCell>
                    <TableCell>
                      {edition.source_document_filename ? (
                        <div className="text-sm">
                          <div className="truncate max-w-[200px]">
                            {edition.source_document_filename}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatFileSize(edition.source_file_size_bytes || 0)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => navigate(`/settings/sqf-editions/${edition.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => navigate(`/sqf/codes?edition=${edition.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Codes
                          </DropdownMenuItem>
                          {edition.source_document_url && (
                            <DropdownMenuItem
                              onClick={() => window.open(edition.source_document_url!, '_blank')}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download Document
                            </DropdownMenuItem>
                          )}
                          {!edition.is_active && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setEditionToDelete(edition.id);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete SQF Edition?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this SQF edition and all associated codes.
              This action cannot be undone.
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
    </div>
  );
}
