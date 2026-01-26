import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { List } from 'lucide-react';
import type { Policy } from '@/types/policies';
import { cn } from '@/lib/utils';

interface Heading {
  id: string;
  text: string;
  level: number;
}

interface PolicyTableOfContentsProps {
  policy: Policy;
  className?: string;
}

export function PolicyTableOfContents({ policy, className }: PolicyTableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('');

  // Extract headings from HTML content
  const headings = useMemo(() => {
    if (!policy.content_html) return [];

    const parser = new DOMParser();
    const doc = parser.parseFromString(policy.content_html, 'text/html');
    const headingElements = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');

    const extractedHeadings: Heading[] = [];
    headingElements.forEach((heading, index) => {
      const text = heading.textContent?.trim() || '';
      const level = parseInt(heading.tagName.charAt(1));
      const id = heading.id || `heading-${index}`;

      if (text) {
        extractedHeadings.push({ id, text, level });
      }
    });

    return extractedHeadings;
  }, [policy.content_html]);

  // Track active heading on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-80px 0px -80% 0px',
      }
    );

    headings.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [headings]);

  const handleClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  if (headings.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <List className="h-4 w-4" />
            Contents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No sections found in this policy.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('sticky top-6', className)}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <List className="h-4 w-4" />
          Contents
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[calc(100vh-200px)]">
          <nav className="space-y-1">
            {headings.map((heading) => (
              <button
                key={heading.id}
                onClick={() => handleClick(heading.id)}
                className={cn(
                  'block w-full text-left text-sm py-1.5 px-2 rounded-md transition-colors hover:bg-muted',
                  heading.level === 1 && 'font-semibold',
                  heading.level === 2 && 'pl-4',
                  heading.level === 3 && 'pl-6 text-muted-foreground',
                  heading.level === 4 && 'pl-8 text-muted-foreground',
                  heading.level === 5 && 'pl-10 text-muted-foreground',
                  heading.level === 6 && 'pl-12 text-muted-foreground',
                  activeId === heading.id && 'bg-primary/10 text-primary font-medium'
                )}
              >
                {heading.text}
              </button>
            ))}
          </nav>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
