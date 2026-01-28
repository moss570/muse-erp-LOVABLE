import { useState, useEffect, useRef, DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCreatePolicy, useUpdatePolicyWithVersion, useGeneratePolicyNumber, type Policy, type PolicyCategory, type PolicyType } from "@/hooks/usePolicies";
import { useUploadPolicyAttachment } from "@/hooks/usePolicyAttachments";
import { useSQFEditions } from "@/hooks/useSQF";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileText, X, Paperclip, Loader2, Sparkles, Check, AlertTriangle, FileSearch } from "lucide-react";
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

interface SQFMapping {
  code_number: string;
  sqf_code_id: string;
  sqf_code_title: string;
  compliance_status: "compliant" | "partial" | "gap";
  explanation: string;
  gap_description?: string;
  is_mandatory: boolean;
  selected: boolean;
}

interface DocumentMetadata {
  extracted_title?: string;
  extracted_policy_number?: string;
  extracted_version?: string;
  extracted_effective_date?: string;
  extracted_review_date?: string;
  suggested_document_type?: "policy" | "sop" | "work_instruction" | "form" | "manual" | "other";
  suggested_category?: "food_safety" | "quality" | "operations" | "hr" | "health_safety" | "compliance" | "other";
  extracted_department?: string;
  extracted_author?: string;
}

