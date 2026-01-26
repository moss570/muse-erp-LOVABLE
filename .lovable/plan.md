

# Fix SQF Document Parsing Timeout Issue

## Problem Summary
The SQF document parsing is failing because the multi-pass AI extraction takes 10-15 minutes, but edge functions have a timeout limit of approximately 60-120 seconds. The function gets killed before completing all 3 passes, leaving the status stuck at "processing" with 0 codes extracted.

## Solution: Queue-Based Async Processing

We'll implement an asynchronous processing pattern where:
1. The initial upload triggers a quick "queue" operation (returns immediately)
2. A separate "process" function handles one pass at a time
3. The client polls for progress or uses real-time subscriptions to show status

---

## Implementation Steps

### Step 1: Add Queue Tracking Columns
Add new columns to `sqf_editions` to track multi-pass processing:
- `current_pass` (integer, default 0) - tracks which pass we're on (0-3)
- `pass_results` (JSONB) - stores results from each completed pass

### Step 2: Create Lightweight Queue Function
Create a new edge function `queue-sqf-parsing` that:
- Accepts the PDF and edition_id
- Stores the PDF in Supabase Storage temporarily
- Sets status to "queued" and returns immediately (~2 seconds)
- Client gets instant feedback that processing started

### Step 3: Create Single-Pass Processing Function
Create a new edge function `process-sqf-pass` that:
- Takes edition_id and pass_number (1, 2, or 3)
- Retrieves the PDF from storage
- Runs ONE pass of AI extraction (Part A, B, or C)
- Saves extracted codes to database
- Updates `current_pass` and `pass_results`
- If all passes complete, sets status to "completed"

### Step 4: Implement Client-Side Orchestration
Update the upload dialog to:
1. Call `queue-sqf-parsing` (fast, returns immediately)
2. Close the dialog and show a toast: "Processing started - check back in 10-15 minutes"
3. The SQF Editions list will show real-time status updates

### Step 5: Add Retry/Resume Capability  
Create a "Resume Parsing" button that:
- Checks which pass was last completed
- Calls `process-sqf-pass` for the next uncompleted pass
- Allows users to manually continue if processing stalls

---

## Alternative Simpler Approach (Recommended)

Instead of the full queue system, we can use a **sequential client-triggered approach**:

### Modified Flow:
1. **Client calls Pass 1** → Edge function extracts Module 2 codes (~60s) → Returns codes count
2. **Client calls Pass 2** → Edge function extracts Modules 3-9 codes (~60s) → Returns codes count  
3. **Client calls Pass 3** → Edge function extracts Modules 10-15 codes (~60s) → Returns codes count
4. **All complete** → Status set to "completed"

This keeps each edge function call under the timeout limit while still extracting all modules.

---

## Technical Details

### New Edge Function: `parse-sqf-pass`
```text
Input: { pdfBase64, edition_id, pass_number }
- pass_number 1 = Module 2 only
- pass_number 2 = Modules 3-9
- pass_number 3 = Modules 10-15

Process:
1. Call Gemini 2.5 Pro for ONLY the specified modules
2. Insert extracted codes to database
3. Update edition with partial progress
4. Return { success, codes_extracted, is_final_pass }
```

### Client-Side Loop (SQFEditionUploadDialog)
```text
1. Create edition record
2. Set status to "processing"
3. For each pass (1, 2, 3):
   a. Show progress: "Extracting Module X codes..."
   b. Call parse-sqf-pass with pass_number
   c. Update progress bar
   d. If error, mark as failed and stop
4. If all passes complete, set status to "completed"
5. Invalidate queries to refresh UI
```

### UI Progress Updates
- Pass 1: "Extracting System Elements (Module 2)..." 
- Pass 2: "Extracting Food Safety Plans (Modules 3-9)..."
- Pass 3: "Extracting Good Manufacturing Practices (Modules 10-15)..."
- Complete: "Successfully extracted X SQF codes"

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/functions/parse-sqf-pass/index.ts` | Create - single-pass extraction function |
| `supabase/functions/parse-sqf-document/index.ts` | Delete or keep as fallback |
| `src/components/sqf/SQFEditionUploadDialog.tsx` | Modify - implement sequential pass calls |

---

## Expected Outcome
- Each AI call stays under 60-second timeout
- All modules (including Module 11) get extracted
- User sees real-time progress as each pass completes
- If one pass fails, user can retry from that point
- Total processing time: ~3-5 minutes (3 passes × 60s each)

