import { format } from "date-fns";

interface PolicyDocumentRendererProps {
  policy: {
    policy_number?: string | null;
    title: string;
    effective_date?: string | null;
    review_date?: string | null;
    owner?: { id: string; name: string } | null;
    content?: string | null;
  };
}

interface ParsedSection {
  type: 'header' | 'metadata' | 'policy-steps' | 'nested-table' | 'definition-list' | 'reference-table' | 'text';
  label?: string;
  content: string;
  rows?: string[][];
  definitions?: { term: string; description: string }[];
  references?: { refNo: string; title: string }[];
}

// Clean markdown artifacts from text
function cleanMarkdown(text: string): string {
  return text
    .replace(/^##\s*/gm, '') // Remove ## headers
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold markers but keep text
    .trim();
}

// Parse bold markers for formatting (when we want to keep formatting)
function formatWithBold(text: string): string {
  return text
    .replace(/^##\s*/gm, '') // Remove ## headers
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>');
}

// Parse markdown table into rows
function parseMarkdownTable(tableText: string): string[][] {
  const lines = tableText.trim().split('\n');
  const rows: string[][] = [];
  
  for (const line of lines) {
    // Skip separator lines (|---|---|)
    if (/^\|[\s-:]+\|$/.test(line.trim()) || /^\|[\s-:|]+\|$/.test(line.trim())) {
      continue;
    }
    
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const cells = line
        .slice(1, -1) // Remove leading and trailing |
        .split('|')
        .map(cell => cell.trim());
      if (cells.some(c => c.length > 0)) {
        rows.push(cells);
      }
    }
  }
  
  return rows;
}

// Check if content has a nested table structure
function hasNestedTable(content: string): boolean {
  const lines = content.split('\n');
  let tableCount = 0;
  for (const line of lines) {
    if (line.trim().startsWith('|') && line.includes('|')) {
      tableCount++;
    }
  }
  return tableCount > 2;
}

// Parse REFERENCE DOCUMENTS section - extracts Reference No. and Title pairs
function parseReferenceDocuments(content: string): { refNo: string; title: string }[] {
  const references: { refNo: string; title: string }[] = [];
  const cleanContent = cleanMarkdown(content);
  
  // Try to parse as nested table first
  const lines = cleanContent.split('\n').filter(l => l.trim());
  
  for (const line of lines) {
    // Check for table row format: | ref | title |
    if (line.trim().startsWith('|')) {
      const cells = line.slice(1, -1).split('|').map(c => cleanMarkdown(c));
      if (cells.length >= 2 && cells[0] && cells[1]) {
        // Skip header rows
        if (cells[0].toLowerCase().includes('reference') && cells[1].toLowerCase().includes('title')) {
          continue;
        }
        if (cells[0] === '---' || cells[1] === '---') continue;
        references.push({ refNo: cells[0], title: cells[1] });
      }
    } else {
      // Try parsing "REF_NO - Title" or "REF_NO | Title" format
      const match = line.match(/^([A-Z0-9.\-()]+(?:\s+\([^)]+\))?)\s*[-|:]\s*(.+)$/i);
      if (match) {
        references.push({ refNo: cleanMarkdown(match[1]), title: cleanMarkdown(match[2]) });
      }
    }
  }
  
  return references;
}

// Parse DEFINITIONS section - extracts term/definition pairs
function parseDefinitions(content: string): { term: string; description: string }[] {
  const definitions: { term: string; description: string }[] = [];
  const cleanContent = cleanMarkdown(content);
  
  // Split by bold markers or known acronyms
  // Pattern: **TERM** - Description or TERM: Description
  const lines = cleanContent.split('\n').filter(l => l.trim());
  
  for (const line of lines) {
    // Skip table rows with just separators
    if (line.includes('---')) continue;
    
    // Try pattern: TERM – Description or TERM - Description
    // Common terms: AID, FORM, POL, SOP, SSOP, WORK, REG, etc.
    const match = line.match(/^([A-Z]{2,6})\s*[-–:]\s*(.+)$/i);
    if (match) {
      definitions.push({ 
        term: match[1].trim().toUpperCase(), 
        description: match[2].trim() 
      });
      continue;
    }
    
    // Try table row format: | TERM | Description |
    if (line.trim().startsWith('|')) {
      const cells = line.slice(1, -1).split('|').map(c => c.trim());
      if (cells.length >= 2) {
        const term = cleanMarkdown(cells[0]);
        const desc = cleanMarkdown(cells[1]);
        if (term && desc && !term.toLowerCase().includes('definition') && term !== '---') {
          definitions.push({ term, description: desc });
        }
      }
    }
  }
  
  return definitions;
}

