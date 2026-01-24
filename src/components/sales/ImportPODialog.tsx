import { useState, useCallback } from 'react';
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useExtractPO, useCreatePendingOrder } from '@/hooks/usePendingOrders';
import { toast } from 'sonner';

interface ImportPODialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type UploadStatus = 'idle' | 'uploading' | 'extracting' | 'saving' | 'complete' | 'error';

export function ImportPODialog({ open, onOpenChange }: ImportPODialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const extractPO = useExtractPO();
  const createPendingOrder = useCreatePendingOrder();

  const resetState = useCallback(() => {
    setFile(null);
    setStatus('idle');
    setProgress(0);
    setErrorMessage('');
  }, []);

  const handleClose = useCallback(() => {
    if (status !== 'uploading' && status !== 'extracting' && status !== 'saving') {
      resetState();
      onOpenChange(false);
    }
  }, [status, onOpenChange, resetState]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        toast.error('Please select a PDF file');
        return;
      }
      setFile(selectedFile);
      setStatus('idle');
      setErrorMessage('');
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (droppedFile.type !== 'application/pdf') {
        toast.error('Please drop a PDF file');
        return;
      }
      setFile(droppedFile);
      setStatus('idle');
      setErrorMessage('');
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleUpload = async () => {
    if (!file) return;

    try {
      // Step 1: Upload PDF to storage
      setStatus('uploading');
      setProgress(10);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `manual/${timestamp}_${sanitizedFilename}`;

      const { error: uploadError } = await supabase.storage
        .from('incoming-purchase-orders')
        .upload(storagePath, file, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (uploadError) throw uploadError;
      setProgress(30);

      // Step 2: Convert to base64 and extract
      setStatus('extracting');
      setProgress(40);

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setProgress(50);

      const extractedData = await extractPO.mutateAsync({
        pdfBase64: base64,
        mimeType: 'application/pdf',
      });

      setProgress(80);

      // Step 3: Create pending order record
      setStatus('saving');
      
      await createPendingOrder.mutateAsync({
        pdf_storage_path: storagePath,
        pdf_filename: file.name,
        raw_extracted_data: extractedData,
        extraction_status: 'completed',
      });

      setProgress(100);
      setStatus('complete');
      toast.success('Purchase order imported successfully');

      // Auto-close after success
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (error) {
      console.error('Import failed:', error);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Import failed');
      toast.error('Failed to import purchase order');
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'uploading':
        return 'Uploading PDF...';
      case 'extracting':
        return 'Extracting order details with AI...';
      case 'saving':
        return 'Saving order...';
      case 'complete':
        return 'Import complete!';
      case 'error':
        return 'Import failed';
      default:
        return '';
    }
  };

  const isProcessing = ['uploading', 'extracting', 'saving'].includes(status);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Customer PO</DialogTitle>
          <DialogDescription>
            Upload a PDF purchase order from a customer. AI will extract the order details automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Drop Zone */}
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${file ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
              ${isProcessing ? 'opacity-50 pointer-events-none' : 'cursor-pointer hover:border-primary/50'}
            `}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => !isProcessing && document.getElementById('pdf-upload')?.click()}
          >
            <input
              id="pdf-upload"
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFileChange}
              disabled={isProcessing}
            />

            {file ? (
              <div className="flex flex-col items-center gap-2">
                <FileText className="h-12 w-12 text-primary" />
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-12 w-12 text-muted-foreground" />
                <p className="font-medium">Drop PDF here or click to browse</p>
                <p className="text-sm text-muted-foreground">
                  Max file size: 10MB
                </p>
              </div>
            )}
          </div>

          {/* Progress */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">{getStatusText()}</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Success */}
          {status === 'complete' && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span>Import complete!</span>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>{errorMessage || 'Import failed'}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || isProcessing || status === 'complete'}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
