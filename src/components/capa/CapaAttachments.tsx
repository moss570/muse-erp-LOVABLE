import { useState, useRef } from 'react';
import { format } from 'date-fns';
import {
  Upload,
  File,
  Image,
  FileText,
  Trash2,
  Download,
  Loader2,
  MoreHorizontal,
  Eye,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

import { useCapaAttachments, useUploadCapaAttachment, useDeleteCapaAttachment } from '@/hooks/useCapa';

const FILE_TYPE_ICONS: Record<string, typeof File> = {
  photo: Image,
  document: FileText,
  report: FileText,
  other: File,
};

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  evidence: { label: 'Evidence', color: 'bg-blue-100 text-blue-700' },
  root_cause: { label: 'Root Cause', color: 'bg-amber-100 text-amber-700' },
  corrective_action: { label: 'Corrective Action', color: 'bg-green-100 text-green-700' },
  verification: { label: 'Verification', color: 'bg-purple-100 text-purple-700' },
  other: { label: 'Other', color: 'bg-gray-100 text-gray-700' },
};

interface CapaAttachmentsProps {
  capaId: string;
  readOnly?: boolean;
}

export function CapaAttachments({ capaId, readOnly = false }: CapaAttachmentsProps) {
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; filePath: string | null; name: string } | null>(null);
  const [uploadForm, setUploadForm] = useState({
    file: null as File | null,
    fileType: 'document' as 'photo' | 'document' | 'report' | 'other',
    category: 'evidence' as 'evidence' | 'root_cause' | 'corrective_action' | 'verification' | 'other',
    description: '',
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { data: attachments, isLoading } = useCapaAttachments(capaId);
  const uploadAttachment = useUploadCapaAttachment();
  const deleteAttachment = useDeleteCapaAttachment();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadForm({ ...uploadForm, file });
      setShowUploadDialog(true);
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.file) return;
    
    await uploadAttachment.mutateAsync({
      capaId,
      file: uploadForm.file,
      fileType: uploadForm.fileType,
      category: uploadForm.category,
      description: uploadForm.description || undefined,
    });
    
    setShowUploadDialog(false);
    setUploadForm({
      file: null,
      fileType: 'document',
      category: 'evidence',
      description: '',
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    
    await deleteAttachment.mutateAsync({
      id: deleteTarget.id,
      capaId,
      filePath: deleteTarget.filePath,
    });
    
    setDeleteTarget(null);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Attachments</CardTitle>
            <CardDescription>
              Supporting documents, photos, and evidence
            </CardDescription>
          </div>
          {!readOnly && (
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : attachments && attachments.length > 0 ? (
          <div className="space-y-2">
            {attachments.map((attachment) => {
              const Icon = FILE_TYPE_ICONS[attachment.file_type || 'other'] || File;
              const categoryConfig = CATEGORY_CONFIG[attachment.attachment_category || 'other'];
              
              return (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{attachment.file_name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatFileSize(attachment.file_size)}</span>
                        <span>•</span>
                        <span>{format(new Date(attachment.uploaded_at), 'MMM d, yyyy')}</span>
                        {attachment.uploaded_by_profile && (
                          <>
                            <span>•</span>
                            <span>
                              {attachment.uploaded_by_profile.first_name} {attachment.uploaded_by_profile.last_name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn('text-xs', categoryConfig?.color)}>
                      {categoryConfig?.label || 'Other'}
                    </Badge>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {attachment.file_url && (
                          <>
                            <DropdownMenuItem asChild>
                              <a href={attachment.file_url} target="_blank" rel="noopener noreferrer">
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <a href={attachment.file_url} download={attachment.file_name}>
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </a>
                            </DropdownMenuItem>
                          </>
                        )}
                        {!readOnly && (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteTarget({
                              id: attachment.id,
                              filePath: attachment.file_path,
                              name: attachment.file_name,
                            })}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <File className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No attachments yet</p>
            {!readOnly && (
              <p className="text-xs mt-1">Upload files to document evidence and findings</p>
            )}
          </div>
        )}
      </CardContent>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Attachment</DialogTitle>
            <DialogDescription>
              Add details about the file you're uploading
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {uploadForm.file && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium text-sm">{uploadForm.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(uploadForm.file.size)}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>File Type</Label>
                <Select
                  value={uploadForm.fileType}
                  onValueChange={(v) => setUploadForm({ ...uploadForm, fileType: v as typeof uploadForm.fileType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="photo">Photo</SelectItem>
                    <SelectItem value="document">Document</SelectItem>
                    <SelectItem value="report">Report</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={uploadForm.category}
                  onValueChange={(v) => setUploadForm({ ...uploadForm, category: v as typeof uploadForm.category })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="evidence">Evidence</SelectItem>
                    <SelectItem value="root_cause">Root Cause</SelectItem>
                    <SelectItem value="corrective_action">Corrective Action</SelectItem>
                    <SelectItem value="verification">Verification</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={uploadForm.description}
                onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                placeholder="Brief description of the attachment..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!uploadForm.file || uploadAttachment.isPending}
            >
              {uploadAttachment.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attachment?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteAttachment.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
