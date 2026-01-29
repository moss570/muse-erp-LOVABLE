import { format } from "date-fns";

interface PolicyDocumentRendererProps {
  policy: {
    policy_number?: string | null;
    title: string;
    effective_date?: string | null;
    review_date?: string | null;
    owner?: { first_name?: string; last_name?: string } | null;
    content?: string | null;
  };
}

interface ParsedSection {
  type: 'header' | 'metadata' | 'policy-steps' | 'nested-table' | 'text';
  label?: string;
  content: string;
  rows?: string[][];
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
        sections.push({ type: 'text', content: text });
      }
      textBuffer = [];
    }
  };

  const flushTable = () => {
    if (currentTableLines.length > 0) {
      const tableText = currentTableLines.join('\n');
      const rows = parseMarkdownTable(tableText);
      
      if (rows.length > 0) {
        const firstCell = rows[0]?.[0]?.toUpperCase() || '';
        
        // Check if it's the POLICY section with Step/Action format
        if (firstCell.includes('POLICY') || firstCell.includes('STEP') || firstCell.includes('LINE')) {
          sections.push({
            type: 'policy-steps',
            label: 'POLICY',
            content: tableText,
            rows: rows.slice(1), // Skip header row
          });
        }
        // Check if it's a metadata section (PURPOSE, SCOPE, etc.)
        else if (
          firstCell.includes('PURPOSE') ||
          firstCell.includes('SCOPE') ||
          firstCell.includes('ROLES') ||
          firstCell.includes('RESPONSIBILITIES') ||
          firstCell.includes('DEFINITION') ||
          firstCell.includes('REFERENCE') ||
          firstCell.includes('DOCUMENT')
        ) {
          // Check for nested tables
          const secondCell = rows[0]?.[1] || '';
          if (hasNestedTable(secondCell)) {
            sections.push({
              type: 'nested-table',
              label: firstCell,
              content: secondCell,
              rows: parseMarkdownTable(secondCell),
            });
          } else {
            sections.push({
              type: 'metadata',
              label: firstCell,
              content: secondCell,
              rows,
            });
          }
        }
        // Generic table
        else {
          sections.push({
            type: 'metadata',
            label: rows[0]?.[0] || '',
            content: rows[0]?.[1] || '',
            rows,
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
  const ownerName = policy.owner 
    ? `${policy.owner.first_name || ''} ${policy.owner.last_name || ''}`.trim() 
    : "Not assigned";

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
                                  <td key={cellIdx}>{cell}</td>
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
