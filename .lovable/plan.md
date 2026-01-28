

# Policy Editing & Versioning Enhancement Plan

## Overview

This plan enhances the policy editing workflow so that **every save automatically creates a version snapshot** in the version history. Users will also be prompted for **change notes** explaining what was modified.

---

## Current State

- **Editing**: The `PolicyFormDialog` directly updates the `policies` table via `useUpdatePolicy()`, overwriting existing data
- **Versioning**: A `policy_versions` table exists but is only populated during the "Restore" flow
- **Version Number**: The `version` field on policies exists but isn't incremented during normal edits
- **History**: The "Versions" tab shows empty because no snapshots are being created

---

## What Will Change

### User Experience

1. When clicking "Edit" on a policy, the edit dialog opens (same as now)
2. A new **"Change Notes"** field will appear at the bottom of the form
3. When saving:
   - The **current state is captured** as a version snapshot before applying changes
   - The **version number increments** (e.g., v3 → v4)
   - Changes are applied to the policy
4. The **Versions tab** will now show the full edit history with:
   - Version number
   - Who made the change
   - When it was made
   - Change notes explaining what was modified
   - Option to view or restore previous versions

---

## Technical Implementation

### 1. Update `PolicyFormDialog.tsx`

**Add change notes field for edit mode:**
- Add a `change_notes` state field
- Display a textarea in the form footer when editing (not creating)
- Make it optional but encouraged

**Modify the save flow:**
- Detect if this is an edit (policy prop exists)
- Before updating, call a new `useUpdatePolicyWithVersion` hook

### 2. Create New Hook: `useUpdatePolicyWithVersion`

Located in `src/hooks/usePolicies.ts`

**Logic:**
```text
1. Fetch current policy state
2. Create version snapshot with:
   - version_number: current version
   - title, content, summary, status
   - change_notes from user input
   - snapshot: full JSON of current policy
   - created_by: current user
3. Update policy with:
   - New field values
   - Incremented version number
4. Invalidate query caches
```

### 3. Update the Form Save Handler

**In `PolicyFormDialog.tsx`:**
- Use `useUpdatePolicyWithVersion` instead of `useUpdatePolicy` for edits
- Pass the change notes along with the update data

### 4. Enhance Versions Tab Display

**In `PolicyDetail.tsx`:**
- Add "View" button to see the content of a specific version
- Add "Restore" button for managers/admins
- Show a diff indicator if content changed significantly

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/usePolicies.ts` | Add `useUpdatePolicyWithVersion` hook |
| `src/components/policies/PolicyFormDialog.tsx` | Add change notes field, use new hook for edits |
| `src/pages/quality/PolicyDetail.tsx` | Enhance versions tab with view/restore actions |

---

## Database Impact

No schema changes needed - the `policy_versions` table already has all required columns:
- `policy_id`, `version_number`, `title`, `content`, `summary`
- `change_notes`, `snapshot` (JSONB), `status`, `effective_date`
- `created_at`, `created_by`

---

## Example Flow

```text
User Flow:
┌─────────────────────────────────────────────┐
│ Policy: Food Safety Manual (v3)             │
│ Content: "Original content..."              │
└─────────────────────────────────────────────┘
                    │
                    ▼ User clicks "Edit"
┌─────────────────────────────────────────────┐
│ Edit Dialog                                 │
│ ─────────────────────────────────────────── │
│ Title: [Food Safety Manual        ]         │
│ Content: [Updated content...      ]         │
│                                             │
│ Change Notes (recommended):                 │
│ [Updated section 3.2 per audit findings]   │
│                                             │
│           [Cancel]  [Save Changes]          │
└─────────────────────────────────────────────┘
                    │
                    ▼ User clicks "Save"
┌─────────────────────────────────────────────┐
│ System Actions:                             │
│ 1. Snapshot v3 → policy_versions table      │
│ 2. Update policy → v4, new content          │
│ 3. Show success toast                       │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│ Policy: Food Safety Manual (v4)             │
│ Content: "Updated content..."               │
│                                             │
│ Versions Tab:                               │
│ ● v3 - John Smith - Jan 28, 2026            │
│   "Updated section 3.2 per audit findings"  │
│   [View] [Restore]                          │
│                                             │
│ ● v2 - Jane Doe - Jan 15, 2026              │
│   "Added appendix A"                        │
│   [View] [Restore]                          │
└─────────────────────────────────────────────┘
```

---

## Edge Cases Handled

1. **First edit of a policy**: Creates first version entry (v1)
2. **Empty change notes**: Allowed but system will add default note "Updated on [date]"
3. **No actual changes made**: Still creates version (user explicitly saved)
4. **Concurrent edits**: Existing concurrent edit wrapper will handle conflicts

