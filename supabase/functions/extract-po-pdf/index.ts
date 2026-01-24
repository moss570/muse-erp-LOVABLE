import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ExtractedLineItem {
  item_number: string;
  description: string | null;
  quantity: number;
  unit_price: number | null;
  unit_of_measure: string | null;
}

interface ExtractedPOData {
  customer_name: string | null;
  customer_address: string | null;
  customer_city: string | null;
  customer_state: string | null;
  customer_zip: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  po_number: string | null;
  po_date: string | null;
  requested_delivery_date: string | null;
  ship_to_name: string | null;
  ship_to_address: string | null;
  ship_to_city: string | null;
  ship_to_state: string | null;
  ship_to_zip: string | null;
  line_items: ExtractedLineItem[];
  notes: string | null;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  confidence: number;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("extract-po-pdf function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "AI service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { pdfBase64, mimeType = "application/pdf" } = await req.json();

    if (!pdfBase64) {
      return new Response(
        JSON.stringify({ success: false, error: "No PDF data provided" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Processing PDF, size:", pdfBase64.length, "bytes");

    const prompt = `You are a purchase order extraction expert. Analyze this customer purchase order PDF and extract all relevant information.

IMPORTANT:
- Extract values EXACTLY as shown on the document
- The customer is the company SENDING the purchase order (the buyer)
- Look for PO number, date, delivery date, and all line items
- Item numbers may be the customer's own codes OR variations of our product SKUs
- Extract all line items with their item numbers, descriptions, quantities, and prices
- If a value is not visible or not listed, return null for that field
- Be precise with quantities and prices

Return ONLY valid JSON (no code fences, no commentary) for this schema:
{
  "customer_name": string | null,
  "customer_address": string | null,
  "customer_city": string | null,
  "customer_state": string | null,
  "customer_zip": string | null,
  "customer_phone": string | null,
  "customer_email": string | null,
  "po_number": string | null,
  "po_date": string | null (in YYYY-MM-DD format if possible),
  "requested_delivery_date": string | null (in YYYY-MM-DD format if possible),
  "ship_to_name": string | null,
  "ship_to_address": string | null,
  "ship_to_city": string | null,
  "ship_to_state": string | null,
  "ship_to_zip": string | null,
  "line_items": [
    {
      "item_number": string (the product code/SKU from the PO - extract exactly as shown),
      "description": string | null,
      "quantity": number,
      "unit_price": number | null,
      "unit_of_measure": string | null (e.g., "EA", "CS", "LB", etc.)
    }
  ],
  "notes": string | null (any special instructions or notes),
  "subtotal": number | null,
  "tax": number | null,
  "total": number | null,
  "confidence": number (0-1 score of extraction confidence)
}`;

    // Use Lovable AI Gateway with gemini-2.5-pro for best multimodal performance
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt,
              },
              {
                // Gemini supports PDFs as an input modality; we pass it as a data: URL.
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${pdfBase64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 8192,
        temperature: 0,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: `AI service error: ${response.status}` }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const aiResponse = await response.json();
    console.log("AI response received");

    const content = aiResponse.choices?.[0]?.message?.content;
    if (!content) {
      console.error("No content in AI response:", aiResponse);
      return new Response(
        JSON.stringify({ success: false, error: "AI did not return extracted data" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Parse the JSON response - be resilient to code fences / surrounding text
    let extractedData: ExtractedPOData;
    try {
      let cleanedContent = String(content)
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();

      // Best effort: extract the first JSON object by brace matching
      const firstBrace = cleanedContent.indexOf("{");
      if (firstBrace !== -1) {
        let depth = 0;
        let endIndex = -1;
        for (let i = firstBrace; i < cleanedContent.length; i++) {
          const ch = cleanedContent[i];
          if (ch === "{") depth++;
          if (ch === "}") {
            depth--;
            if (depth === 0) {
              endIndex = i;
              break;
            }
          }
        }
        if (endIndex !== -1) {
          cleanedContent = cleanedContent.slice(firstBrace, endIndex + 1);
        }
      }

      extractedData = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      console.error("Parse error:", parseError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Failed to parse purchase order data. Please try with a clearer PDF." 
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Extracted PO data:", {
      customer: extractedData.customer_name,
      po_number: extractedData.po_number,
      items: extractedData.line_items?.length || 0,
      confidence: extractedData.confidence,
    });

    return new Response(
      JSON.stringify({ success: true, data: extractedData }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Error in extract-po-pdf:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
