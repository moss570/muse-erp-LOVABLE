import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, Check, Database } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface USDAFood {
  fdcId: number;
  description: string;
  dataType: string;
  brandOwner: string | null;
  ingredients: string | null;
}

export interface USDANutrition {
  calories: number | null;
  protein_g: number | null;
  total_fat_g: number | null;
  saturated_fat_g: number | null;
  trans_fat_g: number | null;
  monounsaturated_fat_g: number | null;
  polyunsaturated_fat_g: number | null;
  cholesterol_mg: number | null;
  sodium_mg: number | null;
  total_carbohydrate_g: number | null;
  dietary_fiber_g: number | null;
  total_sugars_g: number | null;
  added_sugars_g: number | null;
  vitamin_d_mcg: number | null;
  calcium_mg: number | null;
  iron_mg: number | null;
  potassium_mg: number | null;
  vitamin_a_mcg: number | null;
  vitamin_c_mg: number | null;
}

interface USDASearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (nutrition: USDANutrition, description: string) => void;
  materialName?: string;
}

export function USDASearchDialog({ open, onOpenChange, onSelect, materialName }: USDASearchDialogProps) {
  const [query, setQuery] = useState(materialName || '');
  const [results, setResults] = useState<USDAFood[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState<number | null>(null);
  const [totalHits, setTotalHits] = useState(0);

  const handleSearch = async () => {
    if (query.trim().length < 2) {
      toast.error('Please enter at least 2 characters');
      return;
    }

    setIsSearching(true);
    setResults([]);

    try {
      const { data, error } = await supabase.functions.invoke('usda-food-search', {
        body: { query: query.trim() },
      });

      if (error) throw error;

      setResults(data.foods || []);
      setTotalHits(data.totalHits || 0);

      if (data.foods?.length === 0) {
        toast.info('No results found. Try a different search term.');
      }
    } catch (error) {
      console.error('USDA search error:', error);
      toast.error('Failed to search USDA database');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectFood = async (food: USDAFood) => {
    setIsLoadingDetails(food.fdcId);

    try {
      const { data, error } = await supabase.functions.invoke('usda-food-search?action=details', {
        body: { fdcId: food.fdcId },
      });

      if (error) throw error;

      onSelect(data.nutrition, data.description);
      toast.success(`Imported nutrition data from: ${food.description}`);
      onOpenChange(false);
    } catch (error) {
      console.error('USDA details error:', error);
      toast.error('Failed to fetch nutrition details');
    } finally {
      setIsLoadingDetails(null);
    }
  };

  const getDataTypeBadgeVariant = (dataType: string) => {
    switch (dataType) {
      case 'Foundation':
        return 'default';
      case 'SR Legacy':
        return 'secondary';
      case 'Branded':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            USDA FoodData Central Search
          </DialogTitle>
          <DialogDescription>
            Search the USDA database for nutritional information (values per 100g)
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            placeholder="Search for ingredient (e.g., 'heavy cream', 'sugar')"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            autoFocus
          />
          <Button onClick={handleSearch} disabled={isSearching}>
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        {totalHits > 0 && (
          <p className="text-sm text-muted-foreground">
            Found {totalHits.toLocaleString()} results
          </p>
        )}

        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-2">
            {results.map((food) => (
              <div
                key={food.fdcId}
                className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{food.description}</span>
                      <Badge variant={getDataTypeBadgeVariant(food.dataType)} className="text-xs">
                        {food.dataType}
                      </Badge>
                    </div>
                    {food.brandOwner && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Brand: {food.brandOwner}
                      </p>
                    )}
                    {food.ingredients && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {food.ingredients}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSelectFood(food)}
                    disabled={isLoadingDetails === food.fdcId}
                  >
                    {isLoadingDetails === food.fdcId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Use
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}

            {results.length === 0 && !isSearching && (
              <div className="text-center py-8 text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Search for an ingredient to find nutrition data</p>
                <p className="text-xs mt-1">
                  Data from USDA Foundation Foods and SR Legacy databases
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
