import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { useProductNutrition } from '@/hooks/useProductNutrition';
import { useDailyValues, calculatePercentDV, NUTRIENT_TO_DV_CODE } from '@/hooks/useDailyValues';
import { formatNutrientValue } from '@/lib/nutritionRounding';
import { 
  Loader2, 
  Calculator, 
  Save, 
  AlertTriangle, 
  CheckCircle2,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductNutritionTabProps {
  productId: string;
  productName: string;
}

export function ProductNutritionTab({ productId, productName }: ProductNutritionTabProps) {
  const {
    nutrition,
    isLoading,
    isCalculating,
    isUpserting,
    calculatedResult,
    calculateAsync,
    calculateAndSave,
  } = useProductNutrition(productId);
  
  const { data: dailyValues } = useDailyValues();
  
  const [yieldLoss, setYieldLoss] = useState(5);
  const [overrun, setOverrun] = useState(50);
  const [servingSize, setServingSize] = useState(95);

  const handleCalculate = async () => {
    await calculateAsync({
      yieldLossPercent: yieldLoss,
      overrunPercent: overrun,
      servingSizeG: servingSize,
    });
  };

  const handleCalculateAndSave = async () => {
    await calculateAndSave({
      yieldLossPercent: yieldLoss,
      overrunPercent: overrun,
      servingSizeG: servingSize,
    });
  };

  const getDV = (value: number | null | undefined, fieldName: string): string | null => {
    const dvCode = NUTRIENT_TO_DV_CODE[fieldName];
    if (!dvCode || value === null || value === undefined) return null;
    const percent = calculatePercentDV(value, dvCode, dailyValues);
    return percent !== null ? `${percent}%` : null;
  };

  // Use calculated result if available, otherwise use saved nutrition
  const displayData = calculatedResult?.per_serving || nutrition;
  const hasData = !!displayData;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Nutrition Facts</h3>
          <p className="text-sm text-muted-foreground">
            {nutrition?.calculation_date 
              ? `Last calculated: ${new Date(nutrition.calculation_date).toLocaleDateString()}`
              : 'Calculate nutrition from recipe ingredients'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleCalculate}
            disabled={isCalculating}
          >
            {isCalculating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Calculator className="h-4 w-4 mr-2" />
            )}
            Calculate Preview
          </Button>
          <Button 
            onClick={handleCalculateAndSave}
            disabled={isCalculating || isUpserting}
          >
            {(isCalculating || isUpserting) ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Calculate & Save
          </Button>
        </div>
      </div>

      {/* Calculation Parameters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Calculation Parameters</CardTitle>
          <CardDescription>Adjust for ice cream processing factors</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Serving Size (g)</Label>
            <Input
              type="number"
              value={servingSize}
              onChange={(e) => setServingSize(Number(e.target.value) || 95)}
              placeholder="95"
            />
            <p className="text-xs text-muted-foreground">FDA: 2/3 cup = 95g</p>
          </div>
          <div className="space-y-2">
            <Label>Yield Loss (%)</Label>
            <Input
              type="number"
              value={yieldLoss}
              onChange={(e) => setYieldLoss(Number(e.target.value) || 0)}
              placeholder="5"
            />
            <p className="text-xs text-muted-foreground">Processing loss (typical: 5%)</p>
          </div>
          <div className="space-y-2">
            <Label>Overrun (%)</Label>
            <Input
              type="number"
              value={overrun}
              onChange={(e) => setOverrun(Number(e.target.value) || 0)}
              placeholder="50"
            />
            <p className="text-xs text-muted-foreground">Air incorporation (typical: 50-100%)</p>
          </div>
        </CardContent>
      </Card>

      {/* Warnings */}
      {calculatedResult?.warnings && calculatedResult.warnings.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Calculation Warnings</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside mt-2">
              {calculatedResult.warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-2 gap-6">
        {/* Left: Nutrition Facts Display */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Nutrition Facts
              {nutrition?.is_verified && (
                <Badge variant="outline" className="gap-1 text-green-600">
                  <CheckCircle2 className="h-3 w-3" />
                  Verified
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Per serving ({calculatedResult?.serving_size_g || nutrition?.serving_size_g || servingSize}g)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!hasData ? (
              <div className="text-center py-8 text-muted-foreground">
                <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Click "Calculate Preview" to see nutrition data</p>
              </div>
            ) : (
              <>
                {/* Calories */}
                <div className="flex justify-between items-center py-2 border-b-4 border-foreground">
                  <span className="text-2xl font-bold">Calories</span>
                  <span className="text-2xl font-bold">
                    {formatNutrientValue(displayData.calories, 'calories')}
                  </span>
                </div>

                {/* % Daily Value header */}
                <div className="text-right text-sm font-semibold border-b">
                  % Daily Value*
                </div>

                {/* Macronutrients */}
                <NutrientLine 
                  label="Total Fat" 
                  value={displayData.total_fat_g} 
                  unit="g" 
                  dv={getDV(displayData.total_fat_g, 'total_fat_g')}
                  bold
                />
                <NutrientLine 
                  label="Saturated Fat" 
                  value={displayData.saturated_fat_g} 
                  unit="g" 
                  dv={getDV(displayData.saturated_fat_g, 'saturated_fat_g')}
                  indent
                />
                <NutrientLine 
                  label="Trans Fat" 
                  value={displayData.trans_fat_g} 
                  unit="g" 
                  indent
                />
                <NutrientLine 
                  label="Cholesterol" 
                  value={displayData.cholesterol_mg} 
                  unit="mg" 
                  dv={getDV(displayData.cholesterol_mg, 'cholesterol_mg')}
                  bold
                />
                <NutrientLine 
                  label="Sodium" 
                  value={displayData.sodium_mg} 
                  unit="mg" 
                  dv={getDV(displayData.sodium_mg, 'sodium_mg')}
                  bold
                />
                <NutrientLine 
                  label="Total Carbohydrate" 
                  value={displayData.total_carbohydrate_g} 
                  unit="g" 
                  dv={getDV(displayData.total_carbohydrate_g, 'total_carbohydrate_g')}
                  bold
                />
                <NutrientLine 
                  label="Dietary Fiber" 
                  value={displayData.dietary_fiber_g} 
                  unit="g" 
                  dv={getDV(displayData.dietary_fiber_g, 'dietary_fiber_g')}
                  indent
                />
                <NutrientLine 
                  label="Total Sugars" 
                  value={displayData.total_sugars_g} 
                  unit="g" 
                  indent
                />
                <NutrientLine 
                  label="Incl. Added Sugars" 
                  value={displayData.added_sugars_g} 
                  unit="g" 
                  dv={getDV(displayData.added_sugars_g, 'added_sugars_g')}
                  indent
                  doubleIndent
                />
                <NutrientLine 
                  label="Protein" 
                  value={displayData.protein_g} 
                  unit="g" 
                  bold
                />

                <div className="border-t-4 border-foreground pt-2" />

                {/* Micronutrients */}
                <NutrientLine 
                  label="Vitamin D" 
                  value={displayData.vitamin_d_mcg} 
                  unit="mcg" 
                  dv={getDV(displayData.vitamin_d_mcg, 'vitamin_d_mcg')}
                />
                <NutrientLine 
                  label="Calcium" 
                  value={displayData.calcium_mg} 
                  unit="mg" 
                  dv={getDV(displayData.calcium_mg, 'calcium_mg')}
                />
                <NutrientLine 
                  label="Iron" 
                  value={displayData.iron_mg} 
                  unit="mg" 
                  dv={getDV(displayData.iron_mg, 'iron_mg')}
                />
                <NutrientLine 
                  label="Potassium" 
                  value={displayData.potassium_mg} 
                  unit="mg" 
                  dv={getDV(displayData.potassium_mg, 'potassium_mg')}
                />

                {/* Footnote */}
                <p className="text-xs text-muted-foreground pt-2 border-t">
                  * The % Daily Value tells you how much a nutrient in a serving contributes to a daily diet. 2,000 calories a day is used for general nutrition advice.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Right: Ingredient Contribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Ingredient Contribution</CardTitle>
            <CardDescription>
              {calculatedResult 
                ? `${calculatedResult.ingredients.length} ingredients, ${calculatedResult.batch_weight_g.toFixed(0)}g batch`
                : 'Run calculation to see ingredient breakdown'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {calculatedResult?.ingredients && calculatedResult.ingredients.length > 0 ? (
              <div className="max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ingredient</TableHead>
                      <TableHead className="text-right">Qty (g)</TableHead>
                      <TableHead className="text-right">Cal</TableHead>
                      <TableHead className="text-right">Fat</TableHead>
                      <TableHead className="text-right">Sugar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {calculatedResult.ingredients.map((ing) => (
                      <TableRow key={ing.material_id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {ing.material_name}
                            {!ing.has_nutrition_data && (
                              <Badge variant="outline" className="text-xs text-orange-600">
                                No data
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {ing.quantity_g.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right">
                          {ing.calories.toFixed(0)}
                        </TableCell>
                        <TableCell className="text-right">
                          {ing.total_fat_g.toFixed(1)}g
                        </TableCell>
                        <TableCell className="text-right">
                          {ing.total_sugars_g.toFixed(1)}g
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calculator className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Run calculation to see ingredient breakdown</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Helper component for nutrient lines
interface NutrientLineProps {
  label: string;
  value: number | null | undefined;
  unit: string;
  dv?: string | null;
  bold?: boolean;
  indent?: boolean;
  doubleIndent?: boolean;
}

function NutrientLine({ label, value, unit, dv, bold, indent, doubleIndent }: NutrientLineProps) {
  const formattedValue = value !== null && value !== undefined 
    ? `${Math.round(value * 10) / 10}${unit}`
    : `0${unit}`;

  return (
    <div className={cn(
      "flex justify-between items-center py-1 border-b text-sm",
      indent && "pl-4",
      doubleIndent && "pl-8"
    )}>
      <span className={cn(bold && "font-semibold")}>
        {label} {formattedValue}
      </span>
      <span className="font-semibold">{dv || ''}</span>
    </div>
  );
}
