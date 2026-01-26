
# Plan: Fix SQF Code PDF Parsing

## Problem Summary
The SQF Code PDF upload is not working because:
- PDFs are binary files that cannot be read with `file.text()`
- The current approach sends garbled binary data to the AI
- Result: 0 codes extracted, parsing remains "pending"

## Solution Overview
Update both the frontend dialog and the backend edge function to use Gemini's native PDF reading capability (multimodal input), matching the proven pattern already used in the PO extraction feature.

---

## Implementation Steps

### Step 1: Update Frontend Upload Dialog
**File:** `src/components/sqf/SQFEditionUploadDialog.tsx`

**Changes:**
- Convert PDF file to Base64 using `FileReader.readAsDataURL()`
- Send Base64 string to edge function instead of text
- Store the Base64 without the data URL prefix for the API

```text
Current (broken):
  const fileText = await file.text();
  supabase.functions.invoke("parse-sqf-document", {
    body: { documentText: fileText, ... }
  });

New (working):
  const base64 = await readFileAsBase64(file);
  supabase.functions.invoke("parse-sqf-document", {
    body: { pdfBase64: base64, edition_id: edition.id }
  });
```

---

### Step 2: Update Edge Function for Multimodal AI
**File:** `supabase/functions/parse-sqf-document/index.ts`

**Changes:**
- Accept `pdfBase64` instead of `documentText`
- Use Gemini 2.5 Pro's multimodal capabilities to read the PDF directly
- Pass PDF as `image_url` with data URL format (same pattern as `extract-po-pdf`)
- Update the AI prompt to focus on SQF code extraction
- Use tool calling to extract structured SQF code data
- Save extracted codes to the `sqf_codes` table
- Update the edition record with parsing status and count

**New Request Format to AI:**
```json
{
  "model": "google/gemini-2.5-pro",
  "messages": [{
    "role": "user",
    "content": [
      { "type": "text", "text": "Extract all SQF codes..." },
      { "type": "image_url", "image_url": { "url": "data:application/pdf;base64,..." }}
    ]
  }],
  "tools": [{ "function": { "name": "extract_sqf_codes", ... }}]
}
```

---

### Step 3: Update Edition Record After Parsing
**File:** `supabase/functions/parse-sqf-document/index.ts`

After extracting codes:
1. Insert each SQF code into `sqf_codes` table
2. Update `sqf_editions` record with:
   - `parsing_status`: 'completed' or 'failed'
   - `codes_extracted`: count of codes found
   - `sections_found`: count of sections/modules

---

## Technical Details

### Base64 Conversion Helper
```typescript
const readFileAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:application/pdf;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
```

### SQF Code Extraction Schema
The AI will extract codes with this structure:
- `code_number`: e.g., "2.4.1", "11.2.1"
- `title`: Code title
- `category`: Module/section (e.g., "Food Safety Fundamentals")
- `requirement_text`: Full requirement text
- `is_mandatory`: Whether the code is mandatory
- `guidance_notes`: Additional guidance if available

### Supabase Client in Edge Function
The edge function will use Supabase client to save data:
```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/sqf/SQFEditionUploadDialog.tsx` | Convert PDF to Base64, update API call |
| `supabase/functions/parse-sqf-document/index.ts` | Complete rewrite to use multimodal AI and save extracted codes |

---

## Expected Outcome

After implementation:
1. User uploads SQF Code PDF
2. PDF is converted to Base64 on the client
3. Edge function sends PDF to Gemini 2.5 Pro for multimodal analysis
4. AI extracts all SQF codes with their requirements
5. Codes are saved to `sqf_codes` table
6. Edition record is updated with `codes_extracted` count
7. User sees "X codes extracted" in the Editions list

---

## Verification Steps

1. Upload an SQF Code Edition 9 PDF
2. Check that parsing completes without errors
3. Verify `codes_extracted` shows > 0 in the Editions tab
4. Navigate to "SQF Codes" tab to see extracted codes
5. Confirm each code has proper structure (code number, title, requirement text)
