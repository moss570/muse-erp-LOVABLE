import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, Hash, FileText } from "lucide-react";
import { usePolicyTypes, useCreatePolicyType, useUpdatePolicyType, PolicyType } from "@/hooks/usePolicies";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface TypeFormData {
  name: string;
  description: string;
  code_prefix: string;
  number_format: string;
  is_active: boolean;
}

const defaultFormData: TypeFormData = {
  name: "",
  description: "",
  code_prefix: "",
  number_format: "{PREFIX}-{YEAR}-{SEQ:4}",
  is_active: true,
};

const FORMAT_TOKENS = [
  { token: "{PREFIX}", description: "Type prefix (e.g., SOP, POL)" },
  { token: "{YEAR}", description: "Current year (e.g., 2026)" },
  { token: "{SEQ:4}", description: "Sequence padded to 4 digits (0001)" },
  { token: "{SEQ:3}", description: "Sequence padded to 3 digits (001)" },
];

export default function PolicyTypesSettings() {
  const { data: types, isLoading } = usePolicyTypes();
  const createType = useCreatePolicyType();
  const updateType = useUpdatePolicyType();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<PolicyType | null>(null);
  const [formData, setFormData] = useState<TypeFormData>(defaultFormData);
  const [previewNumber, setPreviewNumber] = useState("");

  const generatePreview = (format: string, prefix: string, sequence: number = 1) => {
    const year = new Date().getFullYear();
    let result = format
      .replace("{PREFIX}", prefix || "XXX")
      .replace("{YEAR}", String(year));
    
    // Handle different sequence formats
    const seqMatch = result.match(/\{SEQ:(\d+)\}/);
    if (seqMatch) {
      const padLength = parseInt(seqMatch[1], 10);
      result = result.replace(/\{SEQ:\d+\}/, String(sequence).padStart(padLength, "0"));
    }
    
    return result;
  };

  const handleOpenCreate = () => {
    setEditingType(null);
    setFormData(defaultFormData);
    setPreviewNumber(generatePreview(defaultFormData.number_format, defaultFormData.code_prefix));
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (type: PolicyType) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      description: type.description || "",
      code_prefix: type.code_prefix,
      number_format: type.number_format,
      is_active: type.is_active,
    });
    setPreviewNumber(generatePreview(type.number_format, type.code_prefix, type.next_sequence));
    setIsDialogOpen(true);
  };

  const handleFormatChange = (format: string) => {
    setFormData({ ...formData, number_format: format });
    setPreviewNumber(generatePreview(format, formData.code_prefix, editingType?.next_sequence || 1));
  };

  const handlePrefixChange = (prefix: string) => {
    setFormData({ ...formData, code_prefix: prefix.toUpperCase() });
    setPreviewNumber(generatePreview(formData.number_format, prefix.toUpperCase(), editingType?.next_sequence || 1));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Type name is required");
      return;
    }
    if (!formData.code_prefix.trim()) {
      toast.error("Code prefix is required");
      return;
    }

    try {
      if (editingType) {
        await updateType.mutateAsync({
          id: editingType.id,
          ...formData,
        });
      } else {
        await createType.mutateAsync(formData);
      }
      setIsDialogOpen(false);
      setFormData(defaultFormData);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDeactivate = async (type: PolicyType) => {
    const action = type.is_active ? "deactivate" : "activate";
    if (confirm(`Are you sure you want to ${action} this type?`)) {
      await updateType.mutateAsync({
        id: type.id,
        is_active: !type.is_active,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Policy Types</h1>
          <p className="text-muted-foreground">
            Configure document types with custom numbering formats
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Type
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Document Types</CardTitle>
          <CardDescription>
            Each type has its own numbering sequence and format
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : types?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No types created yet. Create document types like SOP, Policy, Work Instruction, etc.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Prefix</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Next #</TableHead>
                  <TableHead>Sample</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {types?.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{type.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {type.code_prefix}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {type.number_format}
                    </TableCell>
                    <TableCell className="font-mono">
                      {type.next_sequence}
                    </TableCell>
                    <TableCell>
                      <code className="px-2 py-1 bg-muted rounded text-sm">
                        {generatePreview(type.number_format, type.code_prefix, type.next_sequence)}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant={type.is_active ? "default" : "secondary"}>
                        {type.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(type)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeactivate(type)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Type Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>
              {editingType ? "Edit Document Type" : "Create Document Type"}
            </DialogTitle>
            <DialogDescription>
              Configure the document type and its numbering format
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Type Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., SOP, Policy"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prefix">Code Prefix *</Label>
                <Input
                  id="prefix"
                  value={formData.code_prefix}
                  onChange={(e) => handlePrefixChange(e.target.value)}
                  placeholder="e.g., SOP"
                  maxLength={10}
                  className="uppercase"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="When to use this document type..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="format">Number Format *</Label>
              <Input
                id="format"
                value={formData.number_format}
                onChange={(e) => handleFormatChange(e.target.value)}
                placeholder="{PREFIX}-{YEAR}-{SEQ:4}"
                className="font-mono"
              />
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium">Available tokens:</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {FORMAT_TOKENS.map((token) => (
                    <div key={token.token} className="flex items-start gap-2">
                      <code
                        className="bg-muted px-1 rounded cursor-pointer hover:bg-muted/80"
                        onClick={() => handleFormatChange(formData.number_format + token.token)}
                      >
                        {token.token}
                      </code>
                      <span className="text-muted-foreground">{token.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>Active (available for new policies)</Label>
            </div>

            {/* Preview */}
            <div className="p-4 border rounded-lg bg-muted/30">
              <Label className="text-xs text-muted-foreground mb-2 block">Next Policy Number Preview</Label>
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-primary" />
                <code className="text-lg font-mono font-bold">
                  {previewNumber || "Configure format above"}
                </code>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createType.isPending || updateType.isPending}
            >
              {editingType ? "Save Changes" : "Create Type"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
