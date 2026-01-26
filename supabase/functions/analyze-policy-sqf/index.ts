import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Extract text from Word document (.docx)
async function extractTextFromDocx(base64Data: string): Promise<string> {
  try {
    // Decode base64 to binary
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Load the docx as a zip file
    const zip = await JSZip.loadAsync(bytes);
    
    // Get the document.xml file which contains the main content
    const documentXml = await zip.file("word/document.xml")?.async("text");
    
    if (!documentXml) {
      throw new Error("Could not find document.xml in the Word file");
    }

    // Extract text content from XML by removing tags
    // Word uses <w:t> tags for text content
    const textMatches = documentXml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
    const extractedText = textMatches
      .map(match => {
        const textContent = match.replace(/<w:t[^>]*>/, "").replace(/<\/w:t>/, "");
        return textContent;
      })
      .join(" ");

    // Also extract paragraph breaks for better formatting
    const formattedText = documentXml
      .replace(/<w:p[^>]*>/g, "\n")
      .replace(/<w:t[^>]*>/g, "")
      .replace(/<\/w:t>/g, "")
      .replace(/<[^>]+>/g, "")
      .replace(/\n\s*\n/g, "\n\n")
      .trim();

    return formattedText || extractedText;
  } catch (error) {
    console.error("Error extracting text from docx:", error);
    throw new Error("Failed to extract text from Word document");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileBase64, fileName, mimeType, policyId, editionId } = await req.json();

    if (!fileBase64) {
      return new Response(
        JSON.stringify({ error: "File Base64 data is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!editionId) {
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

    // Fetch all SQF codes for the edition
    const { data: sqfCodes, error: codesError } = await supabase
      .from("sqf_codes")
      .select("id, code_number, title, requirement_text, category, is_mandatory")
      .eq("edition_id", editionId)
      .order("code_number", { ascending: true });

    if (codesError) {
      console.error("Error fetching SQF codes:", codesError);
      throw new Error("Failed to fetch SQF codes");
    }

    if (!sqfCodes || sqfCodes.length === 0) {
      return new Response(
        JSON.stringify({ error: "No SQF codes found for this edition. Please upload an SQF edition first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Analyzing policy against ${sqfCodes.length} SQF codes`);

    // Create a summary of SQF codes for the AI prompt
    const sqfCodesSummary = sqfCodes.map(c => 
      `${c.code_number}: ${c.title} - ${c.requirement_text?.substring(0, 200) || ""}...`
    ).join("\n");

    const systemPrompt = `You are an expert food safety compliance analyst specializing in SQF (Safe Quality Food) certification.

Your task is to analyze a policy document and identify which SQF codes it addresses or satisfies.

Available SQF Codes:
${sqfCodesSummary}

For each SQF code that the policy document addresses, determine:
1. The code number it maps to
2. Whether the policy fully satisfies (compliant), partially satisfies (partial), or identifies a gap (gap) in the requirement
3. A brief explanation of how the policy addresses or doesn't address the requirement

Only include codes that the policy document clearly relates to. Be thorough but accurate.`;

    // Determine if we're dealing with a Word document or PDF
    const isWordDocument = mimeType.includes("word") || 
                           mimeType.includes("openxmlformats-officedocument") ||
                           fileName.endsWith(".docx") ||
                           fileName.endsWith(".doc");
    const isPdf = mimeType.includes("pdf") || fileName.endsWith(".pdf");

    let messages: any[];

    if (isWordDocument) {
      // Extract text from Word document and send as text
      console.log("Extracting text from Word document...");
      const extractedText = await extractTextFromDocx(fileBase64);
      console.log(`Extracted ${extractedText.length} characters from Word document`);

      messages = [
        { role: "system", content: systemPrompt },
        { 
          role: "user", 
          content: `Analyze this policy document "${fileName}" and identify all SQF codes it addresses. Return the mapping results.

POLICY DOCUMENT CONTENT:
---
${extractedText}
---` 
        },
      ];
    } else if (isPdf) {
      // Use multimodal for PDF
      const dataUrl = `data:application/pdf;base64,${fileBase64}`;
      messages = [
        { role: "system", content: systemPrompt },
        { 
          role: "user", 
          content: [
            { 
              type: "text", 
              text: `Analyze this policy document "${fileName}" and identify all SQF codes it addresses. Return the mapping results.` 
            },
            { 
              type: "image_url", 
              image_url: { url: dataUrl } 
            }
          ]
        },
      ];
    } else {
      return new Response(
        JSON.stringify({ error: "Unsupported file type. Please upload a PDF or Word document (.docx)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages,
        tools: [
          {
            type: "function",
            function: {
              name: "map_policy_to_sqf_codes",
              description: "Map the analyzed policy to relevant SQF codes",
              parameters: {
                type: "object",
                properties: {
                  policy_summary: {
                    type: "string",
                    description: "A brief summary of what the policy document covers",
                  },
                  mappings: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        code_number: { 
                          type: "string", 
                          description: "The SQF code number (e.g., '2.1.1', '11.2.1.1')" 
                        },
                        compliance_status: { 
                          type: "string", 
                          enum: ["compliant", "partial", "gap"],
                          description: "How well the policy satisfies this requirement" 
                        },
                        explanation: { 
                          type: "string", 
                          description: "Brief explanation of how the policy addresses this code" 
                        },
                        gap_description: { 
                          type: "string", 
                          description: "If partial or gap, what is missing" 
                        },
                      },
                      required: ["code_number", "compliance_status", "explanation"],
                    },
                    description: "Array of SQF codes this policy addresses",
                  },
                  suggested_category: {
                    type: "string",
                    description: "Suggested policy category based on content",
                  },
                },
                required: ["policy_summary", "mappings"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "map_policy_to_sqf_codes" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
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
      throw new Error("Failed to analyze document with AI");
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall || toolCall.function.name !== "map_policy_to_sqf_codes") {
      console.error("Unexpected AI response:", JSON.stringify(aiResponse));
      throw new Error("Unexpected AI response format");
    }

    const analysisResult = JSON.parse(toolCall.function.arguments);
    const mappings = analysisResult.mappings || [];

    console.log(`AI identified ${mappings.length} SQF code mappings for the policy`);

    // Match code numbers to code IDs
    const enrichedMappings = mappings.map((mapping: any) => {
      const matchedCode = sqfCodes.find(c => c.code_number === mapping.code_number);
      return {
        ...mapping,
        sqf_code_id: matchedCode?.id || null,
        sqf_code_title: matchedCode?.title || null,
        is_mandatory: matchedCode?.is_mandatory || false,
      };
    }).filter((m: any) => m.sqf_code_id !== null);

    return new Response(
      JSON.stringify({
        success: true,
        policy_summary: analysisResult.policy_summary,
        suggested_category: analysisResult.suggested_category,
        mappings: enrichedMappings,
        total_mappings: enrichedMappings.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error analyzing policy:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
