import { useState, useRef } from 'react';
import { Download, Upload, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface TemplateDownloadUploadProps {
  templateId: string;
  templateName: string;
  htmlContent?: string | null;
  fileUrl?: string | null;
  fileType: 'document' | 'email';
  onUploadComplete: (html: string) => void;
}

export function TemplateDownloadUpload({
  templateId,
  templateName,
  htmlContent,
  fileUrl,
  fileType,
  onUploadComplete,
}: TemplateDownloadUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadAsHtml = () => {
    if (!htmlContent) {
      toast.error('No template content to download');
      return;
    }

    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${templateName}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f4f4f4; }
    .header { margin-bottom: 20px; }
    .footer { margin-top: 20px; font-size: 0.9em; color: #666; }
    /* Merge fields are surrounded by double curly braces: {{FIELD_NAME}} */
  </style>
</head>
<body>
${htmlContent}
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${templateName.replace(/\s+/g, '_')}_${fileType}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Template downloaded successfully');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['text/html', 'application/xhtml+xml'];
    if (!validTypes.includes(file.type) && !file.name.endsWith('.html') && !file.name.endsWith('.htm')) {
      toast.error('Please upload an HTML file');
      return;
    }

    setUploading(true);
    try {
      // Read file content
      const text = await file.text();
      
      // Extract body content if full HTML document
      let bodyContent = text;
      const bodyMatch = text.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      if (bodyMatch) {
        bodyContent = bodyMatch[1].trim();
      }

      // Upload to storage
      const filePath = `templates/${templateId}/${fileType}_${Date.now()}.html`;
      const { error: uploadError } = await supabase.storage
        .from('templates')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('templates')
        .getPublicUrl(filePath);

      // Update template
      const updateData = fileType === 'document' 
        ? { document_html: bodyContent, document_file_path: filePath, document_file_url: urlData.publicUrl }
        : { email_html: bodyContent, email_file_path: filePath, email_file_url: urlData.publicUrl };

      const { error: updateError } = await supabase
        .from('document_templates')
        .update(updateData)
        .eq('id', templateId);

      if (updateError) throw updateError;

      onUploadComplete(bodyContent);
      toast.success('Template uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload template');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={downloadAsHtml}
        disabled={!htmlContent}
      >
        <Download className="h-4 w-4 mr-1" />
        Download HTML
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".html,.htm"
        onChange={handleFileSelect}
        className="hidden"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
        ) : (
          <Upload className="h-4 w-4 mr-1" />
        )}
        Upload HTML
      </Button>

      {fileUrl && (
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          <FileText className="h-3 w-3" />
          View Current
        </a>
      )}
    </div>
  );
}
