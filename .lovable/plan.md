

# Plan: Fix Visual View Rendering and Add Visual Editor

## Problem Summary

Looking at your screenshots, I can see two distinct issues:

### Issue 1: Reference Documents (Green Circle)
**Original Word Document:** Has a proper table with columns "Reference No." and "Title" containing:
- 22.0 (LEGACY SYSTEM) | Document and Records Management
- SOP.00001.01 | Creating a Document Number and Revision Retention
- REG.00001.01 | Register of Document Retention

**Current Visual View:** Shows `##` markdown headers and `**bold**` text instead of a proper table format.

### Issue 2: Definitions (Blue Circle)
**Original Word Document:** Has a clean definition list (AID, FORM, POL, SOP, SSOP, WORK, REG with their meanings)

**Current Visual View:** Shows `**bold**` markdown syntax literally displayed, wrapped incorrectly, not formatted as a clean list.

### Root Cause
The `analyze-policy-sqf` Edge Function extracts Word document content as Markdown format. The `PolicyDocumentRenderer` component attempts to parse this Markdown and render it as HTML tables, but:
1. The extraction creates inconsistent table structures
2. Headers are marked with `##` which pollutes the content
3. Nested tables lose their proper structure during extraction

---

## Proposed Solution

### Part 1: Improve Content Extraction (Edge Function)

Update the `analyze-policy-sqf` Edge Function to:
1. Better detect and format section-specific content (REFERENCE DOCUMENTS, DEFINITIONS)
2. Use cleaner markers instead of Markdown symbols
3. Preserve table structure without mixing with headers

### Part 2: Improve Visual Rendering (Frontend)

Update `PolicyDocumentRenderer.tsx` to:
1. Better parse the REFERENCE DOCUMENTS section as a proper nested table
2. Properly format DEFINITIONS as a clean definition list or table
3. Handle edge cases in the extracted content

### Part 3: Add Visual Editor for Manual Adjustments

Create a new Rich Text Editor specifically for policy content that allows users to:
1. Edit the extracted content directly
2. Format tables, lists, and sections manually
3. Save changes back to the policy record

---

## Technical Implementation

### Files to Modify

#### 1. `supabase/functions/analyze-policy-sqf/index.ts`

Improve the extraction logic to:
- Detect "REFERENCE DOCUMENTS" and "DEFINITIONS" sections
- Format them as structured JSON instead of Markdown tables
- Return additional structured data in the AI response

#### 2. `src/components/policies/PolicyDocumentRenderer.tsx`

Update the component to:
- Better detect and render REFERENCE DOCUMENTS section
- Parse DEFINITIONS as a proper definition list
- Strip `##` and `**` markdown markers and render as proper HTML
- Handle the case where content has markdown artifacts

Key changes to `parsePolicyContent()` function:
```typescript
// Add section detection for REFERENCE DOCUMENTS
if (firstCell.includes('REFERENCE') && firstCell.includes('DOCUMENT')) {
  // Parse the content as a nested table with Reference No. and Title columns
  // Look for subsequent rows that belong to this table
}

// Add section detection for DEFINITIONS
if (firstCell.includes('DEFINITION')) {
  // Parse as definition list, not just text
  // Split on bold markers and format as term/definition pairs
}
```

#### 3. Create `src/components/policies/PolicyContentEditor.tsx` (NEW)

A new component that wraps TipTap editor with:
- Table support (via `@tiptap/extension-table`)
- Save functionality to update policy.content
- Toggle between "Edit" and "View" modes
- Toolbar with table, list, and formatting controls

```typescript
// New dependencies needed:
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
```

#### 4. Update `src/pages/quality/PolicyDetail.tsx`

Add an "Edit Content" button that:
- Switches the Visual View to editor mode
- Allows users to fix formatting issues manually
- Saves changes back to the database

---

## New Dependencies

The following TipTap extensions need to be installed for table support:
- `@tiptap/extension-table`
- `@tiptap/extension-table-row`
- `@tiptap/extension-table-cell`
- `@tiptap/extension-table-header`

---

## UI Flow After Implementation

1. **Visual View (Default):** Shows the professionally formatted document
2. **Edit Content Button:** Appears for managers/admins
3. **Editor Mode:** 
   - Rich text editor with the policy content loaded
   - Toolbar with: Bold, Italic, Headings, Tables, Lists, Alignment
   - Insert Table button to add/edit tables
   - Save/Cancel buttons
4. **On Save:** Updates `policy.content` and refreshes the view

---

## Benefits

1. **Immediate Fix:** Improved parsing will handle existing content better
2. **Future-Proof:** Visual editor allows manual corrections for any document format
3. **User Control:** Users can adjust layout without re-uploading documents
4. **Consistency:** All policies can be formatted to match your standard template

---

## Implementation Order

1. First: Fix the `PolicyDocumentRenderer` parsing to handle current content better
2. Second: Add the PolicyContentEditor component with TipTap + tables
3. Third: Wire up the edit button in PolicyDetail page
4. Fourth: Improve the extraction in the Edge Function for future uploads

