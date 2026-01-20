import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Camera, Upload, X, FileText, Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReceivingLot {
  id: string;
  internal_lot_number: string;
  supplier_lot_number: string | null;
  material: {
    id: string;
    name: string;
    requires_coa?: boolean;
    coa_spec_template?: any;
  } | null;
}

interface ValidationResult {
  passed: boolean;
  confidence: number;
  lot_number_match: boolean;
  specs_match: boolean;
  extracted_data: {
    lot_number?: string;
    manufacturer?: string;
    product_name?: string;
    batch_date?: string;
    best_by?: string;
    parameters?: Array<{
      name: string;
      spec: string;
      value: string;
      pass: boolean;
    }>;
  };
  issues: string[];
}

interface COAUploadDialogProps {
  receivingLot: ReceivingLot;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function COAUploadDialog({ receivingLot, open, onOpenChange, onSuccess }: COAUploadDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleCameraCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('capture', 'environment');
      fileInputRef.current.setAttribute('accept', 'image/*');
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.setAttribute('accept', 'application/pdf,image/*');
      fileInputRef.current.click();
    }
  };

  // AI Processing function - simulated for now
  const processWithAI = async (coaDocId: string, filePath: string): Promise<ValidationResult> => {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock validation result - in production this would call an AI edge function
    const mockResponse: ValidationResult = {
      passed: Math.random() > 0.3, // 70% pass rate for demo
      confidence: 85 + Math.floor(Math.random() * 15),
      lot_number_match: true,
      specs_match: Math.random() > 0.2,
      extracted_data: {
        lot_number: receivingLot.supplier_lot_number || 'LOT-2026-001',
        manufacturer: "Supplier Manufacturing Co.",
        product_name: receivingLot.material?.name || 'Unknown Material',
        batch_date: "2026-01-15",
        best_by: "2026-07-15",
        parameters: [
          { name: "Fat Content", spec: "38-42%", value: "40.2%", pass: true },
          { name: "Total Solids", spec: "Min 35%", value: "36.8%", pass: true },
          { name: "Moisture", spec: "Max 65%", value: "63.2%", pass: true },
          { name: "pH Level", spec: "6.4-6.8", value: "6.5", pass: true }
        ]
      },
      issues: []
    };

    // If failed, add issues
    if (!mockResponse.passed) {
      mockResponse.issues = ["One or more specifications outside acceptable range"];
      if (mockResponse.extracted_data.parameters) {
        mockResponse.extracted_data.parameters[1] = {
          name: "Total Solids",
          spec: "Min 35%",
          value: "32.1%",
          pass: false
        };
      }
    }

    // Update COA document with results
    await supabase
      .from('receiving_coa_documents')
      .update({
        ai_processed: true,
        ai_processed_at: new Date().toISOString(),
        ai_extracted_data: mockResponse.extracted_data as any,
        ai_validation_result: mockResponse as any,
        ai_confidence_score: mockResponse.confidence,
        validation_status: mockResponse.passed ? 'passed' : 'failed',
        lot_number_match: mockResponse.lot_number_match,
        specs_match: mockResponse.specs_match
      })
      .eq('id', coaDocId);

    // If validation failed, auto-place on hold
    if (!mockResponse.passed) {
      const holdReasonCode = mockResponse.lot_number_match ? 'COA_MISMATCH' : 'COA_LOT_MISMATCH';
      
      const { data: holdReason } = await supabase
        .from('hold_reason_codes')
        .select('id')
        .eq('code', holdReasonCode)
        .single();

      if (holdReason) {
        await supabase.from('inventory_holds').insert({
          receiving_lot_id: receivingLot.id,
          hold_reason_code_id: holdReason.id,
          hold_reason_description: mockResponse.issues.join('; '),
          auto_hold: true,
          priority: 'high',
          hold_placed_by: user?.id
        });

        await supabase
          .from('receiving_lots')
          .update({ hold_status: 'on_hold' })
          .eq('id', receivingLot.id);
      }
    }

    return mockResponse;
  };

  // Upload and process COA
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (files.length === 0) throw new Error('No files selected');
      
      setUploading(true);
      
      // Upload to Supabase storage
      const fileName = `coa_${receivingLot.id}_${Date.now()}.${files[0].name.split('.').pop()}`;
      const filePath = `${receivingLot.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('coa-documents')
        .upload(filePath, files[0], {
          contentType: files[0].type,
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Create COA document record
      const { data: coaDoc, error: coaError } = await supabase
        .from('receiving_coa_documents')
        .insert({
          receiving_lot_id: receivingLot.id,
          file_path: filePath,
          file_name: files[0].name,
          file_size: files[0].size,
          page_count: files.length,
          mime_type: files[0].type,
          uploaded_by: user?.id,
          validation_status: 'processing'
        })
        .select()
        .single();

      if (coaError) throw coaError;

      setUploading(false);
      setProcessing(true);

      // Call AI validation
      const validationResponse = await processWithAI(coaDoc.id, filePath);
      
      setProcessing(false);
      setValidationResult(validationResponse);

      return { coaDoc, validationResponse };
    },
    onSuccess: ({ validationResponse }) => {
      if (validationResponse.passed) {
        toast.success('COA validated successfully');
      } else {
        toast.error('COA validation failed - lot placed on hold');
      }
      queryClient.invalidateQueries({ queryKey: ['receiving-lot'] });
      queryClient.invalidateQueries({ queryKey: ['coa-documents'] });
      queryClient.invalidateQueries({ queryKey: ['hold-log'] });
    },
    onError: (error) => {
      setUploading(false);
      setProcessing(false);
      toast.error(`Upload failed: ${error.message}`);
    }
  });

  const handleClose = () => {
    setFiles([]);
    setValidationResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Upload COA - Lot #{receivingLot?.internal_lot_number}
          </DialogTitle>
          <DialogDescription>
            Scan or upload the Certificate of Analysis. Multi-page documents supported.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Lot Info */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Material:</span>
                  <span className="ml-2 font-medium">{receivingLot?.material?.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Supplier Lot #:</span>
                  <span className="ml-2 font-mono">{receivingLot?.supplier_lot_number || '-'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Upload Area */}
          {!validationResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-24 flex-col gap-2"
                  onClick={handleCameraCapture}
                  disabled={uploading || processing}
                >
                  <Camera className="h-8 w-8" />
                  <span>Scan Document</span>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-24 flex-col gap-2"
                  onClick={handleFileUpload}
                  disabled={uploading || processing}
                >
                  <Upload className="h-8 w-8" />
                  <span>Upload File</span>
                </Button>
              </div>

              {/* Scanned Pages Preview */}
              {files.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm font-medium mb-3">Selected Files: {files.length}</p>
                    <div className="flex flex-wrap gap-2">
                      {files.map((file, index) => (
                        <div key={index} className="relative group">
                          <div className="w-16 h-20 bg-muted rounded-lg flex flex-col items-center justify-center border">
                            <FileText className="h-6 w-6 text-muted-foreground" />
                            <span className="text-xs mt-1">P{index + 1}</span>
                          </div>
                          <button
                            onClick={() => removeFile(index)}
                            className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Process Button */}
              {files.length > 0 && (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => uploadMutation.mutate()}
                  disabled={uploading || processing}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : processing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing with AI...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Process COA with AI
                    </>
                  )}
                </Button>
              )}
            </div>
          )}

          {/* Validation Results */}
          {validationResult && (
            <div className="space-y-4">
              <Card className={cn(
                "border-2",
                validationResult.passed ? "border-green-500 bg-green-50" : "border-destructive bg-destructive/5"
              )}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    {validationResult.passed ? (
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    ) : (
                      <XCircle className="h-8 w-8 text-destructive" />
                    )}
                    <div>
                      <p className="font-bold text-lg">
                        {validationResult.passed ? 'PASSED' : 'FAILED'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Confidence: {validationResult.confidence}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Spec comparison results */}
              <Card>
                <CardContent className="p-4">
                  <p className="font-medium mb-3">Specification Comparison</p>
                  <div className="space-y-2">
                    {validationResult.extracted_data?.parameters?.map((param, index) => (
                      <div
                        key={index}
                        className={cn(
                          "flex items-center justify-between p-2 rounded-lg",
                          param.pass ? "bg-green-50" : "bg-destructive/10"
                        )}
                      >
                        <div>
                          <p className="font-medium text-sm">{param.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Spec: {param.spec} | COA: {param.value}
                          </p>
                        </div>
                        {param.pass ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-destructive" />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {!validationResult.passed && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This lot has been placed on HOLD. QA has been notified.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {validationResult ? 'Close' : 'Cancel'}
          </Button>
          {validationResult?.passed && (
            <Button onClick={() => { onSuccess(); handleClose(); }}>
              Accept Results
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
