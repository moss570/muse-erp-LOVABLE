import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, Loader2, Sparkles, AlertCircle, CheckCircle } from "lucide-react";
import { useCreateSQFEdition } from "@/hooks/useSQF";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQueryClient } from "@tanstack/react-query";

interface SQFEditionUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PASS_DESCRIPTIONS = [
  { pass: 1, description: "Extracting System Elements (Module 2)..." },
  { pass: 2, description: "Extracting Food Safety Plans (Modules 3-9)..." },
  { pass: 3, description: "Extracting Good Manufacturing Practices (Modules 10-15)..." },
];

export default function SQFEditionUploadDialog({ open, onOpenChange }: SQFEditionUploadDialogProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [currentPass, setCurrentPass] = useState(0);
  const [passResults, setPassResults] = useState<{ pass: number; codes: number }[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    version: "",
    effective_date: "",
    edition_date: "",
    notes: "",
    is_active: true,
    parse_with_ai: true,
  });

  const createEdition = useCreateSQFEdition();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== "application/pdf") {
        toast.error("Please upload a PDF file");
        return;
      }
      setFile(selectedFile);
      // Auto-fill name from filename
      if (!formData.name) {
        const nameWithoutExt = selectedFile.name.replace(/\.pdf$/i, "");
        setFormData(prev => ({ ...prev, name: nameWithoutExt }));
      }
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.version) {
      toast.error("Please fill in required fields");
      return;
    }

    setIsUploading(true);
    setUploadProgress(5);
    setPassResults([]);
    setCurrentPass(0);

    try {
      let filePath = null;
      let fileUrl = null;

      // Upload file if provided
      if (file) {
        const fileExt = file.name.split(".").pop();
        filePath = `sqf-editions/${Date.now()}.${fileExt}`;
        
        setUploadProgress(10);
        
        const { error: uploadError } = await supabase.storage
          .from("policy-attachments")
          .upload(filePath, file);

        if (uploadError) {
          console.warn("Storage upload failed:", uploadError);
          // Continue without file storage
        } else {
          const { data: urlData } = supabase.storage
            .from("policy-attachments")
            .getPublicUrl(filePath);
          fileUrl = urlData?.publicUrl;
        }
        
        setUploadProgress(15);
      }

      // Create edition record
      const edition = await createEdition.mutateAsync({
        name: formData.name,
        version: formData.version,
        effective_date: formData.effective_date || undefined,
        edition_date: formData.edition_date || undefined,
        is_active: formData.is_active,
      } as any);

      setUploadProgress(20);

      // Parse with AI if enabled and file was uploaded
      if (formData.parse_with_ai && file && edition?.id) {
        setIsParsing(true);

        try {
          // Convert PDF to Base64 for multimodal AI processing
          const pdfBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              // Remove data URL prefix (e.g., "data:application/pdf;base64,")
              const base64 = result.split(',')[1];
              resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          
          if (!pdfBase64) {
            toast.warning("Could not read PDF file. You may need to add codes manually.");
          } else {
            // Sequential pass extraction - each pass is a separate function call
            let totalCodesExtracted = 0;
            let allPassesSuccessful = true;

            for (let pass = 1; pass <= 3; pass++) {
              setCurrentPass(pass);
              // Progress: 20% (start) + pass contribution (each pass = ~25% of remaining 80%)
              setUploadProgress(20 + (pass - 1) * 25);

              try {
                console.log(`Starting pass ${pass}...`);
                
                const { data, error } = await supabase.functions.invoke("parse-sqf-pass", {
                  body: { 
                    pdfBase64,
                    edition_id: edition.id,
                    pass_number: pass,
                  },
                });

                if (error) {
                  console.error(`Pass ${pass} error:`, error);
                  toast.error(`Pass ${pass} failed: ${error.message}`);
                  allPassesSuccessful = false;
                  break;
                }

                if (data?.success) {
                  const codesFromPass = data.codes_extracted || 0;
                  totalCodesExtracted += codesFromPass;
                  setPassResults(prev => [...prev, { pass, codes: codesFromPass }]);
                  console.log(`Pass ${pass} complete: ${codesFromPass} codes extracted`);
                  
                  // Update progress after each successful pass
                  setUploadProgress(20 + pass * 25);
                } else {
                  console.error(`Pass ${pass} returned error:`, data?.error);
                  toast.error(`Pass ${pass} failed: ${data?.error || "Unknown error"}`);
                  allPassesSuccessful = false;
                  break;
                }
              } catch (passError) {
                console.error(`Pass ${pass} exception:`, passError);
                toast.error(`Pass ${pass} failed unexpectedly`);
                allPassesSuccessful = false;
                break;
              }
            }

            if (allPassesSuccessful) {
              toast.success(`AI extraction complete: ${totalCodesExtracted} SQF codes extracted`);
            } else {
              toast.warning(`Partial extraction: ${totalCodesExtracted} codes extracted before failure`);
            }
          }
        } catch (parseError) {
          console.error("Parse error:", parseError);
          toast.warning("Edition created but AI parsing failed");
        }
        
        setIsParsing(false);
      }

      setUploadProgress(100);
      
      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ["sqf-editions"] });
      await queryClient.invalidateQueries({ queryKey: ["sqf-codes"] });
      
      toast.success("SQF Edition created successfully");
      
      // Reset and close
      setFile(null);
      setFormData({
        name: "",
        version: "",
        effective_date: "",
        edition_date: "",
        notes: "",
        is_active: true,
        parse_with_ai: true,
      });
      setCurrentPass(0);
      setPassResults([]);
      onOpenChange(false);

    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to create SQF edition");
    } finally {
      setIsUploading(false);
      setIsParsing(false);
      setUploadProgress(0);
    }
  };

  const getCurrentPassDescription = () => {
    if (currentPass === 0) return "Preparing...";
    const passInfo = PASS_DESCRIPTIONS.find(p => p.pass === currentPass);
    return passInfo?.description || `Processing pass ${currentPass}...`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload SQF Edition</DialogTitle>
          <DialogDescription>
            Upload the SQF Code PDF to import requirements. AI will automatically extract codes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload */}
          <div>
            <Label>SQF Code Document (PDF)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary hover:bg-accent/50 transition-colors"
            >
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="h-6 w-6 text-primary" />
                  <span className="font-medium">{file.name}</span>
                  <span className="text-sm text-muted-foreground">
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">PDF files only</p>
                </div>
              )}
            </div>
          </div>

          {/* Edition Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Edition Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., SQF Food Safety Code Edition 9"
              />
            </div>

            <div>
              <Label htmlFor="version">Version *</Label>
              <Input
                id="version"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                placeholder="e.g., 9.0"
              />
            </div>

            <div>
              <Label htmlFor="edition_date">Edition Date</Label>
              <Input
                id="edition_date"
                type="date"
                value={formData.edition_date}
                onChange={(e) => setFormData({ ...formData, edition_date: e.target.value })}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="effective_date">Effective Date</Label>
              <Input
                id="effective_date"
                type="date"
                value={formData.effective_date}
                onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about this edition..."
                rows={2}
              />
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <div>
                <Label>Set as Active Edition</Label>
                <p className="text-sm text-muted-foreground">
                  Make this the current SQF code edition
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>

            {file && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <div>
                    <Label>AI Code Extraction</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically extract SQF codes from PDF
                    </p>
                  </div>
                </div>
                <Switch
                  checked={formData.parse_with_ai}
                  onCheckedChange={(checked) => setFormData({ ...formData, parse_with_ai: checked })}
                />
              </div>
            )}
          </div>

          {/* Progress */}
          {(isUploading || isParsing) && (
            <div className="space-y-3">
              <Progress value={uploadProgress} />
              <p className="text-sm text-center text-muted-foreground">
                {isParsing ? getCurrentPassDescription() : "Uploading..."}
              </p>
              
              {/* Pass Progress Indicators */}
              {isParsing && (
                <div className="space-y-2 pt-2">
                  {PASS_DESCRIPTIONS.map(({ pass, description }) => {
                    const passResult = passResults.find(r => r.pass === pass);
                    const isActive = currentPass === pass;
                    const isComplete = passResult !== undefined;
                    
                    return (
                      <div 
                        key={pass}
                        className={`flex items-center gap-2 text-sm ${
                          isActive ? 'text-primary font-medium' : 
                          isComplete ? 'text-muted-foreground' : 'text-muted-foreground/50'
                        }`}
                      >
                        {isComplete ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : isActive ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border border-muted-foreground/30" />
                        )}
                        <span>
                          Pass {pass}: {description.replace('...', '')}
                          {isComplete && ` (${passResult.codes} codes)`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* AI Note */}
          {file && formData.parse_with_ai && !isParsing && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                AI extraction uses 3 sequential passes (3-5 minutes total) to ensure all modules are captured.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading || isParsing}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!formData.name || !formData.version || isUploading || isParsing}
          >
            {isUploading || isParsing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isParsing ? `Pass ${currentPass}/3...` : "Uploading..."}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Edition
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
