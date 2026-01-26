import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { useCreateSQFEdition } from "@/hooks/useSQF";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SQFEditionUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SQFEditionUploadDialog({ open, onOpenChange }: SQFEditionUploadDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
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
    setUploadProgress(10);

    try {
      let filePath = null;
      let fileUrl = null;

      // Upload file if provided
      if (file) {
        const fileExt = file.name.split(".").pop();
        filePath = `sqf-editions/${Date.now()}.${fileExt}`;
        
        setUploadProgress(30);
        
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
        
        setUploadProgress(50);
      }

      // Create edition record
      const edition = await createEdition.mutateAsync({
        name: formData.name,
        version: formData.version,
        effective_date: formData.effective_date || undefined,
        edition_date: formData.edition_date || undefined,
        is_active: formData.is_active,
      } as any);

      setUploadProgress(70);

      // Parse with AI if enabled and file was uploaded
      if (formData.parse_with_ai && file && edition?.id) {
        setIsParsing(true);
        setUploadProgress(80);

        try {
          const { data, error } = await supabase.functions.invoke("parse-sqf-document", {
            body: { 
              edition_id: edition.id,
              file_url: fileUrl,
            },
          });

          if (error) {
            console.error("AI parsing error:", error);
            toast.warning("Edition created but AI parsing failed. You can add codes manually.");
          } else if (data?.codes_extracted) {
            toast.success(`AI extracted ${data.codes_extracted} SQF codes from the document`);
          }
        } catch (parseError) {
          console.error("Parse error:", parseError);
          toast.warning("Edition created but AI parsing failed");
        }
        
        setIsParsing(false);
      }

      setUploadProgress(100);
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
            <div className="space-y-2">
              <Progress value={uploadProgress} />
              <p className="text-sm text-center text-muted-foreground">
                {isParsing ? "AI is extracting SQF codes..." : "Uploading..."}
              </p>
            </div>
          )}

          {/* AI Note */}
          {file && formData.parse_with_ai && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                AI extraction may take 30-60 seconds depending on document size.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!formData.name || !formData.version || isUploading || isParsing}
          >
            {isUploading || isParsing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isParsing ? "Parsing..." : "Uploading..."}
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