// Parse the policy content into structured sections
function parsePolicyContent(content: string): ParsedSection[] {
  const sections: ParsedSection[] = [];
  const lines = content.split('\n');
  let currentTableLines: string[] = [];
  let textBuffer: string[] = [];

  const flushText = () => {
    if (textBuffer.length > 0) {
      const text = textBuffer.join('\n').trim();
      if (text) {
        // Clean standalone ## headers from text sections
        const cleanedText = text.replace(/^##\s+/gm, '');
        if (cleanedText.trim()) {
          sections.push({ type: 'text', content: cleanedText });
        }
      }
      textBuffer = [];
    }
  };

  const flushTable = () => {
    if (currentTableLines.length > 0) {
      const tableText = currentTableLines.join('\n');
      const rows = parseMarkdownTable(tableText);
      
      if (rows.length > 0) {
        const firstCell = (rows[0]?.[0] || '').toUpperCase();
        const cleanFirstCell = cleanMarkdown(firstCell);
        
        // Check for REFERENCE DOCUMENTS section
        if (cleanFirstCell.includes('REFERENCE') && cleanFirstCell.includes('DOCUMENT')) {
          const secondCell = rows[0]?.[1] || '';
          const references = parseReferenceDocuments(secondCell);
          
          if (references.length > 0) {
            sections.push({
              type: 'reference-table',
              label: 'REFERENCE DOCUMENTS',
              content: secondCell,
              references,
            });
          } else {
            // Fallback to nested table if no references parsed
            sections.push({
              type: 'nested-table',
              label: cleanFirstCell,
              content: secondCell,
              rows: parseMarkdownTable(secondCell),
            });
          }
        }
        // Check for DEFINITIONS section
        else if (cleanFirstCell.includes('DEFINITION')) {
          const secondCell = rows[0]?.[1] || '';
          const definitions = parseDefinitions(secondCell);
          
          if (definitions.length > 0) {
            sections.push({
              type: 'definition-list',
              label: 'DEFINITIONS',
              content: secondCell,
              definitions,
            });
          } else {
            // Fallback to metadata if no definitions parsed
            sections.push({
              type: 'metadata',
              label: cleanFirstCell,
              content: secondCell,
              rows,
            });
          }
        }
        // Check if it's the POLICY section with Step/Action format
        else if (cleanFirstCell.includes('POLICY') || cleanFirstCell.includes('STEP') || cleanFirstCell.includes('LINE')) {
          sections.push({
            type: 'policy-steps',
            label: 'POLICY',
            content: tableText,
            rows: rows.slice(1), // Skip header row
          });
        }
        // Check if it's a metadata section (PURPOSE, SCOPE, etc.)
        else if (
          cleanFirstCell.includes('PURPOSE') ||
          cleanFirstCell.includes('SCOPE') ||
          cleanFirstCell.includes('ROLES') ||
          cleanFirstCell.includes('RESPONSIBILITIES')
        ) {
          const secondCell = rows[0]?.[1] || '';
          if (hasNestedTable(secondCell)) {
            sections.push({
              type: 'nested-table',
              label: cleanFirstCell,
              content: secondCell,
              rows: parseMarkdownTable(secondCell),
            });
          } else {
            sections.push({
              type: 'metadata',
              label: cleanFirstCell,
              content: cleanMarkdown(secondCell),
              rows: rows.map(r => r.map(c => cleanMarkdown(c))),
            });
          }
        }
        // Generic table
        else {
          sections.push({
            type: 'metadata',
            label: cleanMarkdown(rows[0]?.[0] || ''),
            content: cleanMarkdown(rows[0]?.[1] || ''),
            rows: rows.map(r => r.map(c => cleanMarkdown(c))),
          });
        }
      }
      currentTableLines = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Check if line is part of a table
    if (trimmed.startsWith('|') && trimmed.includes('|')) {
      flushText();
      currentTableLines.push(line);
    } else {
      flushTable();
      textBuffer.push(line);
    }
  }

  // Flush remaining
  flushTable();
  flushText();

  return sections;
}

// Render formatted text (handle bold markers, line breaks)
function formatText(text: string): string {
  return text
    .replace(/^##\s*/gm, '') // Remove ## headers
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>');
}

export default function PolicyDocumentRenderer({ policy }: PolicyDocumentRendererProps) {
  const sections = policy.content ? parsePolicyContent(policy.content) : [];
  
  // Format dates
  const effectiveDate = policy.effective_date 
    ? format(new Date(policy.effective_date), "MM/dd/yyyy") 
    : "N/A";
  const reviewDate = policy.review_date 
    ? format(new Date(policy.review_date), "MM/dd/yyyy") 
    : "N/A";
  const ownerName = policy.owner?.name || "Not assigned";

  return (
    <div className="policy-visual-document">
      {/* Document Header */}
      <div className="policy-doc-header">
        <div className="policy-doc-header-left">
          <div className="policy-doc-logo-placeholder">
            <span className="text-muted-foreground text-sm">LOGO</span>
          </div>
        </div>
        <div className="policy-doc-header-right">
          <table className="policy-doc-header-table">
            <tbody>
              <tr>
                <td>Document Number:</td>
                <td>{policy.policy_number || "—"}</td>
              </tr>
              <tr>
                <td>Effective Date:</td>
                <td>{effectiveDate}</td>
              </tr>
              <tr>
                <td>Review Date:</td>
                <td>{reviewDate}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Title Banner */}
      <div className="policy-doc-title-banner">
        <h1 className="policy-doc-title">{policy.title}</h1>
        <p className="policy-doc-owner">Document Owner: {ownerName}</p>
      </div>

      {/* Content Sections */}
      <div className="policy-doc-sections">
        {sections.map((section, idx) => {
          // REFERENCE DOCUMENTS section - render as proper table
          if (section.type === 'reference-table' && section.references) {
            return (
              <table key={idx} className="policy-doc-section-table">
                <tbody>
                  <tr>
                    <td className="policy-doc-section-label">REFERENCE DOCUMENTS</td>
                    <td className="policy-doc-section-content">
                      <table className="policy-doc-nested-table">
                        <thead>
                          <tr>
                            <th className="font-semibold text-left p-2 border-b">Reference No.</th>
                            <th className="font-semibold text-left p-2 border-b">Title</th>
                          </tr>
                        </thead>
                        <tbody>
                          {section.references.map((ref, refIdx) => (
                            <tr key={refIdx}>
                              <td className="p-2 border-b font-mono text-sm">{ref.refNo}</td>
                              <td className="p-2 border-b">{ref.title}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>
            );
          }

          // DEFINITIONS section - render as clean definition list
          if (section.type === 'definition-list' && section.definitions) {
            return (
              <table key={idx} className="policy-doc-section-table">
                <tbody>
                  <tr>
                    <td className="policy-doc-section-label">DEFINITIONS</td>
                    <td className="policy-doc-section-content">
                      <dl className="space-y-2">
                        {section.definitions.map((def, defIdx) => (
                          <div key={defIdx} className="flex gap-2">
                            <dt className="font-semibold min-w-[80px] text-primary">{def.term}</dt>
                            <dd className="text-muted-foreground">– {def.description}</dd>
                          </div>
                        ))}
                      </dl>
                    </td>
                  </tr>
                </tbody>
              </table>
            );
          }

          // Regular metadata sections
          if (section.type === 'metadata' && section.rows) {
            return (
              <table key={idx} className="policy-doc-section-table">
                <tbody>
                  {section.rows.map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      <td className="policy-doc-section-label">{row[0]}</td>
                      <td 
                        className="policy-doc-section-content"
                        dangerouslySetInnerHTML={{ __html: formatText(row[1] || '') }}
                      />
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          }

          if (section.type === 'nested-table') {
            return (
              <table key={idx} className="policy-doc-section-table">
                <tbody>
                  <tr>
                    <td className="policy-doc-section-label">{section.label}</td>
                    <td className="policy-doc-section-content">
                      {section.rows && section.rows.length > 0 && (
                        <table className="policy-doc-nested-table">
                          <tbody>
                            {section.rows.map((row, rowIdx) => (
                              <tr key={rowIdx}>
                                {row.map((cell, cellIdx) => (
                                  <td key={cellIdx}>{cleanMarkdown(cell)}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            );
          }

          if (section.type === 'policy-steps') {
            return (
              <div key={idx} className="policy-doc-policy-section">
                <div className="policy-doc-policy-header">POLICY</div>
                <table className="policy-doc-steps-table">
                  <thead>
                    <tr>
                      <th className="policy-doc-step-col">Step</th>
                      <th className="policy-doc-action-col">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.rows?.map((row, rowIdx) => (
                      <tr key={rowIdx}>
                        <td className="policy-doc-step-num">{row[0] || (rowIdx + 1)}</td>
                        <td 
                          className="policy-doc-step-action"
                          dangerouslySetInnerHTML={{ __html: formatText(row[1] || '') }}
                        />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }

          if (section.type === 'text' && section.content.trim()) {
            return (
              <div 
                key={idx} 
                className="policy-doc-text-section"
                dangerouslySetInnerHTML={{ __html: formatText(section.content) }}
              />
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
