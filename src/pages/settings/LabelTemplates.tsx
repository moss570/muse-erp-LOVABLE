import { useState } from 'react';
import { Plus, Tag, Printer, Trash2, Pencil, Copy, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SettingsBreadcrumb } from '@/components/settings/SettingsBreadcrumb';
import { LabelTemplateFormDialog } from '@/components/labels/LabelTemplateFormDialog';
import {
  LabelTemplate,
  LabelType,
  useLabelTemplates,
  useDeleteLabelTemplate,
  useUpdateLabelTemplate,
  LABEL_TYPES,
  LABEL_FORMAT_PRESETS,
} from '@/hooks/useLabelTemplates';

export default function LabelTemplates() {
  const [selectedType, setSelectedType] = useState<LabelType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<LabelTemplate | null>(null);
  const [deleteTemplate, setDeleteTemplate] = useState<LabelTemplate | null>(null);

  const { data: templates = [], isLoading } = useLabelTemplates(
    selectedType === 'all' ? undefined : selectedType
  );
  const deleteMutation = useDeleteLabelTemplate();
  const updateMutation = useUpdateLabelTemplate();

  const filteredTemplates = templates.filter((template) =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (template: LabelTemplate) => {
    setSelectedTemplate(template);
    setFormOpen(true);
  };

  const handleDuplicate = async (template: LabelTemplate) => {
    // This would create a copy - for now just open edit with a new name
    setSelectedTemplate({
      ...template,
      id: '', // Clear ID to create new
      name: `${template.name} (Copy)`,
      is_default: false,
    });
    setFormOpen(true);
  };

  const handleDelete = (template: LabelTemplate) => {
    setDeleteTemplate(template);
  };

  const confirmDelete = async () => {
    if (deleteTemplate) {
      await deleteMutation.mutateAsync(deleteTemplate.id);
      setDeleteTemplate(null);
    }
  };

  const handleSetDefault = async (template: LabelTemplate) => {
    // Unset existing defaults for this type
    const typeDefaults = templates.filter(
      (t) => t.label_type === template.label_type && t.is_default && t.id !== template.id
    );
    for (const t of typeDefaults) {
      await updateMutation.mutateAsync({ id: t.id, is_default: false });
    }
    await updateMutation.mutateAsync({ id: template.id, is_default: true });
  };

  const handleNew = () => {
    setSelectedTemplate(null);
    setFormOpen(true);
  };

  const getLabelTypeLabel = (type: string) => {
    return LABEL_TYPES.find((t) => t.value === type)?.label || type;
  };

  return (
    <div className="space-y-6">
      <SettingsBreadcrumb currentPage="Label Templates" />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Label Templates</h1>
          <p className="text-muted-foreground">
            Configure label layouts for receiving, production, and shipping. Supports direct thermal printing with barcodes.
          </p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="h-4 w-4 mr-2" />
          New Label Template
        </Button>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Tag className="h-4 w-4 text-blue-500" />
              Receiving Labels
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {templates.filter((t) => t.label_type === 'receiving').length}
            </p>
            <p className="text-xs text-muted-foreground">3" × 2" Direct Thermal</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Printer className="h-4 w-4 text-orange-500" />
              Production Labels
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {templates.filter((t) => t.label_type === 'production').length}
            </p>
            <p className="text-xs text-muted-foreground">3" × 5" or 4" × 6"</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <QrCode className="h-4 w-4 text-green-500" />
              All Templates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{templates.length}</p>
            <p className="text-xs text-muted-foreground">Total configured</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Tabs
          value={selectedType}
          onValueChange={(v) => setSelectedType(v as LabelType | 'all')}
        >
          <TabsList>
            <TabsTrigger value="all">All Types</TabsTrigger>
            {LABEL_TYPES.map((type) => (
              <TabsTrigger key={type.value} value={type.value}>
                {type.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Input
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-64"
        />
      </div>

      {/* Table */}
      <div className="rounded-md border bg-card">
        {isLoading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Barcode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTemplates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <Tag className="mx-auto h-10 w-10 mb-3 opacity-30" />
                    <p className="font-medium">No label templates found</p>
                    <p className="text-sm">Create your first label template to get started</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTemplates.map((template) => (
                  <TableRow
                    key={template.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleEdit(template)}
                  >
                    <TableCell>
                      <div>
                        <span className="font-medium">{template.name}</span>
                        {template.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {template.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getLabelTypeLabel(template.label_type)}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">
                        {template.width_inches}" × {template.height_inches}"
                      </span>
                    </TableCell>
                    <TableCell>
                      {template.include_barcode ? (
                        <Badge variant="secondary">{template.barcode_type}</Badge>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {template.is_default && (
                          <Badge className="bg-primary">Default</Badge>
                        )}
                        {template.is_active ? (
                          <Badge variant="outline" className="border-green-500 text-green-600">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-gray-400 text-gray-500">
                            Inactive
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm">
                            •••
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(template)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(template)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          {!template.is_default && (
                            <DropdownMenuItem onClick={() => handleSetDefault(template)}>
                              <Tag className="h-4 w-4 mr-2" />
                              Set as Default
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleDelete(template)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Form Dialog */}
      <LabelTemplateFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        template={selectedTemplate}
        defaultType={selectedType === 'all' ? 'receiving' : selectedType}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTemplate} onOpenChange={() => setDeleteTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Label Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTemplate?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
