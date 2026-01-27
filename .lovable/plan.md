
# Plan: High-Fidelity Policy Document Viewing

## Problem Summary
The current text extraction from Word documents is losing critical formatting:
- **Tables are flattened**: Left column headers and right column content become a single vertical list
- **Nested tables are missed**: Reference document lists and similar structures are lost
- **Entire sections missing**: "ROLES & RESPONSIBILITIES" and similar content stored in tables is skipped
- **No visual parity**: The extracted text doesn't match the original document layout

## Proposed Solution: Hybrid Document Viewer

Given your requirements (three-pane review feature, need to read full policy content), I recommend a **dual-mode approach**:

### Mode 1: Visual Document Viewer (Primary)
Render the original document visually for reading, using the already-installed `pdfjs-dist` library:

- **For PDFs**: Render directly using the existing `PdfJsViewer` component
- **For Word docs**: Convert to PDF on the server using a conversion service, then render

This ensures 100% visual fidelity with the original document.

### Mode 2: Enhanced Text Extraction (For AI/Search)
Improve the extraction logic to preserve table structures for AI analysis and search functionality:

- Parse `<w:tbl>` elements properly with row/cell structure
- Output Markdown tables for structured data
- Handle nested tables recursively

---

## Implementation Steps

### Step 1: Create Policy Document Viewer Component
Build a new `PolicyDocumentViewer` component that:
- Detects file type (PDF vs Word)
- For PDFs: Uses `PdfJsViewer` directly
- For Word docs: Shows the PDF-converted version or falls back to enhanced text view
- Includes zoom, page navigation, and scroll sync for the three-pane review

**New file**: `src/components/policies/PolicyDocumentViewer.tsx`

### Step 2: Add Word-to-PDF Conversion Edge Function
Create a backend function that converts Word documents to PDF for rendering:

- Uses a cloud conversion API (like CloudConvert or LibreOffice in Docker)
- Caches the converted PDF in storage alongside the original
- Falls back gracefully if conversion fails

**New file**: `supabase/functions/convert-to-pdf/index.ts`

**Alternative**: Use a client-side approach with `mammoth.js` to convert DOCX to HTML, which can then be styled to match the original layout.

### Step 3: Improve Text Extraction for AI/Metadata
Refactor the `extractTextFromDocx` function to properly handle tables:

```text
Current approach:
  - Matches <w:p> paragraphs only
  - Ignores table structure
  - Loses cell relationships

New approach:
  - Parse document as DOM tree
  - Identify <w:tbl> elements first
  - For each table:
    - Extract rows (<w:tr>)
    - Extract cells (<w:tc>)
    - Detect if first column is headers
    - Output as Markdown table or structured format
  - Handle nested tables recursively
  - Preserve section markers
```

**Updated file**: `supabase/functions/analyze-policy-sqf/index.ts`

### Step 4: Update PolicyDetail Content Tab
Modify the Content tab to use the new viewer:

- Show original document visually (not extracted text)
- Keep extracted text for search/AI purposes only
- Add "View Original" and "View Extracted Text" toggle if needed

**Updated file**: `src/pages/quality/PolicyDetail.tsx`

### Step 5: Integrate with Three-Pane Review
Ensure the document viewer works in the existing review layout:
- Scrollable document pane
- Synchronized navigation
- Proper sizing for side-by-side comparison

---

## Technical Details

### Table Extraction Algorithm
```text
function extractTables(xmlContent):
  1. Find all <w:tbl> elements
  2. For each table:
     a. Extract all <w:tr> (rows)
     b. For each row, extract <w:tc> (cells)
     c. For each cell:
        - Check for nested <w:tbl> (recursive)
        - Extract text from <w:p> paragraphs
     d. Determine if Column 0 contains headers (bold/caps)
     e. Output as Markdown table:
        | Header | Content |
        |--------|---------|
        | Cell 1 | Cell 2  |
  3. Return structured content with tables inline
```

### Word-to-HTML Alternative
Instead of PDF conversion, convert DOCX to HTML using `mammoth.js`:
- Preserves tables as HTML `<table>` elements
- Can be styled with CSS to match original
- Works entirely client-side
- Lighter weight than PDF conversion

### Storage Structure
```text
policy-attachments/
  policies/{policy_id}/
    original.docx          (uploaded file)
    converted.pdf          (generated for viewing)
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/policies/PolicyDocumentViewer.tsx` | Create | Visual document viewer component |
| `supabase/functions/convert-to-pdf/index.ts` | Create | Word-to-PDF conversion (optional) |
| `supabase/functions/analyze-policy-sqf/index.ts` | Modify | Improve table extraction logic |
| `src/pages/quality/PolicyDetail.tsx` | Modify | Use new viewer in Content tab |

---

## Recommended Approach

Given the complexity of perfect Word document rendering and your immediate need, I recommend:

**Phase 1 (Quick Win)**: 
- Render PDF attachments directly using the existing `PdfJsViewer`
- For Word docs, provide a download link until conversion is set up

**Phase 2 (Full Solution)**:
- Add Word-to-HTML conversion using `mammoth.js` (no external API needed)
- Render HTML with styled tables matching original layout
- Keep enhanced text extraction for AI/search only

This gives you visual fidelity immediately for PDFs while we build proper Word support.

---

## Question for You

Before proceeding, I have one clarification:

**Are most of your policy documents PDFs or Word documents?**
- If primarily **PDFs**: We can have visual fidelity working today
- If primarily **Word docs**: We should prioritize the mammoth.js HTML conversion approach

