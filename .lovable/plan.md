
# Plan: SQF Mapping Tab with Side-by-Side View and Evidence Highlighting

## Summary
Add a new "SQF Codes" tab to the Policy Detail page that displays all mapped SQF codes for the current policy. Include a toggle for side-by-side viewing of the policy document alongside the SQF requirements, with the ability to highlight specific lines in the policy that provide evidence of compliance.

---

## Feature Overview

### 1. New "SQF Codes" Tab
A dedicated tab showing all SQF codes mapped to this policy with:
- Code number, title, and compliance status (Compliant/Partial/Gap)
- The AI-generated explanation of how the policy satisfies each code
- Gap descriptions for partial or non-compliant mappings
- Clickable rows to select a code for side-by-side comparison

### 2. Side-by-Side Toggle View
When enabled, the screen splits into two panels:
- **Left panel**: Policy document viewer (Original or Text view)
- **Right panel**: Selected SQF code details with requirement text

Uses the existing `react-resizable-panels` library for adjustable panel widths.

### 3. Evidence Highlighting
When viewing the extracted text version of a policy:
- Each SQF mapping stores specific text excerpts that provide evidence
- These excerpts are highlighted in the policy content when a code is selected
- A new database column stores the evidence text for each mapping

---

## Implementation Steps

### Step 1: Database Enhancement
Add a new column to store evidence excerpts for highlighting:

```text
ALTER TABLE policy_sqf_mappings 
ADD COLUMN evidence_excerpts text[];
```

This column will store an array of text snippets from the policy that prove compliance.

### Step 2: Create SQF Mappings Tab Component
Build a new component that displays mapped SQF codes for the policy.

**New file**: `src/components/policies/PolicySQFMappingsTab.tsx`

Features:
- Fetches mappings using the existing `usePolicySQFMappings` hook
- Displays each mapping with code number, title, status badge, and explanation
- Shows gap descriptions with warning styling
- Includes an "Analyze for Mappings" button if no mappings exist
- Click handler to select a mapping for side-by-side view

### Step 3: Create Side-by-Side Layout Component
Build a layout component for the split view experience.

**New file**: `src/components/policies/PolicySideBySideView.tsx`

Features:
- Uses `ResizablePanelGroup`, `ResizablePanel`, and `ResizableHandle` from existing UI
- Left panel: PolicyDocumentViewer (existing component)
- Right panel: Selected SQF code details with full requirement text
- Remembers panel size preferences
- Collapsible side panel

### Step 4: Create Evidence Highlighter Component
Build a component that renders extracted policy text with highlighted evidence.

**New file**: `src/components/policies/PolicyContentWithHighlights.tsx`

Features:
- Takes policy content and evidence excerpts as props
- Searches for each excerpt in the content
- Wraps matching text in styled highlight spans
- Uses distinct colors for different SQF codes
- Scroll-to-highlight on code selection

### Step 5: Update PolicyDetail Page
Modify the main page to integrate all new components.

**Updated file**: `src/pages/quality/PolicyDetail.tsx`

Changes:
- Add new "SQF Codes" tab to the TabsList
- Add state for side-by-side mode toggle
- Add state for selected SQF code
- Conditionally render the side-by-side layout
- Pass highlight data to the content viewer

### Step 6: Enhance AI Analysis to Extract Evidence
Update the edge function to identify and return specific evidence excerpts.

**Updated file**: `supabase/functions/analyze-policy-sqf/index.ts`

Changes:
- Modify the AI prompt to request specific text excerpts as evidence
- Return `evidence_excerpts` array for each mapping
- Store excerpts when saving mappings

---

## Technical Details

### Data Flow for Highlighting

```text
1. User clicks "Re-analyze" or imports policy
2. AI reads document and identifies SQF mappings
3. For each mapping, AI extracts specific text excerpts as evidence
4. Excerpts are stored in policy_sqf_mappings.evidence_excerpts
5. When user views SQF Codes tab, excerpts are loaded with mappings
6. When user selects a code, content view highlights matching excerpts
```

### Component Hierarchy

```text
PolicyDetail.tsx
├── [Standard View - no toggle]
│   ├── Tabs
│   │   ├── Content Tab (existing)
│   │   ├── Versions Tab (existing)
│   │   ├── Attachments Tab (existing)
│   │   ├── Acknowledgements Tab (existing)
│   │   └── SQF Codes Tab (NEW)
│   │       └── PolicySQFMappingsTab
│
└── [Side-by-Side View - toggle enabled]
    └── PolicySideBySideView
        ├── ResizablePanel (Left: Policy Document)
        │   └── PolicyDocumentViewer OR PolicyContentWithHighlights
        └── ResizablePanel (Right: SQF Code Details)
            └── SQFCodeDetailPanel
```

### Highlight Styling

```text
.evidence-highlight {
  background-color: rgba(59, 130, 246, 0.2);  /* Blue tint */
  border-bottom: 2px solid #3b82f6;
  padding: 0 2px;
  transition: background-color 0.2s;
}

.evidence-highlight:hover {
  background-color: rgba(59, 130, 246, 0.4);
}

.evidence-highlight.active {
  background-color: rgba(34, 197, 94, 0.3);  /* Green when selected */
  border-color: #22c55e;
}
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/policies/PolicySQFMappingsTab.tsx` | Create | Tab component displaying all mapped SQF codes |
| `src/components/policies/PolicySideBySideView.tsx` | Create | Resizable split-pane layout for comparison |
| `src/components/policies/PolicyContentWithHighlights.tsx` | Create | Text renderer with evidence highlighting |
| `src/components/policies/SQFCodeDetailPanel.tsx` | Create | Right panel showing selected code details |
| `src/pages/quality/PolicyDetail.tsx` | Modify | Add SQF tab, toggle, and integration |
| `src/styles/policy-document.css` | Modify | Add highlight styling |
| `supabase/functions/analyze-policy-sqf/index.ts` | Modify | Extract and return evidence excerpts |
| Database migration | Create | Add `evidence_excerpts` column |

---

## User Experience

### Viewing SQF Mappings
1. Navigate to a policy detail page
2. Click the "SQF Codes" tab (shows count badge like other tabs)
3. See all mapped codes with compliance status
4. Click any code to see full details

### Side-by-Side Comparison
1. Toggle "Compare" switch in the SQF tab header
2. Screen splits: policy on left, codes on right
3. Select different codes to update the right panel
4. Drag the divider to adjust panel widths
5. Toggle off to return to normal view

### Evidence Highlighting
1. Switch to "Text" view in the left panel
2. Click an SQF code in the right panel
3. Evidence excerpts highlight in blue in the policy text
4. Scroll automatically jumps to first highlight
5. Hover over highlights to see emphasis

---

## Edge Cases

- **No mappings yet**: Show empty state with "Analyze for SQF Mappings" button
- **Visual view active**: Highlighting only works in Text view; show info message
- **Evidence not found**: If excerpt text changed after re-analysis, show "Evidence may have changed" warning
- **Long policies**: Virtual scrolling maintains performance; highlight scrolls into view
- **Mobile view**: Side-by-side collapses to stacked layout

