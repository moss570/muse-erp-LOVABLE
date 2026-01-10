import { FileText, Mail, MoreVertical, Star, Pencil, Trash2, Download } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DocumentTemplate } from '@/hooks/useDocumentTemplates';
import { toast } from 'sonner';

interface TemplateCardProps {
  template: DocumentTemplate;
  onEdit: (template: DocumentTemplate) => void;
  onDelete: (template: DocumentTemplate) => void;
  onSetDefault?: (template: DocumentTemplate) => void;
}

export function TemplateCard({ template, onEdit, onDelete, onSetDefault }: TemplateCardProps) {
  const isDocument = template.template_type === 'document';
  
  const handleDownloadHtml = (type: 'document' | 'email') => {
    const html = type === 'document' ? template.document_html : template.email_html;
    if (!html) {
      toast.error(`No ${type} content to download`);
      return;
    }

    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${template.name} - ${type}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f4f4f4; }
  </style>
</head>
<body>
${html}
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name.replace(/\s+/g, '_')}_${type}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };
  
  return (
    <Card className="group relative overflow-hidden transition-all hover:shadow-md hover:border-primary/30">
      {/* Template Preview Area */}
      <div className="aspect-[3/4] bg-muted/30 relative flex items-center justify-center border-b">
        {template.document_file_url || template.document_html ? (
          <div className="absolute inset-2 bg-background rounded border shadow-sm overflow-hidden">
            <div className="h-full w-full flex items-start justify-center pt-4 opacity-60">
              <div className="w-3/4 space-y-2">
                <div className="h-2 bg-muted rounded w-1/2" />
                <div className="h-1.5 bg-muted rounded w-full" />
                <div className="h-1.5 bg-muted rounded w-5/6" />
                <div className="h-1.5 bg-muted rounded w-4/6" />
                <div className="h-4 my-3" />
                <div className="h-1.5 bg-muted rounded w-full" />
                <div className="h-1.5 bg-muted rounded w-3/4" />
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-muted-foreground">
            {isDocument ? (
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-40" />
            ) : (
              <Mail className="h-12 w-12 mx-auto mb-2 opacity-40" />
            )}
            <p className="text-xs">No preview</p>
          </div>
        )}
        
        {/* Default Badge */}
        {template.is_default && (
          <div className="absolute top-2 right-2">
            <Badge variant="default" className="gap-1 text-xs">
              <Star className="h-3 w-3 fill-current" />
              Default
            </Badge>
          </div>
        )}

        {/* Hover Actions */}
        <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button size="sm" variant="outline" onClick={() => onEdit(template)}>
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
        </div>
      </div>
      
      {/* Template Info */}
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-sm truncate">{template.name}</h3>
            {template.description && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {template.description}
              </p>
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(template)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit Template
              </DropdownMenuItem>
              {template.document_html && (
                <DropdownMenuItem onClick={() => handleDownloadHtml('document')}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Document HTML
                </DropdownMenuItem>
              )}
              {template.email_html && (
                <DropdownMenuItem onClick={() => handleDownloadHtml('email')}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Email HTML
                </DropdownMenuItem>
              )}
              {onSetDefault && !template.is_default && (
                <DropdownMenuItem onClick={() => onSetDefault(template)}>
                  <Star className="h-4 w-4 mr-2" />
                  Set as Default
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(template)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Type Badge */}
        <div className="mt-2 flex gap-1">
          <Badge variant="outline" className="text-xs">
            {isDocument ? 'Document' : 'Email'}
          </Badge>
          {!template.is_active && (
            <Badge variant="secondary" className="text-xs">
              Inactive
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
