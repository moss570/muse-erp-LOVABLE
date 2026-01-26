import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParseRequest {
  edition_id: string;
  file_url: string;
}

interface ExtractedCode {
  code_number: string;
  title: string;
  requirement_text: string;
  section: string;
  sub_section: string;
  category: string;
  module: string;
  is_fundamental: boolean;
  is_mandatory: boolean;
  guidance_notes?: string;
  verification_methods?: string[];
  evidence_required?: string[];
  documentation_needed?: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { edition_id, file_url }: ParseRequest = await req.json();

    if (!edition_id || !file_url) {
      throw new Error('Missing required parameters: edition_id and file_url');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Lovable AI key
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log(`Starting SQF document parsing for edition: ${edition_id}`);

    // Update parsing status to "Parsing"
    await supabase
      .from('sqf_editions')
      .update({
        parsing_status: 'Parsing',
        parsing_started_at: new Date().toISOString(),
      })
      .eq('id', edition_id);

    // Fetch the document
    console.log(`Fetching document from: ${file_url}`);
    const fileResponse = await fetch(file_url);
    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch document: ${fileResponse.statusText}`);
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    const base64File = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));

    // AI Prompt for SQF extraction
    const prompt = `You are an expert food safety professional analyzing an SQF (Safe Quality Food) code requirements document.

Your task is to extract ALL SQF codes and their requirements from this document with extreme precision.

Extract the following information for EACH SQF code:

1. **Code Number**: The full SQF code number (e.g., "2.4.3.2", "11.2.4.1")
2. **Title**: The requirement title/heading
3. **Requirement Text**: The complete requirement description (exact wording from document)
4. **Section**: Main section number (e.g., "2", "11")
5. **Sub-section**: Sub-section number (e.g., "2.4", "11.2")
6. **Category**: Classify into one of these categories:
   - Food Safety Fundamentals
   - Good Manufacturing Practices
   - HACCP Food Safety Plans
   - SQF System
   - Specifications and Product Development
   - Contract and Brokering
   - Storage and Distribution
   - Product Inspection and Laboratory Analysis
7. **Module**: Which module this belongs to (e.g., "Module 2", "Module 11")
8. **Is Fundamental**: Is this marked as a "FUNDAMENTAL" requirement? (true/false)
9. **Is Mandatory**: Is this a mandatory requirement? (true/false - most are true)
10. **Guidance Notes**: Any guidance, notes, or clarifications provided
11. **Verification Methods**: How should this be verified?
12. **Evidence Required**: What evidence is needed to demonstrate compliance?
13. **Documentation Needed**: What documents are needed?

IMPORTANT EXTRACTION RULES:
- Extract EVERY SINGLE CODE - do not skip any
- Maintain exact wording from the document for requirement text
- Fundamental requirements are usually marked with special formatting (often in Module 2)
- Be extremely thorough - missing codes could impact compliance

Return ONLY valid JSON with this exact schema:
{
  "edition_info": {
    "edition_name": "Edition X.X",
    "edition_number": X.X,
    "release_date": "YYYY-MM-DD",
    "total_sections": number
  },
  "codes": [
    {
      "code_number": "string",
      "title": "string",
      "requirement_text": "string",
      "section": "string",
      "sub_section": "string",
      "category": "string",
      "module": "string",
      "is_fundamental": boolean,
      "is_mandatory": boolean,
      "guidance_notes": "string or null",
      "verification_methods": ["string"] or null,
      "evidence_required": ["string"] or null,
      "documentation_needed": ["string"] or null
    }
  ]
}`;

    console.log('Calling AI to extract SQF codes...');

    // Call Lovable AI for extraction
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${base64File}`,
                },
              },
            ],
          },
        ],
        max_tokens: 100000,
        temperature: 0,
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      throw new Error(`AI API error: ${aiResponse.statusText} - ${errorText}`);
    }

    const aiResult = await aiResponse.json();
    const extractedData = JSON.parse(aiResult.choices[0].message.content);

    console.log(`AI extracted ${extractedData.codes.length} SQF codes`);

    // Update edition with extraction results
    await supabase
      .from('sqf_editions')
      .update({
        edition_number: extractedData.edition_info.edition_number,
        total_codes_extracted: extractedData.codes.length,
        total_sections: extractedData.edition_info.total_sections || 0,
        parsing_status: 'Completed',
        parsing_completed_at: new Date().toISOString(),
      })
      .eq('id', edition_id);

    // Bulk insert SQF codes
    const codesToInsert = extractedData.codes.map((code: ExtractedCode) => ({
      sqf_edition_id: edition_id,
      code_number: code.code_number,
      full_code_reference: `${extractedData.edition_info.edition_name} - ${code.code_number}`,
      title: code.title,
      description: code.title, // Use title as description initially
      requirement_text: code.requirement_text,
      section: code.section,
      sub_section: code.sub_section,
      category: code.category,
      module: code.module,
      is_fundamental: code.is_fundamental,
      is_mandatory: code.is_mandatory,
      guidance_notes: code.guidance_notes || null,
      verification_methods: code.verification_methods || null,
      evidence_required: code.evidence_required || null,
      documentation_needed: code.documentation_needed || null,
    }));

    console.log(`Inserting ${codesToInsert.length} codes into database...`);

    // Insert codes in batches to avoid timeouts
    const batchSize = 100;
    for (let i = 0; i < codesToInsert.length; i += batchSize) {
      const batch = codesToInsert.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('sqf_codes')
        .insert(batch);

      if (insertError) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, insertError);
        throw insertError;
      }

      console.log(`Inserted batch ${i / batchSize + 1} of ${Math.ceil(codesToInsert.length / batchSize)}`);
    }

    console.log('SQF document parsing completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        edition_id,
        codes_extracted: extractedData.codes.length,
        sections_found: extractedData.edition_info.total_sections,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error parsing SQF document:', error);

    // Update edition with error
    if (req.method === 'POST') {
      const { edition_id } = await req.json();
      if (edition_id) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        await supabase
          .from('sqf_editions')
          .update({
            parsing_status: 'Failed',
            parsing_error: error.message,
          })
          .eq('id', edition_id);
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
