import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCreatePolicy, useGeneratePolicyNumber, type Policy, type PolicyCategory, type PolicyType } from "@/hooks/usePolicies";
import { useUploadPolicyAttachment } from "@/hooks/usePolicyAttachments";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileText, X, Paperclip, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PolicyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: PolicyCategory[];
  types: PolicyType[];
  policy?: Policy;
}

interface PendingFile {
  file: File;
  description?: string;
}

export default function PolicyFormDialog({ 
  open, 
  onOpenChange, 
  categories, 
  types,
  policy 
}: PolicyFormDialogProps) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState("metadata");
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    policy_number: "",
    title: "",
    summary: "",
    content: "",
    type_id: "",
    category_id: "",
    department_id: "",
    effective_date: "",
    review_date: "",
    requires_acknowledgement: false,
    acknowledgement_frequency_days: 365,
  });

  const { data: policyNumber } = useGeneratePolicyNumber(formData.type_id || undefined);
  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });
  const createPolicy = useCreatePolicy();
  const uploadAttachment = useUploadPolicyAttachment();

  useEffect(() => {
    if (policy) {
      setFormData({
        policy_number: policy.policy_number || "",
        title: policy.title,
        summary: policy.summary || "",
        content: policy.content || "",
        type_id: policy.type_id || "",
        category_id: policy.category_id || "",
        department_id: policy.department_id || "",
        effective_date: policy.effective_date || "",
        review_date: policy.review_date || "",
        requires_acknowledgement: policy.requires_acknowledgement,
        acknowledgement_frequency_days: policy.acknowledgement_frequency_days || 365,
      });
    } else {
      setFormData({
        policy_number: "",
        title: "",
        summary: "",
        content: "",
        type_id: "",
        category_id: "",
        department_id: "",
        effective_date: "",
        review_date: "",
        requires_acknowledgement: false,
        acknowledgement_frequency_days: 365,
      });
      setPendingFiles([]);
    }
  }, [policy, open]);

  // Auto-fill policy number when type changes (only if user hasn't entered a custom one)
  useEffect(() => {
    if (policyNumber && !policy && !formData.policy_number) {
      setFormData(prev => ({ ...prev, policy_number: policyNumber }));
    }
  }, [policyNumber, policy]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles: PendingFile[] = Array.from(files).map(file => ({
        file,
        description: "",
      }));
      setPendingFiles(prev => [...prev, ...newFiles]);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const updateFileDescription = (index: number, description: string) => {
    setPendingFiles(prev => prev.map((f, i) => 
      i === index ? { ...f, description } : f
    ));
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.type_id) return;

    setIsSubmitting(true);

    try {
      // Create policy first
      const newPolicy = await new Promise<any>((resolve, reject) => {
        createPolicy.mutate(
          {
            policy_number: formData.policy_number || policyNumber || `POL-${Date.now()}`,
            title: formData.title,
            summary: formData.summary || null,
            content: formData.content || null,
            type_id: formData.type_id,
            category_id: formData.category_id || null,
            department_id: formData.department_id || null,
            effective_date: formData.effective_date || null,
            review_date: formData.review_date || null,
            requires_acknowledgement: formData.requires_acknowledgement,
            acknowledgement_frequency_days: formData.requires_acknowledgement ? formData.acknowledgement_frequency_days : null,
            status: "draft",
          },
          {
            onSuccess: resolve,
            onError: reject,
          }
        );
      });

      // Upload pending files
      if (pendingFiles.length > 0) {
        for (const pendingFile of pendingFiles) {
          try {
            await uploadAttachment.mutateAsync({
              policyId: newPolicy.id,
              file: pendingFile.file,
              description: pendingFile.description,
            });
          } catch (err) {
            console.error("Failed to upload attachment:", err);
            // Continue with other files
          }
        }
      }

      onOpenChange(false);
      navigate(`/quality/policies/${newPolicy.id}`);
    } catch (error) {
      console.error("Failed to create policy:", error);
      toast.error("Failed to create policy");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{policy ? "Edit Policy" : "Create New Policy"}</DialogTitle>
          <DialogDescription>
            Create a new policy document. You can attach supporting files like PDFs or Word documents.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="metadata">Details</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="attachments">
              Attachments
              {pendingFiles.length > 0 && (
                <span className="ml-1 text-xs bg-primary text-primary-foreground rounded-full px-1.5">
                  {pendingFiles.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="metadata" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter policy title"
                />
              </div>

              <div>
                <Label htmlFor="type">Document Type *</Label>
                <Select 
                  value={formData.type_id} 
                  onValueChange={(v) => setFormData({ ...formData, type_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {types.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name} ({type.code_prefix})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select 
                  value={formData.category_id} 
                  onValueChange={(v) => setFormData({ ...formData, category_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label htmlFor="policy_number">Policy Number</Label>
                <Input 
                  id="policy_number"
                  value={formData.policy_number} 
                  onChange={(e) => setFormData({ ...formData, policy_number: e.target.value })}
                  placeholder={policyNumber || "Enter policy number"}
                  className="font-mono" 
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave blank to auto-generate based on policy type
                </p>
              </div>

              <div>
                <Label htmlFor="department">Department</Label>
                <Select 
                  value={formData.department_id} 
                  onValueChange={(v) => setFormData({ ...formData, department_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments?.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="effective_date">Effective Date</Label>
                <Input
                  id="effective_date"
                  type="date"
                  value={formData.effective_date}
                  onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="review_date">Review Date</Label>
                <Input
                  id="review_date"
                  type="date"
                  value={formData.review_date}
                  onChange={(e) => setFormData({ ...formData, review_date: e.target.value })}
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="summary">Summary</Label>
                <Textarea
                  id="summary"
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  placeholder="Brief description of this policy"
                  rows={2}
                />
              </div>

              <div className="col-span-2 flex items-center justify-between border rounded-lg p-4">
                <div>
                  <Label>Requires Acknowledgement</Label>
                  <p className="text-sm text-muted-foreground">
                    Employees must acknowledge they have read this policy
                  </p>
                </div>
                <Switch
                  checked={formData.requires_acknowledgement}
                  onCheckedChange={(checked) => setFormData({ ...formData, requires_acknowledgement: checked })}
                />
              </div>

              {formData.requires_acknowledgement && (
                <div>
                  <Label htmlFor="frequency">Re-acknowledgement Frequency (days)</Label>
                  <Input
                    id="frequency"
                    type="number"
                    value={formData.acknowledgement_frequency_days}
                    onChange={(e) => setFormData({ ...formData, acknowledgement_frequency_days: parseInt(e.target.value) || 365 })}
                  />
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="content" className="mt-4">
            <div>
              <Label htmlFor="content">Policy Content</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Enter the full policy content..."
                rows={15}
                className="font-mono text-sm"
              />
            </div>
          </TabsContent>

          <TabsContent value="attachments" className="mt-4 space-y-4">
            <div>
              <Label>Upload Files</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Attach supporting documents like PDFs, Word files, or images.
              </p>
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif"
              />
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary hover:bg-accent/50 transition-colors"
              >
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, Word, Excel, PowerPoint, Images
                </p>
              </div>
            </div>

            {/* Pending Files List */}
            {pendingFiles.length > 0 && (
              <div className="space-y-2">
                <Label>Files to upload ({pendingFiles.length})</Label>
                {pendingFiles.map((pf, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 border rounded-lg bg-accent/30">
                    <FileText className="h-8 w-8 text-muted-foreground flex-shrink-0 mt-1" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{pf.file.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(pf.file.size)}
                        </span>
                      </div>
                      <Input
                        placeholder="Add description (optional)"
                        value={pf.description || ""}
                        onChange={(e) => updateFileDescription(index, e.target.value)}
                        className="mt-2 h-8 text-sm"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(index)}
                      className="flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {pendingFiles.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Paperclip className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No files attached yet</p>
                <p className="text-xs">Files will be uploaded when you create the policy</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!formData.title || !formData.type_id || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                {pendingFiles.length > 0 && <Paperclip className="h-4 w-4 mr-2" />}
                Create Policy
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
