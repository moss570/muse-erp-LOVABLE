import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Table as TableIcon,
  Plus,
  Trash2,
  Save,
  X,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  TableProperties,
  RowsIcon,
  Columns,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { generateChangeNotes } from '@/utils/diffChangeNotes';
import { useUpdatePolicyWithVersion } from '@/hooks/usePolicies';

interface PolicyContentEditorProps {
  policyId: string;
  initialContent: string;
  currentVersion?: number;
  onSave?: () => void;
  onCancel: () => void;
}

// Convert markdown-style content to HTML for TipTap
function markdownToHtml(markdown: string): string {
  return markdown
    // Convert ## headers
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    // Convert **bold**
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Convert markdown tables to HTML tables
    .replace(/^\|(.+)\|$/gm, (match) => {
      const cells = match.slice(1, -1).split('|').map(c => c.trim());
      // Check if it's a separator row
      if (cells.every(c => /^[-:]+$/.test(c))) {
        return ''; // Skip separator rows
      }
      const cellsHtml = cells.map(c => `<td>${c}</td>`).join('');
      return `<tr>${cellsHtml}</tr>`;
    })
    // Wrap consecutive table rows in table tags
    .replace(/(<tr>[\s\S]*?<\/tr>[\n\s]*)+/g, (match) => {
      return `<table><tbody>${match}</tbody></table>`;
    })
    // Convert line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>')
    // Wrap in paragraph if not already structured
    .replace(/^(?!<[h|t|p|d])/, '<p>')
    .replace(/(?<![>])$/, '</p>');
}

// Convert HTML back to markdown for storage
function htmlToMarkdown(html: string): string {
  return html
    // Convert headers
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n')
    // Convert bold/italic
    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<em>(.*?)<\/em>/gi, '*$1*')
    .replace(/<u>(.*?)<\/u>/gi, '$1')
    // Convert lists
    .replace(/<li>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<\/?[uo]l[^>]*>/gi, '')
    // Convert tables
    .replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, content) => {
      const rows = content.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
      return rows.map((row: string, idx: number) => {
        const cells = row.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || [];
        const cellContents = cells.map((cell: string) => 
          cell.replace(/<\/?t[dh][^>]*>/gi, '').trim()
        );
        const line = `| ${cellContents.join(' | ')} |`;
        if (idx === 0) {
          const separator = `| ${cellContents.map(() => '---').join(' | ')} |`;
          return `${line}\n${separator}`;
        }
        return line;
      }).join('\n') + '\n';
    })
    // Clean up paragraphs and breaks
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/p>/gi, '\n\n')
    // Remove remaining HTML tags
    .replace(/<[^>]+>/g, '')
    // Clean up whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export default function PolicyContentEditor({
  policyId,
  initialContent,
  currentVersion,
  onSave,
  onCancel,
}: PolicyContentEditorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();
  const originalContentRef = useRef(initialContent);
  const updatePolicyWithVersion = useUpdatePolicyWithVersion();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'policy-editor-table',
        },
      }),
      TableRow,
      TableCell,
      TableHeader,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
    ],
    content: markdownToHtml(initialContent),
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[400px] p-4',
      },
    },
  });

  const handleSave = async () => {
    if (!editor) return;

    setIsSaving(true);
    try {
      const html = editor.getHTML();
      const newContent = htmlToMarkdown(html);
      
      // Auto-generate change notes by comparing old vs new content
      const autoChangeNotes = generateChangeNotes(originalContentRef.current, newContent);
      
      // Use the versioning hook to save with automatic version snapshot
      await updatePolicyWithVersion.mutateAsync({
        id: policyId,
        content: newContent,
        changeNotes: autoChangeNotes,
      });

      toast.success('Content saved with version history');
      onSave?.();
    } catch (error) {
      console.error('Error saving content:', error);
      toast.error('Failed to save content');
    } finally {
      setIsSaving(false);
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="policy-content-editor border rounded-lg bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b flex-wrap">
        {/* Undo/Redo */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <Redo className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Headings */}
        <Button
          variant={editor.isActive('heading', { level: 1 }) ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive('heading', { level: 2 }) ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive('heading', { level: 3 }) ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Text formatting */}
        <Button
          variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive('underline') ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Lists */}
        <Button
          variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Alignment */}
        <Button
          variant={editor.isActive({ textAlign: 'left' }) ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive({ textAlign: 'center' }) ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive({ textAlign: 'right' }) ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
        >
          <AlignRight className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Table dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={editor.isActive('table') ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 gap-1"
            >
              <TableIcon className="h-4 w-4" />
              Table
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Insert Table
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => editor.chain().focus().addColumnBefore().run()}
              disabled={!editor.can().addColumnBefore()}
            >
              <Columns className="h-4 w-4 mr-2" />
              Add Column Before
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().addColumnAfter().run()}
              disabled={!editor.can().addColumnAfter()}
            >
              <Columns className="h-4 w-4 mr-2" />
              Add Column After
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().deleteColumn().run()}
              disabled={!editor.can().deleteColumn()}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Column
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => editor.chain().focus().addRowBefore().run()}
              disabled={!editor.can().addRowBefore()}
            >
              <RowsIcon className="h-4 w-4 mr-2" />
              Add Row Before
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().addRowAfter().run()}
              disabled={!editor.can().addRowAfter()}
            >
              <RowsIcon className="h-4 w-4 mr-2" />
              Add Row After
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().deleteRow().run()}
              disabled={!editor.can().deleteRow()}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Row
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => editor.chain().focus().deleteTable().run()}
              disabled={!editor.can().deleteTable()}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Table
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Save/Cancel */}
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={isSaving}>
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-1" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />

      {/* Table editor styles */}
      <style>{`
        .policy-editor-table {
          border-collapse: collapse;
          width: 100%;
          margin: 1rem 0;
        }
        .policy-editor-table td,
        .policy-editor-table th {
          border: 1px solid hsl(var(--border));
          padding: 0.5rem;
          min-width: 100px;
        }
        .policy-editor-table th {
          background: hsl(var(--muted));
          font-weight: 600;
        }
        .policy-editor-table .selectedCell {
          background: hsl(var(--primary) / 0.1);
        }
        .ProseMirror {
          outline: none;
        }
        .ProseMirror p {
          margin: 0.5rem 0;
        }
      `}</style>
    </div>
  );
}
