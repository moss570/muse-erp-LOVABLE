import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useMaterialNutrition, MaterialNutritionInput } from '@/hooks/useMaterialNutrition';
import { useDailyValues, calculatePercentDV, NUTRIENT_TO_DV_CODE } from '@/hooks/useDailyValues';
import { Loader2, Save, ChevronDown, ChevronUp, Info, CheckCircle2, Database, FileImage } from 'lucide-react';
import { cn } from '@/lib/utils';
import { USDASearchDialog, USDANutrition } from './USDASearchDialog';
import { ImageImportDialog } from './ImageImportDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MaterialNutritionTabProps {
  materialId: string | undefined;
  isNewMaterial?: boolean;
}

type NutritionFormData = Partial<Omit<MaterialNutritionInput, 'material_id'>>;

const DATA_SOURCES = [
  { value: 'manual', label: 'Manual Entry' },
  { value: 'pdf_extracted', label: 'Extracted from PDF' },
  { value: 'excel_import', label: 'Excel Import' },
  { value: 'usda_fdc', label: 'USDA FoodData Central' },
  { value: 'lab_analysis', label: 'Lab Analysis' },
];

export function MaterialNutritionTab({ materialId, isNewMaterial }: MaterialNutritionTabProps) {
  const { nutrition, isLoading, upsert, isUpserting } = useMaterialNutrition(materialId);
  const { data: dailyValues } = useDailyValues();
  const { toast } = useToast();
  const [formData, setFormData] = useState<NutritionFormData>({});
  const [optionalOpen, setOptionalOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [usdaDialogOpen, setUsdaDialogOpen] = useState(false);
  const [imageImportDialogOpen, setImageImportDialogOpen] = useState(false);
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);

  // Initialize form data when nutrition loads
  useEffect(() => {
    if (nutrition) {
      const { id, material_id, created_at, updated_at, ...rest } = nutrition;
      setFormData(rest);
      setHasChanges(false);
    }
  }, [nutrition]);

  const updateField = (field: keyof NutritionFormData, value: string | number | boolean | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleNumberChange = (field: keyof NutritionFormData, value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    updateField(field, numValue);
  };

  const handleSave = () => {
    if (!materialId) return;
    upsert({
      material_id: materialId,
      ...formData,
    });
    setHasChanges(false);
  };

  const handleUSDAImport = (nutrition: USDANutrition, description: string) => {
    if (!materialId) return;
    
    const importedData: NutritionFormData = {
      ...formData,
      calories: nutrition.calories ?? formData.calories,
      total_fat_g: nutrition.total_fat_g ?? formData.total_fat_g,
      saturated_fat_g: nutrition.saturated_fat_g ?? formData.saturated_fat_g,
      trans_fat_g: nutrition.trans_fat_g ?? formData.trans_fat_g,
      polyunsaturated_fat_g: nutrition.polyunsaturated_fat_g ?? formData.polyunsaturated_fat_g,
      monounsaturated_fat_g: nutrition.monounsaturated_fat_g ?? formData.monounsaturated_fat_g,
      cholesterol_mg: nutrition.cholesterol_mg ?? formData.cholesterol_mg,
      sodium_mg: nutrition.sodium_mg ?? formData.sodium_mg,
      total_carbohydrate_g: nutrition.total_carbohydrate_g ?? formData.total_carbohydrate_g,
      dietary_fiber_g: nutrition.dietary_fiber_g ?? formData.dietary_fiber_g,
      total_sugars_g: nutrition.total_sugars_g ?? formData.total_sugars_g,
      added_sugars_g: nutrition.added_sugars_g ?? formData.added_sugars_g,
      protein_g: nutrition.protein_g ?? formData.protein_g,
      vitamin_d_mcg: nutrition.vitamin_d_mcg ?? formData.vitamin_d_mcg,
      calcium_mg: nutrition.calcium_mg ?? formData.calcium_mg,
      iron_mg: nutrition.iron_mg ?? formData.iron_mg,
      potassium_mg: nutrition.potassium_mg ?? formData.potassium_mg,
      vitamin_a_mcg: nutrition.vitamin_a_mcg ?? formData.vitamin_a_mcg,
      vitamin_c_mg: nutrition.vitamin_c_mg ?? formData.vitamin_c_mg,
      data_source: 'usda_fdc',
      last_verified_at: new Date().toISOString(),
      notes: formData.notes 
        ? `${formData.notes}\n\nImported from USDA: ${description}` 
        : `Imported from USDA: ${description}`,
    };
    
    setFormData(importedData);
    
    // Auto-save after import
    upsert({
      material_id: materialId,
      ...importedData,
    });
  };

  const handlePdfExtract = async (file: File) => {
    if (!materialId) return;
    
    setIsExtractingPdf(true);
    try {
      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          // Remove the data URL prefix to get just the base64
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const imageBase64 = await base64Promise;

      const { data, error } = await supabase.functions.invoke('extract-nutrition-pdf', {
        body: { imageBase64, mimeType: file.type },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Extraction failed');

      const nutrition = data.nutrition;
      
      const importedData: NutritionFormData = {
        ...formData,
        serving_size_g: nutrition.serving_size_g ?? formData.serving_size_g,
        serving_size_description: nutrition.serving_size_description ?? formData.serving_size_description,
        calories: nutrition.calories ?? formData.calories,
        total_fat_g: nutrition.total_fat_g ?? formData.total_fat_g,
        saturated_fat_g: nutrition.saturated_fat_g ?? formData.saturated_fat_g,
        trans_fat_g: nutrition.trans_fat_g ?? formData.trans_fat_g,
        polyunsaturated_fat_g: nutrition.polyunsaturated_fat_g ?? formData.polyunsaturated_fat_g,
        monounsaturated_fat_g: nutrition.monounsaturated_fat_g ?? formData.monounsaturated_fat_g,
        cholesterol_mg: nutrition.cholesterol_mg ?? formData.cholesterol_mg,
        sodium_mg: nutrition.sodium_mg ?? formData.sodium_mg,
        total_carbohydrate_g: nutrition.total_carbohydrate_g ?? formData.total_carbohydrate_g,
        dietary_fiber_g: nutrition.dietary_fiber_g ?? formData.dietary_fiber_g,
        total_sugars_g: nutrition.total_sugars_g ?? formData.total_sugars_g,
        added_sugars_g: nutrition.added_sugars_g ?? formData.added_sugars_g,
        protein_g: nutrition.protein_g ?? formData.protein_g,
        vitamin_d_mcg: nutrition.vitamin_d_mcg ?? formData.vitamin_d_mcg,
        calcium_mg: nutrition.calcium_mg ?? formData.calcium_mg,
        iron_mg: nutrition.iron_mg ?? formData.iron_mg,
        potassium_mg: nutrition.potassium_mg ?? formData.potassium_mg,
        vitamin_a_mcg: nutrition.vitamin_a_mcg ?? formData.vitamin_a_mcg,
        vitamin_c_mg: nutrition.vitamin_c_mg ?? formData.vitamin_c_mg,
        data_source: 'pdf_extracted',
        extraction_confidence: nutrition.confidence,
        last_verified_at: new Date().toISOString(),
        notes: formData.notes 
          ? `${formData.notes}\n\nExtracted from PDF/Image (${nutrition.confidence}% confidence)` 
          : `Extracted from PDF/Image (${nutrition.confidence}% confidence)`,
      };
      
      setFormData(importedData);
      
      // Auto-save after import
      upsert({
        material_id: materialId,
        ...importedData,
      });

      toast({
        title: 'Nutrition extracted',
        description: `Successfully extracted nutrition data with ${nutrition.confidence}% confidence`,
      });
    } catch (error) {
      console.error('PDF extraction error:', error);
      toast({
        title: 'Extraction failed',
        description: error instanceof Error ? error.message : 'Failed to extract nutrition from image',
        variant: 'destructive',
      });
    } finally {
      setIsExtractingPdf(false);
      setImageImportDialogOpen(false);
    }
  };

  const handleImageImport = (file: File) => {
    handlePdfExtract(file);
  };

  const getDV = (field: keyof NutritionFormData): string | null => {
    const value = formData[field] as number | null | undefined;
    const dvCode = NUTRIENT_TO_DV_CODE[field];
    if (!dvCode) return null;
    const percent = calculatePercentDV(value, dvCode, dailyValues);
    return percent !== null ? `${percent}%` : null;
  };

  if (isNewMaterial) {
    return (
      <div className="text-center py-12 text-muted-foreground border rounded-md bg-muted/20">
        <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Save the material first to add nutritional data.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Image Import Dialog */}
      <ImageImportDialog
        open={imageImportDialogOpen}
        onOpenChange={setImageImportDialogOpen}
        onFileSelected={handleImageImport}
        isProcessing={isExtractingPdf}
      />

      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Nutritional Information</h3>
          <p className="text-sm text-muted-foreground">Per 100g serving base for calculations</p>
        </div>
        <div className="flex gap-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setImageImportDialogOpen(true)}
            disabled={isExtractingPdf}
          >
            <FileImage className="h-4 w-4 mr-2" />
            Import from Image
          </Button>
          <Button type="button" variant="outline" onClick={() => setUsdaDialogOpen(true)}>
            <Database className="h-4 w-4 mr-2" />
            Search USDA
          </Button>
          <Button type="button" onClick={handleSave} disabled={isUpserting || !hasChanges}>
            {isUpserting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Nutrition Data
          </Button>
        </div>
      </div>

      {/* USDA Search Dialog */}
      <USDASearchDialog
        open={usdaDialogOpen}
        onOpenChange={setUsdaDialogOpen}
        onSelect={handleUSDAImport}
      />

      {/* Data Source & Serving Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Data Source & Serving</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Data Source</Label>
            <Select
              value={formData.data_source || 'manual'}
              onValueChange={(v) => updateField('data_source', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATA_SOURCES.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Serving Size (g)</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.serving_size_g ?? 100}
              onChange={(e) => handleNumberChange('serving_size_g', e.target.value)}
              placeholder="100"
            />
          </div>
          <div className="space-y-2">
            <Label>Serving Description</Label>
            <Input
              value={formData.serving_size_description ?? ''}
              onChange={(e) => updateField('serving_size_description', e.target.value)}
              placeholder="e.g., per 100g"
            />
          </div>
        </CardContent>
      </Card>

      {/* Macronutrients */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Macronutrients</CardTitle>
          <CardDescription>Core nutritional values per 100g</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Calories */}
          <div className="grid grid-cols-4 gap-4 items-end">
            <div className="col-span-2 space-y-2">
              <Label className="font-semibold">Calories</Label>
              <Input
                type="number"
                step="1"
                value={formData.calories ?? ''}
                onChange={(e) => handleNumberChange('calories', e.target.value)}
                placeholder="0"
                className="font-medium"
              />
            </div>
            <div className="col-span-2 text-sm text-muted-foreground pt-2">kcal</div>
          </div>

          {/* Fats */}
          <div className="space-y-3 pl-0">
            <NutrientRow
              label="Total Fat"
              value={formData.total_fat_g}
              onChange={(v) => handleNumberChange('total_fat_g', v)}
              unit="g"
              dv={getDV('total_fat_g')}
              bold
            />
            <div className="pl-4 space-y-2 border-l-2 border-muted ml-2">
              <NutrientRow
                label="Saturated Fat"
                value={formData.saturated_fat_g}
                onChange={(v) => handleNumberChange('saturated_fat_g', v)}
                unit="g"
                dv={getDV('saturated_fat_g')}
              />
              <NutrientRow
                label="Trans Fat"
                value={formData.trans_fat_g}
                onChange={(v) => handleNumberChange('trans_fat_g', v)}
                unit="g"
              />
              <NutrientRow
                label="Polyunsaturated Fat"
                value={formData.polyunsaturated_fat_g}
                onChange={(v) => handleNumberChange('polyunsaturated_fat_g', v)}
                unit="g"
              />
              <NutrientRow
                label="Monounsaturated Fat"
                value={formData.monounsaturated_fat_g}
                onChange={(v) => handleNumberChange('monounsaturated_fat_g', v)}
                unit="g"
              />
            </div>
          </div>

          {/* Cholesterol & Sodium */}
          <NutrientRow
            label="Cholesterol"
            value={formData.cholesterol_mg}
            onChange={(v) => handleNumberChange('cholesterol_mg', v)}
            unit="mg"
            dv={getDV('cholesterol_mg')}
            bold
          />
          <NutrientRow
            label="Sodium"
            value={formData.sodium_mg}
            onChange={(v) => handleNumberChange('sodium_mg', v)}
            unit="mg"
            dv={getDV('sodium_mg')}
            bold
          />

          {/* Carbohydrates */}
          <div className="space-y-3">
            <NutrientRow
              label="Total Carbohydrate"
              value={formData.total_carbohydrate_g}
              onChange={(v) => handleNumberChange('total_carbohydrate_g', v)}
              unit="g"
              dv={getDV('total_carbohydrate_g')}
              bold
            />
            <div className="pl-4 space-y-2 border-l-2 border-muted ml-2">
              <NutrientRow
                label="Dietary Fiber"
                value={formData.dietary_fiber_g}
                onChange={(v) => handleNumberChange('dietary_fiber_g', v)}
                unit="g"
                dv={getDV('dietary_fiber_g')}
              />
              <NutrientRow
                label="Total Sugars"
                value={formData.total_sugars_g}
                onChange={(v) => handleNumberChange('total_sugars_g', v)}
                unit="g"
              />
              <div className="pl-4 border-l-2 border-muted ml-2">
                <NutrientRow
                  label="Added Sugars"
                  value={formData.added_sugars_g}
                  onChange={(v) => handleNumberChange('added_sugars_g', v)}
                  unit="g"
                  dv={getDV('added_sugars_g')}
                />
              </div>
              <NutrientRow
                label="Sugar Alcohols"
                value={formData.sugar_alcohol_g}
                onChange={(v) => handleNumberChange('sugar_alcohol_g', v)}
                unit="g"
              />
            </div>
          </div>

          {/* Protein */}
          <NutrientRow
            label="Protein"
            value={formData.protein_g}
            onChange={(v) => handleNumberChange('protein_g', v)}
            unit="g"
            dv={getDV('protein_g')}
            bold
          />
        </CardContent>
      </Card>

      {/* Mandatory Micronutrients */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            Micronutrients - Mandatory
            <Badge variant="secondary" className="text-xs">FDA 2020</Badge>
          </CardTitle>
          <CardDescription>Required nutrients on Nutrition Facts label</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <NutrientRow
            label="Vitamin D"
            value={formData.vitamin_d_mcg}
            onChange={(v) => handleNumberChange('vitamin_d_mcg', v)}
            unit="mcg"
            dv={getDV('vitamin_d_mcg')}
          />
          <NutrientRow
            label="Calcium"
            value={formData.calcium_mg}
            onChange={(v) => handleNumberChange('calcium_mg', v)}
            unit="mg"
            dv={getDV('calcium_mg')}
          />
          <NutrientRow
            label="Iron"
            value={formData.iron_mg}
            onChange={(v) => handleNumberChange('iron_mg', v)}
            unit="mg"
            dv={getDV('iron_mg')}
          />
          <NutrientRow
            label="Potassium"
            value={formData.potassium_mg}
            onChange={(v) => handleNumberChange('potassium_mg', v)}
            unit="mg"
            dv={getDV('potassium_mg')}
          />
        </CardContent>
      </Card>

      {/* Optional Micronutrients (Collapsible) */}
      <Collapsible open={optionalOpen} onOpenChange={setOptionalOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Micronutrients - Optional</CardTitle>
                  <CardDescription>Additional vitamins and minerals</CardDescription>
                </div>
                {optionalOpen ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="grid grid-cols-2 gap-4 pt-0">
              <NutrientRow
                label="Vitamin A"
                value={formData.vitamin_a_mcg}
                onChange={(v) => handleNumberChange('vitamin_a_mcg', v)}
                unit="mcg"
                dv={getDV('vitamin_a_mcg')}
              />
              <NutrientRow
                label="Vitamin C"
                value={formData.vitamin_c_mg}
                onChange={(v) => handleNumberChange('vitamin_c_mg', v)}
                unit="mg"
                dv={getDV('vitamin_c_mg')}
              />
              <NutrientRow
                label="Vitamin E"
                value={formData.vitamin_e_mg}
                onChange={(v) => handleNumberChange('vitamin_e_mg', v)}
                unit="mg"
                dv={getDV('vitamin_e_mg')}
              />
              <NutrientRow
                label="Thiamin (B1)"
                value={formData.thiamin_mg}
                onChange={(v) => handleNumberChange('thiamin_mg', v)}
                unit="mg"
                dv={getDV('thiamin_mg')}
              />
              <NutrientRow
                label="Riboflavin (B2)"
                value={formData.riboflavin_mg}
                onChange={(v) => handleNumberChange('riboflavin_mg', v)}
                unit="mg"
                dv={getDV('riboflavin_mg')}
              />
              <NutrientRow
                label="Niacin (B3)"
                value={formData.niacin_mg}
                onChange={(v) => handleNumberChange('niacin_mg', v)}
                unit="mg"
                dv={getDV('niacin_mg')}
              />
              <NutrientRow
                label="Vitamin B6"
                value={formData.vitamin_b6_mg}
                onChange={(v) => handleNumberChange('vitamin_b6_mg', v)}
                unit="mg"
                dv={getDV('vitamin_b6_mg')}
              />
              <NutrientRow
                label="Folate"
                value={formData.folate_mcg_dfe}
                onChange={(v) => handleNumberChange('folate_mcg_dfe', v)}
                unit="mcg DFE"
                dv={getDV('folate_mcg_dfe')}
              />
              <NutrientRow
                label="Vitamin B12"
                value={formData.vitamin_b12_mcg}
                onChange={(v) => handleNumberChange('vitamin_b12_mcg', v)}
                unit="mcg"
                dv={getDV('vitamin_b12_mcg')}
              />
              <NutrientRow
                label="Phosphorus"
                value={formData.phosphorus_mg}
                onChange={(v) => handleNumberChange('phosphorus_mg', v)}
                unit="mg"
                dv={getDV('phosphorus_mg')}
              />
              <NutrientRow
                label="Magnesium"
                value={formData.magnesium_mg}
                onChange={(v) => handleNumberChange('magnesium_mg', v)}
                unit="mg"
                dv={getDV('magnesium_mg')}
              />
              <NutrientRow
                label="Zinc"
                value={formData.zinc_mg}
                onChange={(v) => handleNumberChange('zinc_mg', v)}
                unit="mg"
                dv={getDV('zinc_mg')}
              />
              <NutrientRow
                label="Selenium"
                value={formData.selenium_mcg}
                onChange={(v) => handleNumberChange('selenium_mcg', v)}
                unit="mcg"
                dv={getDV('selenium_mcg')}
              />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Verification & Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Verification & Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="verified"
                checked={!!formData.last_verified_at}
                onCheckedChange={(checked) => {
                  updateField('last_verified_at', checked ? new Date().toISOString() : null);
                }}
              />
              <Label htmlFor="verified" className="cursor-pointer">
                Data Verified
              </Label>
            </div>
            {formData.last_verified_at && (
              <Badge variant="outline" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Verified {new Date(formData.last_verified_at).toLocaleDateString()}
              </Badge>
            )}
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes ?? ''}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Additional notes about nutritional data source, testing, etc."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Reusable nutrient input row component
interface NutrientRowProps {
  label: string;
  value: number | null | undefined;
  onChange: (value: string) => void;
  unit: string;
  dv?: string | null;
  bold?: boolean;
}

function NutrientRow({ label, value, onChange, unit, dv, bold }: NutrientRowProps) {
  return (
    <div className="grid grid-cols-12 gap-2 items-center">
      <Label className={cn("col-span-4 text-sm", bold && "font-semibold")}>{label}</Label>
      <div className="col-span-4">
        <Input
          type="number"
          step="0.001"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className="h-8"
        />
      </div>
      <span className="col-span-2 text-sm text-muted-foreground">{unit}</span>
      <span className="col-span-2 text-sm text-right">
        {dv && <Badge variant="secondary" className="text-xs">{dv} DV</Badge>}
      </span>
    </div>
  );
}
