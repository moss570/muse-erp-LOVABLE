
# Plan: Professional Policy Document Visual View

## Overview
Create a polished, professional "Visual View" for policies that renders the extracted/edited content in a clean document format matching the original Word document layout. This includes a structured header, metadata tables, and properly formatted policy steps.

## What You'll See

### Current vs. New
- **Current**: Raw markdown tables displayed as plain text with messy pipe characters
- **New**: Professionally formatted document with:
  - Header section with logo placeholder, document number, dates
  - Colored title banner
  - Two-column metadata tables (PURPOSE, SCOPE, etc.)
  - Numbered POLICY steps in a clean table

### Visual Structure (matching your screenshots)

```text
+--------------------------------------------------+
| [Logo]              | Document Number: POL.00001 |
|                     | Effective Date: 05/16/2022 |
|                     | Review Date: 05/10/2025    |
+--------------------------------------------------+
|   [Title Banner - Colored Background]            |
|   Document Owner: Plant Manager                  |
+--------------------------------------------------+
| PURPOSE          | Document control policies... |
+--------------------------------------------------+
| SCOPE            | This procedure will be...    |
+--------------------------------------------------+
| ROLES &          | All Employees - Follow...    |
| RESPONSIBILITIES | Management - Ensure...       |
+--------------------------------------------------+
| REFERENCE        | +--------+----------------+  |
| DOCUMENTS        | | Ref No.| Title          |  |
|                  | +--------+----------------+  |
+--------------------------------------------------+
|                    POLICY                        |
+--------------------------------------------------+
| Step | Action                                    |
+------+-------------------------------------------+
|  1   | This policy is extracted from...         |
|  2   | Electronic documents and record forms... |
+--------------------------------------------------+
```

## Key Changes

### 1. Rename Button Label
- Change "Original" to "Visual View" in the toggle buttons

### 2. New Policy Document Renderer Component
Create `PolicyDocumentRenderer.tsx` that:
- Parses the markdown content
- Extracts metadata (policy number, dates, owner) from policy record
- Renders a professional document header
- Converts markdown tables to styled HTML tables
- Specially formats the POLICY section as numbered steps

### 3. Enhanced Markdown-to-HTML Conversion
- Full markdown table parsing (pipe-delimited rows)
- Recognize section headers (PURPOSE, SCOPE, ROLES, DEFINITIONS, POLICY, etc.)
- Two-column layout for metadata sections
- Step/Line numbered tables for policy procedures

### 4. CSS Styling Enhancements
- Header with company branding area
- Green/branded title banner
- Clean bordered tables
- Proper cell padding and typography

---

## Technical Implementation

### Files to Create
1. **`src/components/policies/PolicyDocumentRenderer.tsx`** - New component that renders policy content in document format

### Files to Modify
1. **`src/pages/quality/PolicyDetail.tsx`**
   - Rename "Original" button to "Visual View"
   - Replace inline `formatPolicyContent` with new `PolicyDocumentRenderer` component
   
2. **`src/styles/policy-document.css`**
   - Add styles for document header, title banner, section tables

### Key Logic
The renderer will:
1. Take `policy` object with metadata (policy_number, title, effective_date, review_date, owner)
2. Parse `policy.content` markdown into sections
3. Identify standard sections: PURPOSE, SCOPE, ROLES & RESPONSIBILITIES, REFERENCE DOCUMENTS, DEFINITIONS, POLICY
4. Render each section in the appropriate format:
   - Metadata sections → Two-column table (header | content)
   - POLICY section → Numbered step table (Step | Action)
   - Nested tables → Preserve structure for Reference Documents

### Parsing Strategy
```
1. Split content by markdown table blocks (lines starting with |)
2. For each table:
   - Check first column for section keywords
   - If POLICY section with Step/Action → render as numbered list table
   - Otherwise → render as two-column metadata table
3. Non-table content rendered as formatted paragraphs
```
