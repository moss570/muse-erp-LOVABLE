import { useState, useRef, DragEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, FileText, Loader2, Sparkles, Check, AlertTriangle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MappingResult {
  code_number: string;
  sqf_code_id: string;
  sqf_code_title: string;
  compliance_status: "compliant" | "partial" | "gap";
  explanation: string;
  gap_description?: string;
  is_mandatory: boolean;
  selected: boolean;
}

interface PolicySQFMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editionId: string;
  policyId?: string; // If provided, mappings will be saved to this policy
  policyName?: string;
}

export default function PolicySQFMappingDialog({ 
  open, 
  onOpenChange, 
  editionId,
  policyId,
  policyName,
}: PolicySQFMappingDialogProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    policy_summary: string;
    suggested_category: string;
    mappings: MappingResult[];
  } | null>(null);

  const validTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  const validateAndSetFile = (selectedFile: File) => {
    if (!validTypes.includes(selectedFile.type)) {
      toast.error("Please upload a PDF or Word document");
      return;
    }
    setFile(selectedFile);
    setAnalysisResult(null);
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
    
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;

    setIsAnalyzing(true);
    setProgress(10);

    try {
      // Convert file to Base64
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

      setProgress(30);

      const { data, error } = await supabase.functions.invoke("analyze-policy-sqf", {
        body: {
          fileBase64,
          fileName: file.name,
          mimeType: file.type,
          policyId,
          editionId,
        },
      });

      setProgress(80);

      if (error) {
        console.error("Analysis error:", error);
        toast.error("Failed to analyze document");
        return;
      }

      if (data?.success && data?.mappings) {
        const mappingsWithSelection = data.mappings.map((m: any) => ({
          ...m,
          selected: true, // Default all mappings to selected
        }));
        
        setAnalysisResult({
          policy_summary: data.policy_summary,
          suggested_category: data.suggested_category,
          mappings: mappingsWithSelection,
        });
        
        toast.success(`AI found ${data.mappings.length} SQF code mappings`);
      } else if (data?.error) {
        toast.error(data.error);
      }

      setProgress(100);
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Failed to analyze document");
    } finally {
      setIsAnalyzing(false);
      setProgress(0);
    }
  };

  const toggleMapping = (index: number) => {
    if (!analysisResult) return;
    const updated = [...analysisResult.mappings];
    updated[index].selected = !updated[index].selected;
    setAnalysisResult({ ...analysisResult, mappings: updated });
  };

  const handleSaveMappings = async () => {
    if (!analysisResult || !policyId) return;

    const selectedMappings = analysisResult.mappings.filter(m => m.selected);
    if (selectedMappings.length === 0) {
      toast.error("Please select at least one mapping to save");
      return;
    }

    setIsSaving(true);
    try {
      const { data: user } = await supabase.auth.getUser();

      // Insert all selected mappings
      const mappingsToInsert = selectedMappings.map(m => ({
        policy_id: policyId,
        sqf_code_id: m.sqf_code_id,
        compliance_status: m.compliance_status,
        gap_description: m.gap_description || null,
        notes: m.explanation,
        created_by: user.user?.id,
      }));

      const { error } = await supabase
        .from("policy_sqf_mappings")
        .upsert(mappingsToInsert, {
          onConflict: "policy_id,sqf_code_id",
        });

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["policy-sqf-mappings"] });
      await queryClient.invalidateQueries({ queryKey: ["sqf-compliance-summary"] });
      
      toast.success(`Saved ${selectedMappings.length} SQF code mappings`);
      onOpenChange(false);
      resetDialog();
    } catch (error) {
      console.error("Error saving mappings:", error);
      toast.error("Failed to save mappings");
    } finally {
      setIsSaving(false);
    }
  };

  const resetDialog = () => {
    setFile(null);
    setAnalysisResult(null);
    setProgress(0);
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
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetDialog();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Policy Analysis
            </div>
          </DialogTitle>
          <DialogDescription>
            Upload a policy document and AI will analyze which SQF codes it addresses
            {policyName && <span className="font-medium"> for "{policyName}"</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!analysisResult ? (
            <>
              {/* File Upload */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragOver 
                      ? 'border-primary bg-primary/10' 
                      : 'hover:border-primary hover:bg-accent/50'
                  }`}
                >
                  {file ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="h-8 w-8 text-primary" />
                      <div className="text-left">
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                      <p className="text-muted-foreground">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">PDF or Word documents</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress */}
              {isAnalyzing && (
                <div className="space-y-2">
                  <Progress value={progress} />
                  <p className="text-sm text-center text-muted-foreground">
                    AI is analyzing your document...
                  </p>
                </div>
              )}

              <Alert>
                <Sparkles className="h-4 w-4" />
                <AlertDescription>
                  AI will read your policy document and identify which SQF codes it addresses, along with compliance status for each.
                </AlertDescription>
              </Alert>
            </>
          ) : (
            <>
              {/* Analysis Results */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2">Policy Summary</h4>
                <p className="text-sm text-muted-foreground">{analysisResult.policy_summary}</p>
                {analysisResult.suggested_category && (
                  <Badge variant="outline" className="mt-2">
                    Suggested Category: {analysisResult.suggested_category}
                  </Badge>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">SQF Code Mappings ({analysisResult.mappings.length})</h4>
                  <p className="text-sm text-muted-foreground">
                    {analysisResult.mappings.filter(m => m.selected).length} selected
                  </p>
                </div>
                
                <ScrollArea className="h-[300px] border rounded-lg">
                  <div className="p-2 space-y-2">
                    {analysisResult.mappings.map((mapping, index) => (
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
            </>
          )}
        </div>

        <DialogFooter>
          {!analysisResult ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAnalyze} 
                disabled={!file || isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Analyze Document
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={resetDialog}>
                Upload Different File
              </Button>
              {policyId ? (
                <Button onClick={handleSaveMappings} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Save {analysisResult.mappings.filter(m => m.selected).length} Mappings
                    </>
                  )}
                </Button>
              ) : (
                <Button onClick={() => onOpenChange(false)}>
                  Done
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
