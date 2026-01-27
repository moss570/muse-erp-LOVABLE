
## What you should see (where to look)
The green highlights only appear in **Compare View** when you are looking at the **Text** version of the policy.

To see them:
1. Open the policy page.
2. Click the **SQF Codes** tab.
3. Click an SQF code in the list so it becomes **selected**.
4. Turn on the **Compare View** toggle.
5. In the left panel (“Policy Document”), make sure you’re on **Text** (not Original).

If everything is wired correctly and evidence exists, the policy text on the left should show green highlighted phrases and auto-scroll to the first one.

## Why you’re not seeing any highlights right now (root cause found)
Even if you do all the steps above, there are currently **no evidence excerpts saved** for this policy’s mappings, so there’s nothing to highlight.

I confirmed in the database for policy `1f943f7e-ffac-452f-96e6-6e4665ad3a7a` that **all mappings have `evidence_excerpts` length = 0**.

This is happening because the UI code that saves SQF mappings to the database **does not persist `evidence_excerpts`**, even though the analyzer function is returning them.

Places missing `evidence_excerpts` on save:
- `src/components/policies/PolicyFormDialog.tsx` (when creating a policy)
- `src/components/policies/BulkPolicyUploadDialog.tsx` (bulk import)
- `src/components/sqf/PolicySQFMappingDialog.tsx` (manual mapping dialog)
Also, the **Re-analyze** button in `PolicyDetail.tsx` currently updates only `policies.content` and does **not upsert mappings at all**, so it can’t populate evidence excerpts.

## Implementation plan (so highlights actually show)
### A) Fix persistence: store evidence_excerpts whenever mappings are saved
1. Update the SQF mapping type in the UI (where applicable) to include:
   - `evidence_excerpts?: string[]`
2. In each place we upsert into `policy_sqf_mappings`, include:
   - `evidence_excerpts: m.evidence_excerpts ?? []`

Files to update:
- `src/components/policies/PolicyFormDialog.tsx`
- `src/components/policies/BulkPolicyUploadDialog.tsx`
- `src/components/sqf/PolicySQFMappingDialog.tsx`

### B) Fix the “Re-analyze” button so it refreshes mappings + evidence too
Update `src/pages/quality/PolicyDetail.tsx` → `handleReanalyze()` so that when `analyze-policy-sqf` returns:
- `document_content`
- `mappings` (with evidence)

…it will:
1. Update `policies.content` (already done)
2. Upsert returned mappings into `policy_sqf_mappings`, including `evidence_excerpts`
3. Invalidate/refetch:
   - policy data
   - policy sqf mappings query
   - compliance summary query (if needed)

This is the key change that will let an existing policy (like the one you’re on) gain evidence highlights without having to recreate it.

### C) Add a small UI hint so it’s obvious how to trigger highlights
In `PolicySQFMappingsTab.tsx` and/or `PolicySideBySideView.tsx`, add a lightweight callout like:
- “Evidence highlighting appears in Compare View when the policy is in Text view.”
- If selected mapping has 0 evidence excerpts: “No evidence excerpts saved yet. Click Re-analyze to generate them.”

This prevents confusion when users are in “Original” view (where highlighting is not possible) or when evidence hasn’t been generated yet.

### D) Verification steps (acceptance criteria)
After implementing the above:
1. Open the same policy.
2. Click **Re-analyze** once.
3. Go to **SQF Codes** tab and select a code.
4. Turn on **Compare View**.
5. Confirm:
   - The mapping shows “X evidence excerpt(s) available”
   - Green highlights appear in the left panel when in **Text**
   - Auto-scroll goes to the first highlight

## Notes / edge cases we’ll handle
- Evidence excerpts may not match perfectly if the extracted text differs from the original (formatting differences). Your current flexible whitespace regex helps, but we’ll also ensure:
  - excerpts are trimmed
  - we avoid empty excerpts
- If the policy has no `content` yet, Compare View should still work for Original view, but highlighting will be disabled until text extraction exists.

## What you can do immediately (before the code fix)
Right now, you can confirm you’re in the right place:
- SQF Codes tab → select a code → Compare View ON → Left panel “Text”
If you still see no highlights, that’s expected until we persist `evidence_excerpts` and re-analyze updates mappings.

