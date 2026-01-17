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

// Dynamically import PDF.js to avoid loading it when not needed
async function convertPdfToImage(file: File): Promise<{ blob: Blob; dataUrl: string }> {
  // Dynamic import of pdfjs-dist
  const pdfjsLib = await import('pdfjs-dist');
  
  // Set the worker source - use CDN for compatibility
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
  
  // Read file as ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();
  
  // Load the PDF document
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  // Get the first page
  const page = await pdf.getPage(1);
  
  // Set scale for good quality (2x for retina-like quality)
  const scale = 2;
  const viewport = page.getViewport({ scale });
  
  // Create canvas
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not get canvas context');
  
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  
  // Render the page
  await page.render({
    canvasContext: context,
    viewport: viewport,
  }).promise;
  
  // Convert canvas to blob and data URL
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        const dataUrl = canvas.toDataURL('image/png');
        resolve({ blob, dataUrl });
      } else {
        reject(new Error('Failed to convert PDF to image'));
      }
    }, 'image/png', 0.95);
  });
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
  const [convertedFile, setConvertedFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionError, setConversionError] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const processFile = useCallback(async (file: File) => {
    setConversionError(null);
    setConvertedFile(null);
    
    if (file.type.startsWith('image/')) {
      // Direct image - just show preview
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf') {
      // PDF - convert to image
      setSelectedFile(file);
      setPreview(null);
      setIsConverting(true);
      
      try {
        const { blob, dataUrl } = await convertPdfToImage(file);
        // Create a new File object from the blob
        const imageFile = new File([blob], file.name.replace('.pdf', '.png'), { type: 'image/png' });
        setConvertedFile(imageFile);
        setPreview(dataUrl);
      } catch (error) {
        console.error('PDF conversion error:', error);
        setConversionError('Failed to convert PDF. Please try a different file or use a screenshot.');
      } finally {
        setIsConverting(false);
      }
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, [processFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  }, [processFile]);

  const handleImport = () => {
    // Use converted file for PDFs, original file for images
    const fileToSend = convertedFile || selectedFile;
    if (fileToSend) {
      onFileSelected(fileToSend);
    }
  };

  const handleClose = () => {
    if (!isProcessing && !isConverting) {
      setSelectedFile(null);
      setPreview(null);
      setConvertedFile(null);
      setConversionError(null);
      onOpenChange(false);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreview(null);
    setConvertedFile(null);
    setConversionError(null);
  };

  const isPdf = selectedFile?.type === 'application/pdf';
  const canImport = selectedFile && !isConverting && !conversionError && (convertedFile || !isPdf);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileImage className="h-5 w-5" />
            Import Nutrition from Image
          </DialogTitle>
          <DialogDescription>
            Upload an image or PDF of a nutrition facts label to automatically extract the data.
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
              <Upload className={cn(
                'h-10 w-10 mb-4 transition-colors',
                dragActive ? 'text-primary' : 'text-muted-foreground'
              )} />
              <p className="text-sm font-medium text-center mb-1">
                Drag and drop your file here
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                or click to browse
              </p>
              <input
                type="file"
                accept="image/*,.pdf,application/pdf"
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">
                Supports: JPG, PNG, PDF
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-lg border bg-muted/30 p-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={clearSelection}
                  disabled={isProcessing || isConverting}
                >
                  <X className="h-4 w-4" />
                </Button>
                
                {isConverting ? (
                  <div className="flex items-center gap-4">
                    <div className="h-24 w-24 flex items-center justify-center rounded border bg-muted">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Converting PDF to image...
                      </p>
                    </div>
                  </div>
                ) : preview ? (
                  <div className="flex items-center gap-4">
                    <img
                      src={preview}
                      alt="Preview"
                      className="h-24 w-24 object-contain rounded border bg-white"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                        {isPdf && convertedFile && ' • Converted from PDF'}
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
                      {conversionError && (
                        <p className="text-sm text-destructive mt-1">{conversionError}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose} disabled={isProcessing || isConverting}>
                  Cancel
                </Button>
                <Button onClick={handleImport} disabled={isProcessing || !canImport}>
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
