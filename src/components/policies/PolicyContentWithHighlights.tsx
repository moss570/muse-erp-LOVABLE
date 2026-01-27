import { useEffect, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";

interface PolicyContentWithHighlightsProps {
  content: string;
  evidenceExcerpts: string[];
  isActive?: boolean;
  className?: string;
}

// Escape special regex characters
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Format policy content with proper HTML rendering
function formatPolicyContent(content: string): string {
  return content
    // Convert markdown-style headers (## HEADER)
    .replace(/\n## ([^\n]+)\n/g, '<h2 class="text-lg font-bold mt-6 mb-3 text-foreground border-b pb-2">$1</h2>')
    // Convert bold text (**text**)
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold">$1</strong>')
    // Convert double newlines to paragraph breaks
    .replace(/\n\n+/g, '</p><p class="mb-3">')
    // Convert single newlines to line breaks
    .replace(/\n/g, '<br/>')
    // Wrap in paragraph tags
    .replace(/^/, '<p class="mb-3">')
    .replace(/$/, '</p>')
    // Clean up empty paragraphs
    .replace(/<p class="mb-3"><\/p>/g, '')
    .replace(/<p class="mb-3"><br\/>/g, '<p class="mb-3">');
}

export default function PolicyContentWithHighlights({
  content,
  evidenceExcerpts,
  isActive = false,
  className,
}: PolicyContentWithHighlightsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const firstHighlightRef = useRef<HTMLSpanElement | null>(null);

  // Apply highlights to the formatted content
  const highlightedContent = useMemo(() => {
    if (!evidenceExcerpts.length || !isActive) {
      return formatPolicyContent(content);
    }

    let formattedContent = formatPolicyContent(content);
    
    // Sort excerpts by length (longest first) to avoid partial matches
    const sortedExcerpts = [...evidenceExcerpts].sort((a, b) => b.length - a.length);
    
    // Track if this is the first highlight for scrolling
    let isFirstHighlight = true;
    
    sortedExcerpts.forEach((excerpt) => {
      if (!excerpt.trim()) return;
      
      // Normalize the excerpt: escape regex special chars, then allow flexible whitespace
      const escapedExcerpt = escapeRegex(excerpt.trim());
      // Allow whitespace variations (newlines, multiple spaces, br tags, etc.)
      const flexibleExcerpt = escapedExcerpt.replace(/\s+/g, "[\\s\\n\\r]*(?:<br\\s*\\/?>)?[\\s\\n\\r]*");
      const regex = new RegExp(`(${flexibleExcerpt})`, "gi");
      
      formattedContent = formattedContent.replace(regex, (match) => {
        const dataAttr = isFirstHighlight ? 'data-first-highlight="true"' : '';
        isFirstHighlight = false;
        return `<span class="evidence-highlight" ${dataAttr}>${match}</span>`;
      });
    });
    
    return formattedContent;
  }, [content, evidenceExcerpts, isActive]);

  // Scroll to first highlight when active
  useEffect(() => {
    if (isActive && evidenceExcerpts.length > 0 && containerRef.current) {
      // Small delay to ensure DOM is updated
      const timer = setTimeout(() => {
        const firstHighlight = containerRef.current?.querySelector('[data-first-highlight="true"]');
        if (firstHighlight) {
          firstHighlight.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isActive, evidenceExcerpts]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "p-6 prose prose-sm dark:prose-invert max-w-none policy-content-with-highlights",
        className
      )}
      dangerouslySetInnerHTML={{ __html: highlightedContent }}
    />
  );
}