export default function PolicyFormDialog({ 
  open, 
  onOpenChange, 
  categories, 
  types,
  policy 
}: PolicyFormDialogProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
  const [changeNotes, setChangeNotes] = useState("");

  // SQF Mapping state
  const [selectedEditionId, setSelectedEditionId] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [sqfMappings, setSqfMappings] = useState<SQFMapping[]>([]);
  const [policySummary, setPolicySummary] = useState<string>("");
  const [analyzedFileName, setAnalyzedFileName] = useState<string>("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [extractedMetadata, setExtractedMetadata] = useState<DocumentMetadata | null>(null);

  const { data: policyNumber } = useGeneratePolicyNumber(formData.type_id || undefined);
  const { data: sqfEditions } = useSQFEditions();
  const activeEdition = sqfEditions?.find(e => e.is_active);
  
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
  const updatePolicyWithVersion = useUpdatePolicyWithVersion();
  const uploadAttachment = useUploadPolicyAttachment();

  // Set active edition as default
  useEffect(() => {
    if (activeEdition && !selectedEditionId) {
      setSelectedEditionId(activeEdition.id);
    }
  }, [activeEdition, selectedEditionId]);

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
      setSqfMappings([]);
      setPolicySummary("");
      setAnalyzedFileName("");
      setExtractedMetadata(null);
      setChangeNotes("");
    }
  }, [policy, open]);

  // Auto-fill policy number when type changes
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
      
      // Auto-analyze first policy document
      const policyDoc = Array.from(files).find(f => 
        f.type.includes("pdf") || f.type.includes("word") || f.name.endsWith(".docx")
      );
      if (policyDoc && selectedEditionId && sqfMappings.length === 0) {
        analyzeDocument(policyDoc);
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files) {
      const newFiles: PendingFile[] = Array.from(files).map(file => ({
        file,
        description: "",
      }));
      setPendingFiles(prev => [...prev, ...newFiles]);
      
      // Auto-analyze first policy document
      const policyDoc = Array.from(files).find(f => 
        f.type.includes("pdf") || f.type.includes("word") || f.name.endsWith(".docx")
      );
      if (policyDoc && selectedEditionId && sqfMappings.length === 0) {
        analyzeDocument(policyDoc);
      }
    }
  };

  const analyzeDocument = async (file: File) => {
    if (!selectedEditionId) {
      toast.error("Please select an SQF Edition first");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisProgress(10);
    setAnalyzedFileName(file.name);

    try {
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setAnalysisProgress(30);

      const { data, error } = await supabase.functions.invoke("analyze-policy-sqf", {
        body: {
          fileBase64,
          fileName: file.name,
          mimeType: file.type,
          editionId: selectedEditionId,
        },
      });

      setAnalysisProgress(80);

      if (error) {
        console.error("Analysis error:", error);
        toast.error("Failed to analyze document");
        return;
      }

      if (data?.success && data?.mappings) {
        const mappingsWithSelection = data.mappings.map((m: SQFMapping) => ({
          ...m,
          selected: true,
        }));
        
        setSqfMappings(mappingsWithSelection);
        setPolicySummary(data.policy_summary || "");
        
        // Store extracted metadata
        const metadata: DocumentMetadata = data.document_metadata || {};
        setExtractedMetadata(metadata);
        
        // Auto-fill form fields from extracted metadata
        setFormData(prev => {
          const updates: Partial<typeof prev> = {};
          
          // Auto-fill title if empty
          if (!prev.title && metadata.extracted_title) {
            updates.title = metadata.extracted_title;
          }
          
          // Auto-fill policy number if empty
          if (!prev.policy_number && metadata.extracted_policy_number) {
            updates.policy_number = metadata.extracted_policy_number;
          }
          
          // Auto-fill summary if empty
          if (!prev.summary && data.policy_summary) {
            updates.summary = data.policy_summary;
          }
          
          // Auto-fill effective date if empty and valid
          if (!prev.effective_date && metadata.extracted_effective_date) {
            // Validate date format
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (dateRegex.test(metadata.extracted_effective_date)) {
              updates.effective_date = metadata.extracted_effective_date;
            }
          }
          
          // Auto-fill review date if empty and valid
          if (!prev.review_date && metadata.extracted_review_date) {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (dateRegex.test(metadata.extracted_review_date)) {
              updates.review_date = metadata.extracted_review_date;
            }
          }
          
          // Auto-select document type based on AI suggestion
          if (!prev.type_id && metadata.suggested_document_type) {
            const typeMap: Record<string, string> = {
              policy: "POL",
              sop: "SOP",
              work_instruction: "WI",
              form: "FRM",
              manual: "MAN",
            };
            const prefix = typeMap[metadata.suggested_document_type];
            if (prefix) {
              const matchingType = types.find(t => t.code_prefix === prefix);
              if (matchingType) {
                updates.type_id = matchingType.id;
              }
            }
          }
          
          // Auto-select category based on AI suggestion
          if (!prev.category_id && metadata.suggested_category) {
            const categoryMap: Record<string, string> = {
              food_safety: "Food Safety",
              quality: "Quality",
              operations: "Operations",
              hr: "Human Resources",
              health_safety: "Health & Safety",
              compliance: "Compliance",
            };
            const categoryName = categoryMap[metadata.suggested_category];
            if (categoryName) {
              const matchingCategory = categories.find(c => c.name === categoryName);
              if (matchingCategory) {
                updates.category_id = matchingCategory.id;
              }
            }
          }
          
          // Auto-select department if mentioned
          if (!prev.department_id && metadata.extracted_department && departments) {
            const matchingDept = departments.find(d => 
              d.name.toLowerCase().includes(metadata.extracted_department!.toLowerCase()) ||
              metadata.extracted_department!.toLowerCase().includes(d.name.toLowerCase())
            );
            if (matchingDept) {
              updates.department_id = matchingDept.id;
            }
          }
          
          return { ...prev, ...updates };
        });
        
        const fieldsFilledCount = [
          metadata.extracted_title,
          metadata.extracted_policy_number,
          metadata.suggested_document_type,
          metadata.suggested_category,
          metadata.extracted_effective_date,
          metadata.extracted_review_date,
        ].filter(Boolean).length;
        
        toast.success(
          `AI found ${data.mappings.length} SQF code mappings${fieldsFilledCount > 0 ? ` and auto-filled ${fieldsFilledCount} form fields` : ""}`
        );
        setActiveTab("sqf-mapping");
      } else if (data?.error) {
        toast.error(data.error);
      }

      setAnalysisProgress(100);
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Failed to analyze document");
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(0);
    }
  };

  const toggleMapping = (index: number) => {
    const updated = [...sqfMappings];
    updated[index].selected = !updated[index].selected;
    setSqfMappings(updated);
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
      // EDIT MODE: Update existing policy with versioning
      if (policy) {
        await new Promise<any>((resolve, reject) => {
          updatePolicyWithVersion.mutate(
            {
              id: policy.id,
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
              changeNotes: changeNotes || undefined,
            },
            {
              onSuccess: resolve,
              onError: reject,
            }
          );
        });
        
        onOpenChange(false);
        return;
      }

      // CREATE MODE: New policy
      // Check for duplicate policy number first
      const policyNum = formData.policy_number || policyNumber || `POL-${Date.now()}`;
      const { data: existing } = await supabase
        .from("policies")
        .select("id, title")
        .eq("policy_number", policyNum)
        .maybeSingle();

      if (existing) {
        toast.error(`Policy number "${policyNum}" already exists (${existing.title}). Please use a different number.`);
        setIsSubmitting(false);
        return;
      }

      // Create policy
      const newPolicy = await new Promise<any>((resolve, reject) => {
        createPolicy.mutate(
          {
            policy_number: policyNum,
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
          }
        }
      }

      // Save SQF mappings
      const selectedMappings = sqfMappings.filter(m => m.selected);
      if (selectedMappings.length > 0) {
        const { data: user } = await supabase.auth.getUser();
        
        const mappingsToInsert = selectedMappings.map(m => ({
          policy_id: newPolicy.id,
          sqf_code_id: m.sqf_code_id,
          compliance_status: m.compliance_status,
          gap_description: m.gap_description || null,
          notes: m.explanation,
          created_by: user.user?.id,
          evidence_excerpts: (m as any).evidence_excerpts ?? [],
        }));

        const { error: mappingError } = await supabase
          .from("policy_sqf_mappings")
          .upsert(mappingsToInsert as any, {
            onConflict: "policy_id,sqf_code_id",
          });

        if (mappingError) {
          console.error("Failed to save SQF mappings:", mappingError);
          toast.error("Policy created but SQF mappings failed to save");
        } else {
          toast.success(`Policy created with ${selectedMappings.length} SQF mappings`);
        }
        
        await queryClient.invalidateQueries({ queryKey: ["policy-sqf-mappings"] });
        await queryClient.invalidateQueries({ queryKey: ["sqf-compliance-summary"] });
      }

      onOpenChange(false);
      navigate(`/quality/policies/${newPolicy.id}`);
    } catch (error) {
      console.error("Failed to save policy:", error);
      toast.error(policy ? "Failed to update policy" : "Failed to create policy");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "compliant":
        return <Badge className="bg-primary"><Check className="h-3 w-3 mr-1" />Compliant</Badge>;
      case "partial":
        return <Badge variant="secondary"><AlertTriangle className="h-3 w-3 mr-1" />Partial</Badge>;
      case "gap":
        return <Badge variant="destructive"><X className="h-3 w-3 mr-1" />Gap</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{policy ? "Edit Policy" : "Create New Policy"}</DialogTitle>
          <DialogDescription>
            Create a new policy document. Upload a PDF or Word file to automatically extract metadata and analyze SQF compliance mappings.
          </DialogDescription>
        </DialogHeader>

        {extractedMetadata && Object.keys(extractedMetadata).some(k => extractedMetadata[k as keyof DocumentMetadata]) && (
          <Alert className="bg-primary/10 border-primary/30">
            <Sparkles className="h-4 w-4 text-primary" />
            <AlertDescription className="text-sm">
              <strong>AI Auto-filled fields from document:</strong>{" "}
              {[
                extractedMetadata.extracted_title && "Title",
                extractedMetadata.extracted_policy_number && "Policy Number",
                extractedMetadata.suggested_document_type && "Document Type",
                extractedMetadata.suggested_category && "Category",
                extractedMetadata.extracted_effective_date && "Effective Date",
                extractedMetadata.extracted_review_date && "Review Date",
              ].filter(Boolean).join(", ") || "Summary"}
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
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
            <TabsTrigger value="sqf-mapping">
              SQF Mapping
              {sqfMappings.length > 0 && (
                <span className="ml-1 text-xs bg-primary text-primary-foreground rounded-full px-1.5">
                  {sqfMappings.filter(m => m.selected).length}
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
                  placeholder="Brief description of the policy..."
                  rows={3}
                />
              </div>

              <div className="col-span-2 flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="requires_ack">Requires Acknowledgement</Label>
                  <p className="text-sm text-muted-foreground">
                    Employees must acknowledge reading this policy
                  </p>
                </div>
                <Switch
                  id="requires_ack"
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

              {/* Change Notes - only shown when editing existing policy */}
              {policy && (
                <div className="col-span-2">
                  <Label htmlFor="changeNotes">Change Notes</Label>
                  <Textarea
                    id="changeNotes"
                    value={changeNotes}
                    onChange={(e) => setChangeNotes(e.target.value)}
                    placeholder="Describe what changes you made (e.g., 'Updated section 3.2 per audit findings')"
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    These notes will be saved in the version history
                  </p>
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
                Attach supporting documents. PDF/Word files will be automatically analyzed for SQF compliance.
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
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isDragOver 
                    ? 'border-primary bg-primary/10' 
                    : 'hover:border-primary hover:bg-accent/50'
                }`}
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

            {isAnalyzing && (
              <div className="space-y-2">
                <Progress value={analysisProgress} />
                <p className="text-sm text-center text-muted-foreground">
                  AI is analyzing "{analyzedFileName}" for SQF compliance...
                </p>
              </div>
            )}

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

            {pendingFiles.length === 0 && !isAnalyzing && (
              <div className="text-center py-8 text-muted-foreground">
                <Paperclip className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No files attached yet</p>
                <p className="text-xs">Files will be uploaded when you create the policy</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="sqf-mapping" className="mt-4 space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label>SQF Edition</Label>
                <Select value={selectedEditionId} onValueChange={setSelectedEditionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select SQF Edition" />
                  </SelectTrigger>
                  <SelectContent>
                    {sqfEditions?.map((edition) => (
                      <SelectItem key={edition.id} value={edition.id}>
                        {edition.name} {edition.version} {edition.is_active && "(Active)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {pendingFiles.length > 0 && sqfMappings.length === 0 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    const policyDoc = pendingFiles.find(pf => 
                      pf.file.type.includes("pdf") || pf.file.type.includes("word") || pf.file.name.endsWith(".docx")
                    );
                    if (policyDoc) {
                      analyzeDocument(policyDoc.file);
                    } else {
                      toast.error("Please attach a PDF or Word document first");
                    }
                  }}
                  disabled={isAnalyzing || !selectedEditionId}
                  className="mt-6"
                >
                  {isAnalyzing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Analyze Document
                </Button>
              )}
            </div>

            {sqfMappings.length === 0 && !isAnalyzing && (
              <Alert>
                <FileSearch className="h-4 w-4" />
                <AlertDescription>
                  Upload a PDF or Word document in the Attachments tab to automatically analyze which SQF codes it addresses.
                  You can also manually map codes after creating the policy.
                </AlertDescription>
              </Alert>
            )}

            {policySummary && (
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2">AI Policy Summary</h4>
                <p className="text-sm text-muted-foreground">{policySummary}</p>
              </div>
            )}

            {sqfMappings.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">SQF Code Mappings ({sqfMappings.length})</h4>
                  <p className="text-sm text-muted-foreground">
                    {sqfMappings.filter(m => m.selected).length} selected
                  </p>
                </div>
                
                <ScrollArea className="h-[250px] border rounded-lg">
                  <div className="p-2 space-y-2">
                    {sqfMappings.map((mapping, index) => (
                      <div 
                        key={mapping.sqf_code_id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          mapping.selected ? 'bg-primary/5 border-primary/30' : 'bg-background hover:bg-muted/50'
                        }`}
                        onClick={() => toggleMapping(index)}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox 
                            checked={mapping.selected}
                            onCheckedChange={() => toggleMapping(index)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-medium">{mapping.code_number}</span>
                              {getStatusBadge(mapping.compliance_status)}
                              {mapping.is_mandatory && (
                                <Badge variant="outline" className="text-xs">Mandatory</Badge>
                              )}
                            </div>
                            <p className="text-sm font-medium mt-1">{mapping.sqf_code_title}</p>
                            <p className="text-sm text-muted-foreground mt-1">{mapping.explanation}</p>
                            {mapping.gap_description && (
                              <p className="text-sm text-destructive mt-1">
                                <strong>Gap:</strong> {mapping.gap_description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
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
                {(pendingFiles.length > 0 || sqfMappings.filter(m => m.selected).length > 0) && (
                  <Paperclip className="h-4 w-4 mr-2" />
                )}
                Create Policy
                {sqfMappings.filter(m => m.selected).length > 0 && (
                  <span className="ml-1">+ {sqfMappings.filter(m => m.selected).length} Mappings</span>
                )}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
