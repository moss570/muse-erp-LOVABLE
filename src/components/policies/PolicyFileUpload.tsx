import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  Upload,
  File,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Video,
  X,
  AlertCircle,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface FileWithMetadata {
  file: File;
  type: 'form' | 'image' | 'document' | 'video' | 'other';
  description: string;
}

interface PolicyFileUploadProps {
  policyId?: string;
  attachments: File[];
  onChange: (files: File[]) => void;
  className?: string;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const getFileIcon = (fileName: string, type: string) => {
  if (type === 'form' || fileName.endsWith('.pdf')) {
    return <FileText className="h-8 w-8 text-red-500" />;
  }
  if (type === 'image' || /\.(jpg|jpeg|png|gif|svg)$/i.test(fileName)) {
    return <ImageIcon className="h-8 w-8 text-blue-500" />;
  }
  if (type === 'video' || /\.(mp4|mov|avi|wmv)$/i.test(fileName)) {
    return <Video className="h-8 w-8 text-purple-500" />;
  }
  if (/\.(xlsx?|csv)$/i.test(fileName)) {
    return <FileSpreadsheet className="h-8 w-8 text-green-500" />;
  }
  return <File className="h-8 w-8 text-muted-foreground" />;
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

const getFileType = (fileName: string): 'form' | 'image' | 'document' | 'video' | 'other' => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'form';
  if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(ext || '')) return 'image';
  if (['mp4', 'mov', 'avi', 'wmv'].includes(ext || '')) return 'video';
  if (['doc', 'docx', 'xls', 'xlsx', 'txt'].includes(ext || '')) return 'document';
  return 'other';
};

export function PolicyFileUpload({
  policyId,
  attachments,
  onChange,
  className,
}: PolicyFileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [filesWithMetadata, setFilesWithMetadata] = useState<FileWithMetadata[]>([]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (files: File[]) => {
    const validFiles = files.filter(file => {
      if (file.size > MAX_FILE_SIZE) {
        alert(`File ${file.name} is too large. Maximum size is 50MB.`);
        return false;
      }
      return true;
    });

    const newFilesWithMetadata: FileWithMetadata[] = validFiles.map(file => ({
      file,
      type: getFileType(file.name),
      description: '',
    }));

    setFilesWithMetadata([...filesWithMetadata, ...newFilesWithMetadata]);
  };

  const handleRemoveFile = (index: number) => {
    const updated = filesWithMetadata.filter((_, i) => i !== index);
    setFilesWithMetadata(updated);
    onChange(updated.map(f => f.file));
  };

  const handleMetadataChange = (index: number, field: keyof FileWithMetadata, value: any) => {
    const updated = [...filesWithMetadata];
    updated[index] = { ...updated[index], [field]: value };
    setFilesWithMetadata(updated);
  };

  return (
    <div className={cn('space-y-6', className)}>
      {!policyId && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Files will be uploaded after the policy is created. You can add files now and they will
            be attached once you save the policy.
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Area */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
          'hover:border-primary hover:bg-primary/5 cursor-pointer'
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">Drop files here or click to browse</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Supported files: PDF, Word, Excel, Images, Videos (Max 50MB each)
        </p>
        <Button type="button" variant="outline" size="sm">
          Select Files
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInput}
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.svg,.mp4,.mov,.avi,.txt"
        />
      </div>

      {/* Upload Progress */}
      {uploadProgress !== null && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Files List */}
      {filesWithMetadata.length > 0 && (
        <div className="space-y-3">
          <Label>Attached Files ({filesWithMetadata.length})</Label>
          <div className="space-y-3">
            {filesWithMetadata.map((item, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Icon */}
                    <div className="shrink-0">
                      {getFileIcon(item.file.name, item.type)}
                    </div>

                    {/* Details */}
                    <div className="flex-1 space-y-3">
                      {/* File Name and Size */}
                      <div>
                        <div className="font-medium text-sm line-clamp-1">
                          {item.file.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatFileSize(item.file.size)}
                        </div>
                      </div>

                      {/* Metadata Inputs */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor={`type-${index}`} className="text-xs">
                            Type
                          </Label>
                          <Select
                            value={item.type}
                            onValueChange={(value) => handleMetadataChange(index, 'type', value)}
                          >
                            <SelectTrigger id={`type-${index}`} className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="form">Form</SelectItem>
                              <SelectItem value="image">Image</SelectItem>
                              <SelectItem value="document">Document</SelectItem>
                              <SelectItem value="video">Video</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor={`desc-${index}`} className="text-xs">
                            Description
                          </Label>
                          <Input
                            id={`desc-${index}`}
                            value={item.description}
                            onChange={(e) => handleMetadataChange(index, 'description', e.target.value)}
                            placeholder="Optional description"
                            className="h-8"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Remove Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveFile(index)}
                      className="shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Help Text */}
      <Card>
        <CardContent className="pt-6">
          <h4 className="font-semibold text-sm mb-2">About Attachments</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Attach forms, worksheets, diagrams, or supporting documents</li>
            <li>• Files are stored securely and can be downloaded by authorized users</li>
            <li>• Each file can be categorized and described for easier identification</li>
            <li>• Maximum file size: 50MB per file</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
