import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PolicyContentEditorProps {
  initialContent?: any;
  initialHtml?: string;
  onChange: (content: { html: string; json: any; plain: string; wordCount: number }) => void;
  className?: string;
}

export function PolicyContentEditor({
  initialContent,
  initialHtml,
  onChange,
  className,
}: PolicyContentEditorProps) {
  const [plainText, setPlainText] = useState(initialHtml || '');

  useEffect(() => {
    if (initialHtml) {
      // Convert HTML to plain text for editing
      const div = document.createElement('div');
      div.innerHTML = initialHtml;
      setPlainText(div.textContent || div.innerText || '');
    }
  }, [initialHtml]);

  const handleTextChange = (text: string) => {
    setPlainText(text);

    // Count words
    const wordCount = text
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0).length;

    // Convert plain text to simple HTML (paragraph wrapping)
    const htmlContent = text
      .split('\n\n')
      .map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`)
      .join('');

    onChange({
      html: htmlContent,
      json: null, // Will be replaced with Tiptap JSON in Phase 1H
      plain: text,
      wordCount,
    });
  };

  return (
    <div className={cn('space-y-4', className)}>
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Note:</strong> This is a temporary plain text editor. A rich text editor (Tiptap) with
          formatting options, tables, and media support will be integrated in Phase 1H.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="content">Policy Content</Label>
        <div className="relative">
          <Textarea
            id="content"
            value={plainText}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Enter the policy content here..."
            className="min-h-[500px] font-sans"
          />
          <div className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-background px-2 py-1 rounded border">
            {plainText.trim().split(/\s+/).filter(w => w.length > 0).length} words
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Use double line breaks to create new paragraphs. Rich text editing coming soon.
        </p>
      </div>

      {/* Content Preview */}
      {plainText && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-semibold text-sm">Preview</h4>
            </div>
            <div className="prose prose-slate dark:prose-invert max-w-none">
              {plainText.split('\n\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formatting Help */}
      <Card>
        <CardContent className="pt-6">
          <h4 className="font-semibold text-sm mb-2">Formatting Guide (Temporary)</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Press Enter twice to create a new paragraph</li>
            <li>• Use # at the start of a line for headings (will be formatted in rich editor)</li>
            <li>• Use - or * for bullet points (will be formatted in rich editor)</li>
            <li>• Use 1. 2. 3. for numbered lists (will be formatted in rich editor)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
