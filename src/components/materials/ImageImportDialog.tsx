import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileImage, Upload, X, Loader2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFileSelected: (file: File) => void;
  isProcessing?: boolean;
}

export function ImageImportDialog({
  open,
  onOpenChange,
  onFileSelected,
  isProcessing = false,
}: ImageImportDialogProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const processFile = useCallback((file: File) => {
    if (!(file.type.startsWith('image/') || file.type === 'application/pdf')) return;

    setSelectedFile(file);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        processFile(e.dataTransfer.files[0]);
      }
    },
    [processFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        processFile(e.target.files[0]);
      }
    },
    [processFile]
  );

  const handleImport = () => {
    if (selectedFile) onFileSelected(selectedFile);
  };

  const handleClose = () => {
    if (!isProcessing) {
      setSelectedFile(null);
      setPreview(null);
      onOpenChange(false);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreview(null);
  };

  const isPdf = selectedFile?.type === 'application/pdf';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileImage className="h-5 w-5" />
            Import Nutrition from File
          </DialogTitle>
          <DialogDescription>
            Upload an image (JPG/PNG) or a PDF that contains a nutrition facts label.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!selectedFile ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={cn(
                'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors',
                dragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              )}
            >
              <Upload
                className={cn(
                  'h-10 w-10 mb-4 transition-colors',
                  dragActive ? 'text-primary' : 'text-muted-foreground'
                )}
              />
              <p className="text-sm font-medium text-center mb-1">Drag and drop your file here</p>
              <p className="text-xs text-muted-foreground mb-4">or click to browse</p>
              <input
                type="file"
                accept="image/*,.pdf,application/pdf"
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">Supports: JPG, PNG, PDF</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-lg border bg-muted/30 p-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={clearSelection}
                  disabled={isProcessing}
                >
                  <X className="h-4 w-4" />
                </Button>

                {preview ? (
                  <div className="flex items-center gap-4">
                    <img
                      src={preview}
                      alt="Nutrition label preview"
                      className="h-24 w-24 object-contain rounded border bg-white"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="h-24 w-24 flex items-center justify-center rounded border bg-muted">
                      <FileText className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(1)} KB • PDF
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Tip: best results if the PDF has a clear, high-resolution label.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
                  Cancel
                </Button>
                <Button onClick={handleImport} disabled={isProcessing}>
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <FileImage className="h-4 w-4 mr-2" />
                      Extract Nutrition
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
