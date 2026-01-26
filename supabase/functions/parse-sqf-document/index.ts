import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentText, documentType = "policy" } = await req.json();

    if (!documentText) {
      return new Response(
        JSON.stringify({ error: "Document text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert in food safety standards, particularly SQF (Safe Quality Food) certification requirements. 
Your task is to analyze documents and extract relevant information for compliance tracking.

For policy documents, extract:
- Title and summary
- Key requirements and procedures
- Relevant SQF code references (e.g., 2.4.1, 11.2.1)
- HACCP considerations if applicable
- Training requirements
- Document control information (version, effective date, review date)

For SQF audit documents, extract:
- Audit findings and observations
- Non-conformances (major/minor)
- Corrective action requirements
- SQF code references for each finding
- Auditor recommendations

For HACCP plans, extract:
- Process steps
- Hazard identification (biological, chemical, physical, allergen)
- Critical control points
- Critical limits
- Monitoring procedures
- Corrective actions
- Verification activities

Provide structured output that can be used to populate database records.`;

    const userPrompt = `Analyze the following ${documentType} document and extract structured information:

---
${documentText.substring(0, 15000)}
---

Provide a JSON response with the extracted information.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_document_info",
              description: "Extract structured information from the document",
              parameters: {
                type: "object",
                properties: {
                  document_type: {
                    type: "string",
                    enum: ["policy", "sop", "haccp_plan", "audit_report", "training_material"],
                    description: "The type of document detected",
                  },
                  title: {
                    type: "string",
                    description: "Document title",
                  },
                  summary: {
                    type: "string",
                    description: "Brief summary of the document (2-3 sentences)",
                  },
                  sqf_codes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        code: { type: "string", description: "SQF code number (e.g., 2.4.1)" },
                        title: { type: "string", description: "Code title" },
                        relevance: { type: "string", enum: ["primary", "secondary", "reference"] },
                      },
                      required: ["code"],
                    },
                    description: "Relevant SQF code references",
                  },
                  haccp_elements: {
                    type: "object",
                    properties: {
                      has_ccp: { type: "boolean" },
                      hazard_types: {
                        type: "array",
                        items: { type: "string", enum: ["biological", "chemical", "physical", "allergen", "radiological"] },
                      },
                      process_steps: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            step_number: { type: "number" },
                            name: { type: "string" },
                            is_ccp: { type: "boolean" },
                          },
                        },
                      },
                    },
                    description: "HACCP-related elements if applicable",
                  },
                  training_requirements: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        topic: { type: "string" },
                        frequency: { type: "string" },
                        roles: { type: "array", items: { type: "string" } },
                      },
                    },
                    description: "Training requirements mentioned in the document",
                  },
                  audit_findings: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        finding_type: { type: "string", enum: ["major_nc", "minor_nc", "observation", "opportunity"] },
                        sqf_code: { type: "string" },
                        description: { type: "string" },
                        corrective_action: { type: "string" },
                      },
                    },
                    description: "Audit findings if this is an audit document",
                  },
                  key_requirements: {
                    type: "array",
                    items: { type: "string" },
                    description: "Key requirements or procedures from the document",
                  },
                  suggested_category: {
                    type: "string",
                    description: "Suggested policy category (e.g., Food Safety, Quality, Sanitation)",
                  },
                  confidence_score: {
                    type: "number",
                    description: "Confidence in the extraction (0-1)",
                  },
                },
                required: ["document_type", "title", "summary", "confidence_score"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_document_info" } },
      }),
    });

    if (!response.ok) {
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
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to process document with AI");
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall || toolCall.function.name !== "extract_document_info") {
      throw new Error("Unexpected AI response format");
    }

    const extractedInfo = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({
        success: true,
        data: extractedInfo,
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
