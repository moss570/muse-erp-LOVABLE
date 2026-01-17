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
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const { imageBase64, mimeType } = await req.json();

    if (!imageBase64) {
      throw new Error('No image data provided');
    }

    console.log('Processing nutrition label image, mime type:', mimeType);

    const prompt = `You are a nutrition facts label extraction expert. Analyze this image of a nutrition facts label and extract all nutritional information.

IMPORTANT: 
- Extract values EXACTLY as shown on the label
- Convert serving size to grams if possible (look for "g" or "grams")
- For % Daily Values, extract the actual nutrient amount, not the percentage
- If a value is not visible or not listed, return null for that field
- Be precise with decimal values

Return a JSON object with these fields (use null if not found):
{
  "serving_size_g": number or null (serving size in grams),
  "serving_size_description": string or null (e.g., "1 cup (240g)"),
  "calories": number or null,
  "total_fat_g": number or null,
  "saturated_fat_g": number or null,
  "trans_fat_g": number or null,
  "polyunsaturated_fat_g": number or null,
  "monounsaturated_fat_g": number or null,
  "cholesterol_mg": number or null,
  "sodium_mg": number or null,
  "total_carbohydrate_g": number or null,
  "dietary_fiber_g": number or null,
  "total_sugars_g": number or null,
  "added_sugars_g": number or null,
  "protein_g": number or null,
  "vitamin_d_mcg": number or null,
  "calcium_mg": number or null,
  "iron_mg": number or null,
  "potassium_mg": number or null,
  "vitamin_a_mcg": number or null,
  "vitamin_c_mg": number or null,
  "confidence": number (0-100, your confidence in the extraction accuracy)
}

ONLY respond with valid JSON, no markdown or explanation.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
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
        max_tokens: 1000,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenAI response received');

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    // Parse the JSON response
    let nutritionData: NutritionData;
    try {
      // Remove any markdown code blocks if present
      const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
      nutritionData = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      throw new Error('Failed to parse nutrition data from image');
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
