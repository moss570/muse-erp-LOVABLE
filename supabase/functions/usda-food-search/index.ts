import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const USDA_API_BASE = 'https://api.nal.usda.gov/fdc/v1';

interface USDASearchRequest {
  query: string;
  dataType?: string[];
  pageSize?: number;
  pageNumber?: number;
}

interface USDAFoodDetailsRequest {
  fdcId: number;
  format?: 'abridged' | 'full';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('USDA_API_KEY');
    if (!apiKey) {
      console.error('USDA_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'USDA API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'search';

    if (action === 'search') {
      const body: USDASearchRequest = await req.json();
      const { query, dataType = ['Foundation', 'SR Legacy'], pageSize = 25, pageNumber = 1 } = body;

      if (!query || query.trim().length < 2) {
        return new Response(
          JSON.stringify({ error: 'Search query must be at least 2 characters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Searching USDA for: "${query}"`);

      const searchResponse = await fetch(`${USDA_API_BASE}/foods/search?api_key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          dataType,
          pageSize,
          pageNumber,
          sortBy: 'dataType.keyword',
          sortOrder: 'asc',
        }),
      });

      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        console.error('USDA search error:', errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to search USDA database', details: errorText }),
          { status: searchResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const searchData = await searchResponse.json();
      console.log(`Found ${searchData.totalHits} results`);

      // Transform results to a simpler format
      const foods = (searchData.foods || []).map((food: any) => ({
        fdcId: food.fdcId,
        description: food.description,
        dataType: food.dataType,
        brandOwner: food.brandOwner || null,
        ingredients: food.ingredients || null,
        servingSize: food.servingSize || null,
        servingSizeUnit: food.servingSizeUnit || null,
      }));

      return new Response(
        JSON.stringify({
          foods,
          totalHits: searchData.totalHits,
          currentPage: searchData.currentPage,
          totalPages: searchData.totalPages,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'details') {
      const body: USDAFoodDetailsRequest = await req.json();
      const { fdcId, format = 'full' } = body;

      if (!fdcId) {
        return new Response(
          JSON.stringify({ error: 'fdcId is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Fetching USDA food details for fdcId: ${fdcId}`);

      const detailsResponse = await fetch(
        `${USDA_API_BASE}/food/${fdcId}?api_key=${apiKey}&format=${format}`,
        { method: 'GET' }
      );

      if (!detailsResponse.ok) {
        const errorText = await detailsResponse.text();
        console.error('USDA details error:', errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch food details', details: errorText }),
          { status: detailsResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const foodData = await detailsResponse.json();

      // Map USDA nutrients to our schema (per 100g)
      const nutrientMap: Record<number, string> = {
        1008: 'calories',           // Energy (kcal)
        1003: 'protein_g',          // Protein
        1004: 'total_fat_g',        // Total lipid (fat)
        1258: 'saturated_fat_g',    // Fatty acids, total saturated
        1257: 'trans_fat_g',        // Fatty acids, total trans
        1292: 'monounsaturated_fat_g', // Fatty acids, total monounsaturated
        1293: 'polyunsaturated_fat_g', // Fatty acids, total polyunsaturated
        1253: 'cholesterol_mg',     // Cholesterol
        1093: 'sodium_mg',          // Sodium
        1005: 'total_carbohydrate_g', // Carbohydrate, by difference
        1079: 'dietary_fiber_g',    // Fiber, total dietary
        2000: 'total_sugars_g',     // Sugars, total
        1235: 'added_sugars_g',     // Sugars, added
        1114: 'vitamin_d_mcg',      // Vitamin D (D2 + D3)
        1087: 'calcium_mg',         // Calcium
        1089: 'iron_mg',            // Iron
        1092: 'potassium_mg',       // Potassium
        1106: 'vitamin_a_mcg',      // Vitamin A, RAE
        1162: 'vitamin_c_mg',       // Vitamin C
      };

      const nutrition: Record<string, number | null> = {
        calories: null,
        protein_g: null,
        total_fat_g: null,
        saturated_fat_g: null,
        trans_fat_g: null,
        monounsaturated_fat_g: null,
        polyunsaturated_fat_g: null,
        cholesterol_mg: null,
        sodium_mg: null,
        total_carbohydrate_g: null,
        dietary_fiber_g: null,
        total_sugars_g: null,
        added_sugars_g: null,
        vitamin_d_mcg: null,
        calcium_mg: null,
        iron_mg: null,
        potassium_mg: null,
        vitamin_a_mcg: null,
        vitamin_c_mg: null,
      };

      // Extract nutrients from the response
      const nutrients = foodData.foodNutrients || [];
      for (const nutrient of nutrients) {
        const nutrientId = nutrient.nutrient?.id || nutrient.nutrientId;
        const amount = nutrient.amount ?? nutrient.value ?? null;
        
        if (nutrientId && nutrientMap[nutrientId] && amount !== null) {
          nutrition[nutrientMap[nutrientId]] = Math.round(amount * 1000) / 1000;
        }
      }

      console.log(`Extracted nutrition data for: ${foodData.description}`);

      return new Response(
        JSON.stringify({
          fdcId: foodData.fdcId,
          description: foodData.description,
          dataType: foodData.dataType,
          brandOwner: foodData.brandOwner || null,
          ingredients: foodData.ingredients || null,
          servingSize: foodData.servingSize || null,
          servingSizeUnit: foodData.servingSizeUnit || null,
          nutrition,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use "search" or "details".' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('USDA API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
