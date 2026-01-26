import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    console.log("Starting SQF code extraction for edition:", edition_id);

    const systemPrompt = `You are an expert in SQF (Safe Quality Food) certification standards. 
Your task is to extract ALL SQF code requirements from the provided PDF document.

For each SQF code, extract:
- code_number: The code number (e.g., "2.1.1", "11.2.1.1")
- title: The code title/heading
- category: The module or section name (e.g., "Food Safety Fundamentals", "System Elements")
- requirement_text: The full requirement text
- is_mandatory: Whether this is a mandatory requirement (look for "shall" vs "should")
- guidance_notes: Any guidance or notes if available

IMPORTANT: 
- Extract EVERY code from the document, not just a sample
- Include all sub-codes (e.g., 2.1.1.1, 2.1.1.2, etc.)
- Preserve the exact code numbering from the document
- The requirement_text should be the complete requirement, not summarized`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
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
                text: "Extract ALL SQF codes and requirements from this SQF Code document. Return every code with its full details." 
              },
              { 
                type: "image_url", 
                image_url: { 
                  url: `data:application/pdf;base64,${pdfBase64}` 
                } 
              }
            ]
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_sqf_codes",
              description: "Extract all SQF codes from the document",
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
                          description: "The SQF code number (e.g., '2.1.1', '11.2.1.1')" 
                        },
                        title: { 
                          type: "string", 
                          description: "The code title or heading" 
                        },
                        category: { 
                          type: "string", 
                          description: "The module or section name" 
                        },
                        requirement_text: { 
                          type: "string", 
                          description: "The full requirement text" 
                        },
                        is_mandatory: { 
                          type: "boolean", 
                          description: "True if mandatory (uses 'shall'), false if recommended (uses 'should')" 
                        },
                        guidance_notes: { 
                          type: "string", 
                          description: "Any guidance notes or additional information" 
                        },
                      },
                      required: ["code_number", "title", "requirement_text"],
                    },
                    description: "Array of all SQF codes extracted from the document",
                  },
                  sections_found: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of main sections/modules found in the document",
                  },
                  edition_info: {
                    type: "object",
                    properties: {
                      edition_number: { type: "string" },
                      effective_date: { type: "string" },
                      title: { type: "string" },
                    },
                    description: "Information about the SQF edition",
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
      console.error("AI gateway error:", response.status, errorText);
      
      // Update edition with failed status
      await supabase
        .from("sqf_editions")
        .update({ parsing_status: "failed" })
        .eq("id", edition_id);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "API credits exhausted. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("Failed to process document with AI");
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall || toolCall.function.name !== "extract_sqf_codes") {
      console.error("Unexpected AI response:", JSON.stringify(aiResponse));
      await supabase
        .from("sqf_editions")
        .update({ parsing_status: "failed" })
        .eq("id", edition_id);
      throw new Error("Unexpected AI response format");
    }

    const extractedData = JSON.parse(toolCall.function.arguments);
    const codes = extractedData.codes || [];
    const sectionsFound = extractedData.sections_found || [];

    console.log(`Extracted ${codes.length} SQF codes from document`);

    // Insert extracted codes into sqf_codes table
    if (codes.length > 0) {
      const codesToInsert = codes.map((code: any) => ({
        edition_id,
        code_number: code.code_number,
        title: code.title || "",
        category: code.category || null,
        requirement_text: code.requirement_text || "",
        is_mandatory: code.is_mandatory ?? true,
        guidance_notes: code.guidance_notes || null,
      }));

      const { error: insertError } = await supabase
        .from("sqf_codes")
        .insert(codesToInsert);

      if (insertError) {
        console.error("Error inserting codes:", insertError);
        // Continue anyway, update edition status
      }
    }

    // Update edition with parsing results
    const { error: updateError } = await supabase
      .from("sqf_editions")
      .update({
        parsing_status: "completed",
        codes_extracted: codes.length,
        sections_found: sectionsFound.length,
      })
      .eq("id", edition_id);

    if (updateError) {
      console.error("Error updating edition:", updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        codes_extracted: codes.length,
        sections_found: sectionsFound.length,
        edition_info: extractedData.edition_info,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error parsing SQF document:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
