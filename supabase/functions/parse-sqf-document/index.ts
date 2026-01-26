import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Define module ranges to extract in separate passes
const MODULE_PASSES = [
  { name: "Part A - Food Safety Fundamentals", modules: "Module 2 (System Elements)" },
  { name: "Part B - Food Safety Plans", modules: "Modules 3, 4, 5, 6, 7, 8, 9" },
  { name: "Part C - Good Manufacturing Practices", modules: "Modules 10, 11, 12, 13, 14, 15" },
];

interface ExtractedCode {
  code_number: string;
  title: string;
  category?: string;
  requirement_text: string;
  is_mandatory?: boolean;
  guidance_notes?: string;
}

async function extractModuleCodes(
  pdfBase64: string,
  moduleDescription: string,
  apiKey: string
): Promise<{ codes: ExtractedCode[]; sections: string[] }> {
  const systemPrompt = `You are an expert in SQF (Safe Quality Food) certification standards.
Your task is to extract SQF code requirements from the provided PDF document.

FOCUS ONLY ON: ${moduleDescription}

For each SQF code, extract:
- code_number: The code number (e.g., "2.1.1", "11.2.1.1")
- title: The code title/heading
- category: The module or section name
- requirement_text: The full requirement text
- is_mandatory: Whether this is a mandatory requirement (look for "shall" vs "should")
- guidance_notes: Any guidance or notes if available

IMPORTANT:
- Extract EVERY code from the specified modules
- Include all sub-codes (e.g., 11.2.1.1, 11.2.1.2, etc.)
- Preserve the exact code numbering from the document
- The requirement_text should be the complete requirement, not summarized
- Skip any modules NOT listed in the focus area above`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extract ALL SQF codes from ${moduleDescription}. Return every code with its full details. Do NOT extract codes from other modules.`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:application/pdf;base64,${pdfBase64}`,
              },
            },
          ],
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_sqf_codes",
            description: "Extract all SQF codes from the specified modules",
            parameters: {
              type: "object",
              properties: {
                codes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      code_number: {
                        type: "string",
                        description: "The SQF code number (e.g., '2.1.1', '11.2.1.1')",
                      },
                      title: {
                        type: "string",
                        description: "The code title or heading",
                      },
                      category: {
                        type: "string",
                        description: "The module or section name",
                      },
                      requirement_text: {
                        type: "string",
                        description: "The full requirement text",
                      },
                      is_mandatory: {
                        type: "boolean",
                        description: "True if mandatory (uses 'shall'), false if recommended (uses 'should')",
                      },
                      guidance_notes: {
                        type: "string",
                        description: "Any guidance notes or additional information",
                      },
                    },
                    required: ["code_number", "title", "requirement_text"],
                  },
                  description: "Array of all SQF codes extracted from the specified modules",
                },
                sections_found: {
                  type: "array",
                  items: { type: "string" },
                  description: "List of sections/modules found in this extraction pass",
                },
              },
              required: ["codes"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "extract_sqf_codes" } },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`AI gateway error for ${moduleDescription}:`, response.status, errorText);
    throw new Error(`Failed to extract ${moduleDescription}: ${response.status}`);
  }

  const aiResponse = await response.json();
  const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];

  if (!toolCall || toolCall.function.name !== "extract_sqf_codes") {
    console.error("Unexpected AI response:", JSON.stringify(aiResponse));
    return { codes: [], sections: [] };
  }

  const extractedData = JSON.parse(toolCall.function.arguments);
  return {
    codes: extractedData.codes || [],
    sections: extractedData.sections_found || [],
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfBase64, edition_id } = await req.json();

    if (!pdfBase64) {
      return new Response(
        JSON.stringify({ error: "PDF Base64 data is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!edition_id) {
      return new Response(
        JSON.stringify({ error: "Edition ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update edition to parsing status
    await supabase
      .from("sqf_editions")
      .update({ parsing_status: "parsing" })
      .eq("id", edition_id);

    console.log("Starting multi-pass SQF code extraction for edition:", edition_id);

    let allCodes: ExtractedCode[] = [];
    let allSections: string[] = [];
    let passResults: { name: string; count: number }[] = [];

    // Process each module group in separate passes
    for (const pass of MODULE_PASSES) {
      console.log(`Starting extraction pass: ${pass.name} (${pass.modules})`);
      
      try {
        const result = await extractModuleCodes(pdfBase64, pass.modules, LOVABLE_API_KEY);
        
        console.log(`Pass "${pass.name}" extracted ${result.codes.length} codes`);
        passResults.push({ name: pass.name, count: result.codes.length });
        
        allCodes = [...allCodes, ...result.codes];
        allSections = [...allSections, ...result.sections];
      } catch (passError) {
        console.error(`Error in pass "${pass.name}":`, passError);
        // Continue with other passes even if one fails
      }
    }

    console.log(`Total extracted: ${allCodes.length} SQF codes from ${MODULE_PASSES.length} passes`);

    // Deduplicate codes by code_number (in case of overlap)
    const codeMap = new Map<string, ExtractedCode>();
    for (const code of allCodes) {
      if (!codeMap.has(code.code_number)) {
        codeMap.set(code.code_number, code);
      }
    }
    const uniqueCodes = Array.from(codeMap.values());
    console.log(`After deduplication: ${uniqueCodes.length} unique codes`);

    // Insert extracted codes into sqf_codes table
    if (uniqueCodes.length > 0) {
      const codesToInsert = uniqueCodes.map((code) => ({
        edition_id,
        code_number: code.code_number,
        title: code.title || "",
        category: code.category || null,
        requirement_text: code.requirement_text || "",
        is_mandatory: code.is_mandatory ?? true,
        guidance_notes: code.guidance_notes || null,
      }));

      // Insert in batches of 100 to avoid payload limits
      const batchSize = 100;
      for (let i = 0; i < codesToInsert.length; i += batchSize) {
        const batch = codesToInsert.slice(i, i + batchSize);
        const { error: insertError } = await supabase
          .from("sqf_codes")
          .insert(batch);

        if (insertError) {
          console.error(`Error inserting batch ${i / batchSize + 1}:`, insertError);
        }
      }
    }

    // Get unique sections
    const uniqueSections = [...new Set(allSections)];

    // Update edition with parsing results
    const { error: updateError } = await supabase
      .from("sqf_editions")
      .update({
        parsing_status: "completed",
        codes_extracted: uniqueCodes.length,
        sections_found: uniqueSections.length,
      })
      .eq("id", edition_id);

    if (updateError) {
      console.error("Error updating edition:", updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        codes_extracted: uniqueCodes.length,
        sections_found: uniqueSections.length,
        pass_results: passResults,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error parsing SQF document:", error);
    
    // Try to update edition status to failed
    try {
      const { edition_id } = await (await fetch(error as any)).json().catch(() => ({}));
      if (edition_id) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await supabase
          .from("sqf_editions")
          .update({ parsing_status: "failed" })
          .eq("id", edition_id);
      }
    } catch {}
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
