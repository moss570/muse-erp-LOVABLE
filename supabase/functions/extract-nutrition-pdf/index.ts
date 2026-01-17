import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NutritionData {
  serving_size_g: number | null;
  serving_size_description: string | null;
  calories: number | null;
  total_fat_g: number | null;
  saturated_fat_g: number | null;
  trans_fat_g: number | null;
  polyunsaturated_fat_g: number | null;
  monounsaturated_fat_g: number | null;
  cholesterol_mg: number | null;
  sodium_mg: number | null;
  total_carbohydrate_g: number | null;
  dietary_fiber_g: number | null;
  total_sugars_g: number | null;
  added_sugars_g: number | null;
  protein_g: number | null;
  vitamin_d_mcg: number | null;
  calcium_mg: number | null;
  iron_mg: number | null;
  potassium_mg: number | null;
  vitamin_a_mcg: number | null;
  vitamin_c_mg: number | null;
  confidence: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { imageBase64, mimeType } = await req.json();

    if (!imageBase64) {
      throw new Error('No image data provided');
    }

    // Accept image types (PDFs are now converted to images on the client)
    if (!mimeType || typeof mimeType !== 'string' || !mimeType.startsWith('image/')) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Unsupported file type. Please upload an image (PNG/JPG) or PDF.',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Processing nutrition label image, mime type:', mimeType);

    const prompt = `You are a nutrition facts label extraction expert. Analyze this image of a nutrition facts label and extract all nutritional information.

IMPORTANT:
- Extract values EXACTLY as shown on the label
- Convert serving size to grams if possible (look for "g" or "grams")
- For % Daily Values, extract the actual nutrient amount, not the percentage
- If a value is not visible or not listed, return null for that field
- Be precise with decimal values

Return ONLY valid JSON (no code fences, no commentary) for this schema:
{
  "serving_size_g": number | null,
  "serving_size_description": string | null,
  "calories": number | null,
  "total_fat_g": number | null,
  "saturated_fat_g": number | null,
  "trans_fat_g": number | null,
  "polyunsaturated_fat_g": number | null,
  "monounsaturated_fat_g": number | null,
  "cholesterol_mg": number | null,
  "sodium_mg": number | null,
  "total_carbohydrate_g": number | null,
  "dietary_fiber_g": number | null,
  "total_sugars_g": number | null,
  "added_sugars_g": number | null,
  "protein_g": number | null,
  "vitamin_d_mcg": number | null,
  "calcium_mg": number | null,
  "iron_mg": number | null,
  "potassium_mg": number | null,
  "vitamin_a_mcg": number | null,
  "vitamin_c_mg": number | null,
  "confidence": number
}`;


    // Use Lovable AI Gateway with gemini-2.5-pro for best multimodal performance
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 2000,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Rate limit exceeded. Please try again in a moment.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'AI credits exhausted. Please add credits to your workspace.' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Lovable AI response received');

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('Raw AI response content:', content.substring(0, 500));

    // Parse the JSON response - handle various markdown formats
    let nutritionData: NutritionData;
    try {
      // Remove markdown code blocks with various patterns
      let cleanedContent = content
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();
      
      // Try to extract JSON object if there's surrounding text
      const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedContent = jsonMatch[0];
      }
      
      nutritionData = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      console.error('Parse error:', parseError);
      throw new Error('Failed to parse nutrition data from image. Please try with a clearer image.');
    }

    console.log('Extracted nutrition data:', nutritionData);

    return new Response(JSON.stringify({ 
      success: true, 
      nutrition: nutritionData 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in extract-nutrition-pdf:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
