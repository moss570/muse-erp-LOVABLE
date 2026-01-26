import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, AlertCircle } from 'lucide-react';
import type { Policy } from '@/types/policies';
import { cn } from '@/lib/utils';

interface PolicyContentViewerProps {
  policy: Policy;
  className?: string;
}

export function PolicyContentViewer({ policy, className }: PolicyContentViewerProps) {
  // Check if we have content
  const hasContent = policy.content_html || policy.content_plain;

  if (!hasContent) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Content</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              This policy doesn't have any content yet. Edit the policy to add content.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="pt-6">
        {/* Summary Section */}
        {policy.summary && (
          <div className="mb-6 p-4 bg-muted/50 rounded-lg border">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Summary
            </h3>
            <p className="text-sm text-muted-foreground">{policy.summary}</p>
          </div>
        )}

        {/* Tags */}
        {policy.tags && policy.tags.length > 0 && (
          <div className="mb-6 flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">Tags:</span>
            {policy.tags.map((tag: any) => (
              <Badge key={tag.id} variant="secondary">
                {tag.tag_name}
              </Badge>
            ))}
          </div>
        )}

        {/* Main Content */}
        <div className="prose prose-slate dark:prose-invert max-w-none">
          {policy.content_html ? (
            <div
              className={cn(
                'policy-content',
                'leading-relaxed'
              )}
              dangerouslySetInnerHTML={{ __html: policy.content_html }}
            />
          ) : (
            <div className="whitespace-pre-wrap font-sans">
              {policy.content_plain}
            </div>
          )}
        </div>

        {/* Word Count */}
        {policy.content_word_count && (
          <div className="mt-6 pt-6 border-t text-sm text-muted-foreground">
            {policy.content_word_count.toLocaleString()} words
          </div>
        )}
      </CardContent>

      <style jsx>{`
        .policy-content h1 {
          font-size: 2rem;
          font-weight: 700;
          margin-top: 2rem;
          margin-bottom: 1rem;
          line-height: 1.25;
        }
        .policy-content h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          line-height: 1.3;
        }
        .policy-content h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
        }
        .policy-content p {
          margin-bottom: 1rem;
        }
        .policy-content ul,
        .policy-content ol {
          margin-bottom: 1rem;
          padding-left: 1.5rem;
        }
        .policy-content li {
          margin-bottom: 0.5rem;
        }
        .policy-content table {
          width: 100%;
          margin: 1rem 0;
          border-collapse: collapse;
        }
        .policy-content th,
        .policy-content td {
          border: 1px solid hsl(var(--border));
          padding: 0.5rem;
          text-align: left;
        }
        .policy-content th {
          background-color: hsl(var(--muted));
          font-weight: 600;
        }
        .policy-content blockquote {
          border-left: 4px solid hsl(var(--primary));
          padding-left: 1rem;
          margin: 1rem 0;
          font-style: italic;
          color: hsl(var(--muted-foreground));
        }
        .policy-content code {
          background-color: hsl(var(--muted));
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-size: 0.875em;
        }
        .policy-content pre {
          background-color: hsl(var(--muted));
          padding: 1rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          margin: 1rem 0;
        }
        .policy-content pre code {
          background-color: transparent;
          padding: 0;
        }
        .policy-content a {
          color: hsl(var(--primary));
          text-decoration: underline;
        }
        .policy-content a:hover {
          text-decoration: none;
        }
      `}</style>
    </Card>
  );
}
