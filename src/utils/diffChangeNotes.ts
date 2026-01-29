/**
 * Utility to automatically generate human-readable change notes
 * by comparing old and new policy content.
 */

interface ChangeDetail {
  type: 'added' | 'removed' | 'modified';
  description: string;
}

/**
 * Compare two text contents and generate a summary of changes.
 */
export function generateChangeNotes(oldContent: string, newContent: string): string {
  const changes: ChangeDetail[] = [];
  
  // Normalize content for comparison
  const oldLines = normalizeContent(oldContent);
  const newLines = normalizeContent(newContent);
  
  // Count sections (headers)
  const oldSections = extractSections(oldContent);
  const newSections = extractSections(newContent);
  
  // Detect added sections
  for (const section of newSections) {
    if (!oldSections.some(s => s.toLowerCase() === section.toLowerCase())) {
      changes.push({ type: 'added', description: `Added section: "${section}"` });
    }
  }
  
  // Detect removed sections
  for (const section of oldSections) {
    if (!newSections.some(s => s.toLowerCase() === section.toLowerCase())) {
      changes.push({ type: 'removed', description: `Removed section: "${section}"` });
    }
  }
  
  // Detect table changes
  const oldTables = countTables(oldContent);
  const newTables = countTables(newContent);
  
  if (newTables > oldTables) {
    changes.push({ type: 'added', description: `Added ${newTables - oldTables} table(s)` });
  } else if (oldTables > newTables) {
    changes.push({ type: 'removed', description: `Removed ${oldTables - newTables} table(s)` });
  }
  
  // Detect list changes
  const oldLists = countListItems(oldContent);
  const newLists = countListItems(newContent);
  
  if (Math.abs(newLists - oldLists) >= 3) {
    if (newLists > oldLists) {
      changes.push({ type: 'added', description: `Added ${newLists - oldLists} list item(s)` });
    } else {
      changes.push({ type: 'removed', description: `Removed ${oldLists - newLists} list item(s)` });
    }
  }
  
  // Compare word count for general content changes
  const oldWordCount = countWords(oldContent);
  const newWordCount = countWords(newContent);
  const wordDiff = newWordCount - oldWordCount;
  
  if (Math.abs(wordDiff) > 20) {
    if (wordDiff > 0) {
      changes.push({ type: 'added', description: `Added ~${wordDiff} words of content` });
    } else {
      changes.push({ type: 'removed', description: `Removed ~${Math.abs(wordDiff)} words of content` });
    }
  }
  
  // Detect formatting changes if no other structural changes
  if (changes.length === 0) {
    // Check for bold/formatting changes
    const oldBoldCount = (oldContent.match(/\*\*[^*]+\*\*/g) || []).length;
    const newBoldCount = (newContent.match(/\*\*[^*]+\*\*/g) || []).length;
    
    if (oldBoldCount !== newBoldCount) {
      changes.push({ type: 'modified', description: 'Updated text formatting' });
    }
    
    // General text comparison
    if (oldLines.join('') !== newLines.join('')) {
      changes.push({ type: 'modified', description: 'Updated content text' });
    }
  }
  
  // Generate the final notes string
  if (changes.length === 0) {
    return 'Minor formatting changes';
  }
  
  // Group by type
  const added = changes.filter(c => c.type === 'added');
  const removed = changes.filter(c => c.type === 'removed');
  const modified = changes.filter(c => c.type === 'modified');
  
  const notes: string[] = [];
  
  if (added.length > 0) {
    notes.push(...added.map(c => `• ${c.description}`));
  }
  if (removed.length > 0) {
    notes.push(...removed.map(c => `• ${c.description}`));
  }
  if (modified.length > 0) {
    notes.push(...modified.map(c => `• ${c.description}`));
  }
  
  return notes.join('\n');
}

/**
 * Normalize content by removing extra whitespace and standardizing line breaks.
 */
function normalizeContent(content: string): string[] {
  return content
    .split(/\n+/)
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

/**
 * Extract section headers from content.
 */
function extractSections(content: string): string[] {
  const sections: string[] = [];
  
  // Match markdown headers (## or ###)
  const headerMatches = content.match(/^#{1,3}\s+(.+)$/gm) || [];
  for (const match of headerMatches) {
    const title = match.replace(/^#{1,3}\s+/, '').trim();
    if (title) sections.push(title);
  }
  
  // Also match bold text that might be section headers (standalone bold lines)
  const boldMatches = content.match(/^\*\*([^*]+)\*\*\s*$/gm) || [];
  for (const match of boldMatches) {
    const title = match.replace(/\*\*/g, '').trim();
    // Only consider it a section if it looks like a header (short, no punctuation at end)
    if (title && title.length < 50 && !title.endsWith('.')) {
      sections.push(title);
    }
  }
  
  return sections;
}

/**
 * Count markdown tables in content.
 */
function countTables(content: string): number {
  // Count table rows (lines starting and ending with |)
  const tableRows = content.match(/^\|.+\|$/gm) || [];
  // Estimate number of tables (groups of consecutive table rows)
  if (tableRows.length === 0) return 0;
  
  // Rough estimate: divide by average table size
  return Math.max(1, Math.floor(tableRows.length / 4));
}

/**
 * Count list items in content.
 */
function countListItems(content: string): number {
  // Match markdown list items
  const items = content.match(/^[-*•]\s+.+$/gm) || [];
  const numbered = content.match(/^\d+\.\s+.+$/gm) || [];
  return items.length + numbered.length;
}

/**
 * Count words in content.
 */
function countWords(content: string): number {
  // Remove markdown syntax and count words
  const cleanContent = content
    .replace(/[#*|_\-`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  if (!cleanContent) return 0;
  return cleanContent.split(' ').filter(w => w.length > 0).length;
}
