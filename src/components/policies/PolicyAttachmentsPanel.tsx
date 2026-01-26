import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Paperclip,
  Download,
  Trash2,
  MoreVertical,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Video,
  File,
  Plus,
} from 'lucide-react';
import { format } from 'date-fns';
import { usePolicyAttachments, downloadAttachment, useDeletePolicyAttachment } from '@/hooks/usePolicyAttachments';
import type { PolicyAttachment } from '@/types/policies';

interface PolicyAttachmentsPanelProps {
  policyId: string;
  className?: string;
}

const getFileIcon = (attachmentType: string, fileName: string) => {
  if (attachmentType === 'form' || fileName.endsWith('.pdf')) {
    return <FileText className="h-5 w-5 text-red-500" />;
  }
  if (attachmentType === 'image' || /\.(jpg|jpeg|png|gif|svg)$/i.test(fileName)) {
    return <ImageIcon className="h-5 w-5 text-blue-500" />;
  }
  if (attachmentType === 'video' || /\.(mp4|mov|avi|wmv)$/i.test(fileName)) {
    return <Video className="h-5 w-5 text-purple-500" />;
  }
  if (/\.(xlsx?|csv)$/i.test(fileName)) {
    return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
  }
  if (/\.(docx?|txt|rtf)$/i.test(fileName)) {
    return <FileText className="h-5 w-5 text-blue-600" />;
  }
  return <File className="h-5 w-5 text-muted-foreground" />;
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

const getAttachmentTypeBadge = (type: string) => {
  const configs: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
    form: { label: 'Form', variant: 'default' },
    image: { label: 'Image', variant: 'secondary' },
    document: { label: 'Document', variant: 'outline' },
    video: { label: 'Video', variant: 'secondary' },
    other: { label: 'Other', variant: 'outline' },
  };
  const config = configs[type] || configs.other;
  return (
    <Badge variant={config.variant} className="text-xs">
      {config.label}
    </Badge>
  );
};

export function PolicyAttachmentsPanel({ policyId, className }: PolicyAttachmentsPanelProps) {
  const { data: attachments, isLoading } = usePolicyAttachments(policyId);
  const deleteAttachment = useDeletePolicyAttachment();

  const handleDownload = async (attachment: PolicyAttachment) => {
    await downloadAttachment(attachment);
  };

  const handleDelete = (attachmentId: string) => {
    if (confirm('Are you sure you want to delete this attachment?')) {
      deleteAttachment.mutate(attachmentId);
    }
  };

  const handleUpload = () => {
    // TODO: Implement upload dialog
    alert('Upload attachment feature coming soon');
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!attachments || attachments.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Paperclip className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Attachments</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              This policy doesn't have any attachments yet. Upload forms, images, or supporting documents.
            </p>
            <Button onClick={handleUpload}>
              <Plus className="h-4 w-4 mr-2" />
              Upload Attachment
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="pt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            Attachments ({attachments.length})
          </h3>
          <Button onClick={handleUpload} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Upload
          </Button>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>File Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attachments.map((attachment) => (
                <TableRow key={attachment.id}>
                  <TableCell>
                    {getFileIcon(attachment.attachment_type, attachment.file_name)}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{attachment.file_name}</div>
                      {attachment.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {attachment.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getAttachmentTypeBadge(attachment.attachment_type)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {attachment.file_size_bytes ? formatFileSize(attachment.file_size_bytes) : 'N/A'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div>
                      {format(new Date(attachment.uploaded_at), 'MMM dd, yyyy')}
                    </div>
                    {attachment.uploaded_by_profile && (
                      <div className="text-xs">
                        by {attachment.uploaded_by_profile.first_name} {attachment.uploaded_by_profile.last_name}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDownload(attachment)}>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(attachment.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
