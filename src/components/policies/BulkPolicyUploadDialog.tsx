import { useState, useRef, DragEvent, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { usePolicies, type PolicyCategory, type PolicyType } from "@/hooks/usePolicies";
import { useSQFEditions } from "@/hooks/useSQF";
import { 
  FolderOpen, 
  Upload, 
  FileText, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Sparkles,
  ArrowRight,
  RotateCcw
} from "lucide-react";
import { toast } from "sonner";

interface BulkPolicyUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: PolicyCategory[];
  types: PolicyType[];
}

interface ParsedPolicy {
  file: File;
  status: "pending" | "analyzing" | "analyzed" | "error" | "duplicate" | "imported" | "skipped";
  error?: string;
  metadata?: {
    extracted_title?: string;
    extracted_policy_number?: string;
    suggested_document_type?: string;
    suggested_category?: string;
    extracted_effective_date?: string;
    extracted_review_date?: string;
  };
  summary?: string;
  sqfMappings?: any[];
  existingPolicyId?: string;
  existingPolicyTitle?: string;
  duplicateAction?: "skip" | "version" | "import";
  selected: boolean;
}

type Step = "upload" | "analyze" | "review" | "import" | "complete";

export default function BulkPolicyUploadDialog({
  open,
  onOpenChange,
  categories,
  types,
}: BulkPolicyUploadDialogProps) {
  const queryClient = useQueryClient();
  const folderInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState<Step>("upload");
  const [isDragOver, setIsDragOver] = useState(false);
  const [files, setFiles] = useState<ParsedPolicy[]>([]);
  const [selectedEditionId, setSelectedEditionId] = useState<string>("");
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResults, setImportResults] = useState<{ success: number; skipped: number; failed: number }>({ success: 0, skipped: 0, failed: 0 });

  const { data: sqfEditions } = useSQFEditions();
  const activeEdition = sqfEditions?.find(e => e.is_active);
  const { data: existingPolicies } = usePolicies({});

  // Set active edition as default
  if (activeEdition && !selectedEditionId) {
    setSelectedEditionId(activeEdition.id);
  }

  const validTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

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

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const items = e.dataTransfer.items;
    const policyFiles: File[] = [];

    // Valid extensions for fallback check
    const validExtensions = ['.pdf', '.doc', '.docx'];

    // Check if file is valid by MIME type or extension
    const isValidFile = (file: File): boolean => {
      if (validTypes.includes(file.type)) return true;
      // Fallback: check file extension for edge cases where MIME type is empty
      const fileName = file.name.toLowerCase();
      return validExtensions.some(ext => fileName.endsWith(ext));
    };

    // Handle folder drops - readEntries may not return all files in one call
    const traverseDirectory = async (entry: FileSystemEntry): Promise<File[]> => {
      const files: File[] = [];
      if (entry.isFile) {
        const fileEntry = entry as FileSystemFileEntry;
        const file = await new Promise<File>((resolve) => {
          fileEntry.file(resolve);
        });
        if (isValidFile(file)) {
          files.push(file);
        }
      } else if (entry.isDirectory) {
        const dirEntry = entry as FileSystemDirectoryEntry;
        const reader = dirEntry.createReader();
        
        // readEntries must be called repeatedly until it returns empty array
        const readAllEntries = async (): Promise<FileSystemEntry[]> => {
          const allEntries: FileSystemEntry[] = [];
          let batch: FileSystemEntry[];
          do {
            batch = await new Promise<FileSystemEntry[]>((resolve) => {
              reader.readEntries(resolve);
            });
            allEntries.push(...batch);
          } while (batch.length > 0);
          return allEntries;
        };

        const entries = await readAllEntries();
        for (const childEntry of entries) {
          const childFiles = await traverseDirectory(childEntry);
          files.push(...childFiles);
        }
      }
      return files;
    };

    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry();
      if (entry) {
        const foundFiles = await traverseDirectory(entry);
        policyFiles.push(...foundFiles);
      }
    }

    if (policyFiles.length === 0) {
      toast.error("No PDF or Word documents found in the dropped folder");
      return;
    }

    const parsedFiles: ParsedPolicy[] = policyFiles.map(file => ({
      file,
      status: "pending",
      selected: true,
    }));

    setFiles(parsedFiles);
    toast.success(`Found ${policyFiles.length} policy documents`);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    const policyFiles: ParsedPolicy[] = Array.from(selectedFiles)
      .filter(file => validTypes.includes(file.type))
      .map(file => ({
        file,
        status: "pending",
        selected: true,
      }));

    if (policyFiles.length === 0) {
      toast.error("No PDF or Word documents found");
      return;
    }

    setFiles(policyFiles);
    toast.success(`Selected ${policyFiles.length} policy documents`);
  };

  const analyzeDocument = async (file: File): Promise<{
    metadata: any;
    summary: string;
    sqfMappings: any[];
  } | null> => {
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

      const { data, error } = await supabase.functions.invoke("analyze-policy-sqf", {
        body: {
          fileBase64,
          fileName: file.name,
          mimeType: file.type,
          editionId: selectedEditionId,
        },
      });

      if (error) throw error;

      if (data?.success) {
        return {
          metadata: data.document_metadata || {},
          summary: data.policy_summary || "",
          sqfMappings: data.mappings || [],
        };
      }
      
      throw new Error(data?.error || "Analysis failed");
    } catch (error) {
      console.error("Analysis error:", error);
      return null;
    }
  };

  const checkForDuplicate = (policyNumber?: string, title?: string): { id: string; title: string } | null => {
    if (!existingPolicies) return null;
    
    // Check by policy number first
    if (policyNumber) {
      const byNumber = existingPolicies.find(p => 
        p.policy_number?.toLowerCase() === policyNumber.toLowerCase()
      );
      if (byNumber) return { id: byNumber.id, title: byNumber.title };
    }
    
    // Check by similar title
    if (title) {
      const byTitle = existingPolicies.find(p => 
        p.title.toLowerCase() === title.toLowerCase()
      );
      if (byTitle) return { id: byTitle.id, title: byTitle.title };
    }
    
    return null;
  };

  const startAnalysis = async () => {
    if (!selectedEditionId) {
      toast.error("Please select an SQF Edition first");
      return;
    }

    setStep("analyze");
    setIsProcessing(true);
    
    const updatedFiles = [...files];
    
    for (let i = 0; i < updatedFiles.length; i++) {
      setCurrentFileIndex(i);
      setOverallProgress(Math.round((i / updatedFiles.length) * 100));
      
      updatedFiles[i].status = "analyzing";
      setFiles([...updatedFiles]);
      
      const result = await analyzeDocument(updatedFiles[i].file);
      
      if (result) {
        updatedFiles[i].metadata = result.metadata;
        updatedFiles[i].summary = result.summary;
        updatedFiles[i].sqfMappings = result.sqfMappings;
        
        // Check for duplicates
        const duplicate = checkForDuplicate(
          result.metadata.extracted_policy_number,
          result.metadata.extracted_title
        );
        
        if (duplicate) {
          updatedFiles[i].status = "duplicate";
          updatedFiles[i].existingPolicyId = duplicate.id;
          updatedFiles[i].existingPolicyTitle = duplicate.title;
          updatedFiles[i].duplicateAction = "skip"; // Default action
        } else {
          updatedFiles[i].status = "analyzed";
        }
      } else {
        updatedFiles[i].status = "error";
        updatedFiles[i].error = "Failed to analyze document";
      }
      
      setFiles([...updatedFiles]);
    }
    
    setOverallProgress(100);
    setIsProcessing(false);
    setStep("review");
  };

  const handleDuplicateAction = (index: number, action: "skip" | "version" | "import") => {
    const updated = [...files];
    updated[index].duplicateAction = action;
    setFiles(updated);
  };

  const toggleFileSelection = (index: number) => {
    const updated = [...files];
    updated[index].selected = !updated[index].selected;
    setFiles(updated);
  };

  const startImport = async () => {
    setStep("import");
    setIsProcessing(true);
    
    const results = { success: 0, skipped: 0, failed: 0 };
    const updatedFiles = [...files];
    const { data: user } = await supabase.auth.getUser();
    
    for (let i = 0; i < updatedFiles.length; i++) {
      const file = updatedFiles[i];
      
      if (!file.selected) {
        updatedFiles[i].status = "skipped";
        results.skipped++;
        setFiles([...updatedFiles]);
        continue;
      }
      
      if (file.status === "duplicate" && file.duplicateAction === "skip") {
        updatedFiles[i].status = "skipped";
        results.skipped++;
        setFiles([...updatedFiles]);
        continue;
      }
      
      if (file.status === "error") {
        results.failed++;
        continue;
      }

      setCurrentFileIndex(i);
      setOverallProgress(Math.round((i / updatedFiles.length) * 100));
      
      try {
        // Map type and category
        let typeId = types.find(t => t.code_prefix === "POL")?.id;
        if (file.metadata?.suggested_document_type) {
          const typeMap: Record<string, string> = {
            policy: "POL", sop: "SOP", work_instruction: "WI", form: "FRM", manual: "MAN"
          };
          const prefix = typeMap[file.metadata.suggested_document_type];
          if (prefix) {
            typeId = types.find(t => t.code_prefix === prefix)?.id || typeId;
          }
        }

        let categoryId: string | null = null;
        if (file.metadata?.suggested_category) {
          const categoryMap: Record<string, string> = {
            food_safety: "Food Safety", quality: "Quality", operations: "Operations",
            hr: "Human Resources", health_safety: "Health & Safety", compliance: "Compliance"
          };
          const categoryName = categoryMap[file.metadata.suggested_category];
          categoryId = categories.find(c => c.name === categoryName)?.id || null;
        }

        // Generate policy number if not extracted
        let policyNumber = file.metadata?.extracted_policy_number;
        if (!policyNumber) {
          const typePrefix = types.find(t => t.id === typeId)?.code_prefix || "POL";
          policyNumber = `${typePrefix}-${Date.now()}`; 
        }

        // Create policy
        const { data: newPolicy, error: policyError } = await supabase
          .from("policies")
          .insert({
            policy_number: policyNumber,
            title: file.metadata?.extracted_title || file.file.name.replace(/\.[^/.]+$/, ""),
            summary: file.summary || null,
            type_id: typeId,
            category_id: categoryId,
            effective_date: file.metadata?.extracted_effective_date || null,
            review_date: file.metadata?.extracted_review_date || null,
            status: "draft",
            created_by: user.user?.id,
          })
          .select()
          .single();

        if (policyError) throw policyError;

        // Upload file attachment
        const filePath = `${newPolicy.id}/${Date.now()}_${file.file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("policy-attachments")
          .upload(filePath, file.file);

        if (!uploadError) {
          await supabase.from("policy_attachments").insert({
            policy_id: newPolicy.id,
            file_name: file.file.name,
            file_path: filePath,
            file_type: file.file.type,
            file_size: file.file.size,
            uploaded_by: user.user?.id,
          });
        }

        // Save SQF mappings
        if (file.sqfMappings && file.sqfMappings.length > 0) {
          const mappingsToInsert = file.sqfMappings.map((m: any) => ({
            policy_id: newPolicy.id,
            sqf_code_id: m.sqf_code_id,
            compliance_status: m.compliance_status,
            gap_description: m.gap_description || null,
            notes: m.explanation,
            created_by: user.user?.id,
          }));

          await supabase.from("policy_sqf_mappings").upsert(mappingsToInsert, {
            onConflict: "policy_id,sqf_code_id",
          });
        }

        updatedFiles[i].status = "imported";
        results.success++;
      } catch (error) {
        console.error("Import error:", error);
        updatedFiles[i].status = "error";
        updatedFiles[i].error = "Failed to import";
        results.failed++;
      }
      
      setFiles([...updatedFiles]);
    }
    
    setOverallProgress(100);
    setImportResults(results);
    setIsProcessing(false);
    setStep("complete");
    
    // Refresh policies list
    await queryClient.invalidateQueries({ queryKey: ["policies"] });
    await queryClient.invalidateQueries({ queryKey: ["policy-sqf-mappings"] });
    await queryClient.invalidateQueries({ queryKey: ["sqf-compliance-summary"] });
  };

  const resetDialog = () => {
    setStep("upload");
    setFiles([]);
    setCurrentFileIndex(0);
    setOverallProgress(0);
    setIsProcessing(false);
    setImportResults({ success: 0, skipped: 0, failed: 0 });
  };

  const handleClose = () => {
    resetDialog();
    onOpenChange(false);
  };

  const getStatusIcon = (status: ParsedPolicy["status"]) => {
    switch (status) {
      case "pending": return <FileText className="h-4 w-4 text-muted-foreground" />;
      case "analyzing": return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      case "analyzed": return <CheckCircle2 className="h-4 w-4 text-primary" />;
      case "imported": return <CheckCircle2 className="h-4 w-4 text-primary" />;
      case "duplicate": return <AlertTriangle className="h-4 w-4 text-accent-foreground" />;
      case "error": return <XCircle className="h-4 w-4 text-destructive" />;
      case "skipped": return <XCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: ParsedPolicy["status"]) => {
    switch (status) {
      case "pending": return <Badge variant="secondary">Pending</Badge>;
      case "analyzing": return <Badge variant="secondary" className="bg-accent text-accent-foreground">Analyzing</Badge>;
      case "analyzed": return <Badge variant="secondary" className="bg-primary/10 text-primary">Ready</Badge>;
      case "imported": return <Badge variant="secondary" className="bg-primary/10 text-primary">Imported</Badge>;
      case "duplicate": return <Badge variant="secondary" className="bg-secondary text-secondary-foreground">Duplicate</Badge>;
      case "error": return <Badge variant="destructive">Error</Badge>;
      case "skipped": return <Badge variant="secondary">Skipped</Badge>;
    }
  };

  const analyzedCount = files.filter(f => f.status === "analyzed" || f.status === "duplicate").length;
  const duplicateCount = files.filter(f => f.status === "duplicate").length;
  const selectedCount = files.filter(f => f.selected && f.status !== "error").length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Bulk Policy Import
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "Drag and drop a folder or select multiple policy documents to import"}
            {step === "analyze" && `Analyzing documents (${currentFileIndex + 1}/${files.length})`}
            {step === "review" && `Review ${files.length} documents before importing`}
            {step === "import" && `Importing policies (${currentFileIndex + 1}/${files.length})`}
            {step === "complete" && "Import complete"}
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        {(step === "analyze" || step === "import") && (
          <div className="space-y-2">
            <Progress value={overallProgress} className="h-2" />
            <p className="text-sm text-muted-foreground text-center">
              {step === "analyze" ? "Analyzing" : "Importing"}: {files[currentFileIndex]?.file.name}
            </p>
          </div>
        )}

        <div className="flex-1 overflow-hidden">
          {/* Step 1: Upload */}
          {step === "upload" && (
            <div className="space-y-4">
              {/* Edition selector */}
              <div className="space-y-2">
                <Label>SQF Edition for Mapping</Label>
                <Select value={selectedEditionId} onValueChange={setSelectedEditionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select SQF Edition" />
                  </SelectTrigger>
                  <SelectContent>
                    {sqfEditions?.map((edition) => (
                      <SelectItem key={edition.id} value={edition.id}>
                        {edition.name} {edition.is_active && "(Active)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Drop zone */}
              <div
                className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                  isDragOver
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <FolderOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">
                  Drag & drop a folder here
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Or select multiple files manually
                </p>
                <input
                  ref={folderInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => folderInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Select Files
                </Button>
              </div>

              {/* File list preview */}
              {files.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium">{files.length} documents selected</span>
                      <Button variant="ghost" size="sm" onClick={() => setFiles([])}>
                        Clear
                      </Button>
                    </div>
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2">
                        {files.map((file, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate flex-1">{file.file.name}</span>
                            <span className="text-muted-foreground">
                              {(file.file.size / 1024).toFixed(1)} KB
                            </span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Step 2 & 3: Review */}
          {(step === "analyze" || step === "review") && (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3 pr-4">
                {files.map((file, index) => (
                  <Card key={index} className={file.selected ? "" : "opacity-50"}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={file.selected}
                          onCheckedChange={() => toggleFileSelection(index)}
                          disabled={step === "analyze" || file.status === "error"}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusIcon(file.status)}
                            <span className="font-medium truncate">
                              {file.metadata?.extracted_title || file.file.name}
                            </span>
                            {getStatusBadge(file.status)}
                          </div>
                          
                          {file.metadata?.extracted_policy_number && (
                            <p className="text-sm text-muted-foreground">
                              Policy #: {file.metadata.extracted_policy_number}
                            </p>
                          )}
                          
                          {file.sqfMappings && file.sqfMappings.length > 0 && (
                            <p className="text-sm text-muted-foreground">
                              <Sparkles className="h-3 w-3 inline mr-1" />
                              {file.sqfMappings.length} SQF code mappings found
                            </p>
                          )}
                          
                          {file.status === "duplicate" && (
                            <div className="mt-2 p-2 bg-secondary rounded border border-border">
                              <p className="text-sm text-secondary-foreground mb-2">
                                Matches existing: "{file.existingPolicyTitle}"
                              </p>
                              <Select
                                value={file.duplicateAction}
                                onValueChange={(value: "skip" | "version" | "import") => 
                                  handleDuplicateAction(index, value)
                                }
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="skip">Skip this file</SelectItem>
                                  <SelectItem value="import">Import as new policy</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          
                          {file.error && (
                            <p className="text-sm text-destructive mt-1">{file.error}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Step 4: Import progress */}
          {step === "import" && (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2 pr-4">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center gap-3 py-2 border-b">
                    {getStatusIcon(file.status)}
                    <span className="flex-1 truncate text-sm">
                      {file.metadata?.extracted_title || file.file.name}
                    </span>
                    {getStatusBadge(file.status)}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Step 5: Complete */}
          {step === "complete" && (
            <div className="text-center py-8">
              <CheckCircle2 className="h-16 w-16 mx-auto text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-4">Import Complete!</h3>
              <div className="flex justify-center gap-8 mb-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">{importResults.success}</p>
                  <p className="text-sm text-muted-foreground">Imported</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-muted-foreground">{importResults.skipped}</p>
                  <p className="text-sm text-muted-foreground">Skipped</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-destructive">{importResults.failed}</p>
                  <p className="text-sm text-muted-foreground">Failed</p>
                </div>
              </div>
              {importResults.success > 0 && (
                <Alert>
                  <AlertDescription>
                    All imported policies are saved as drafts. Review and approve them from the Policies list.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {step === "upload" && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={startAnalysis} 
                disabled={files.length === 0 || !selectedEditionId}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Analyze {files.length} Documents
              </Button>
            </>
          )}
          
          {step === "review" && (
            <>
              <Button variant="outline" onClick={resetDialog}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Start Over
              </Button>
              <Button 
                onClick={startImport} 
                disabled={selectedCount === 0}
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Import {selectedCount} Policies
              </Button>
            </>
          )}
          
          {step === "complete" && (
            <Button onClick={handleClose}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
