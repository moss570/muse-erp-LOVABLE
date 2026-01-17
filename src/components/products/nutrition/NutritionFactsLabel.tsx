import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface NutritionData {
  servingSize: string;
  servingsPerContainer: string;
  calories: number;
  totalFat: number;
  saturatedFat: number;
  transFat: number;
  cholesterol: number;
  sodium: number;
  totalCarbohydrate: number;
  dietaryFiber: number;
  totalSugars: number;
  addedSugars: number;
  protein: number;
  vitaminD: number;
  calcium: number;
  iron: number;
  potassium: number;
  // Optional nutrients
  vitaminA?: number;
  vitaminC?: number;
  vitaminE?: number;
  vitaminK?: number;
  thiamin?: number;
  riboflavin?: number;
  niacin?: number;
  vitaminB6?: number;
  folate?: number;
  vitaminB12?: number;
  biotin?: number;
  pantothenicAcid?: number;
  phosphorus?: number;
  iodine?: number;
  magnesium?: number;
  zinc?: number;
  selenium?: number;
  copper?: number;
  manganese?: number;
  chromium?: number;
  molybdenum?: number;
  chloride?: number;
}

interface NutritionFactsLabelProps {
  data: NutritionData;
  productName?: string;
  showOptionalNutrients?: boolean;
  className?: string;
}

// FDA Daily Values (2020 update)
const DAILY_VALUES = {
  totalFat: 78,
  saturatedFat: 20,
  cholesterol: 300,
  sodium: 2300,
  totalCarbohydrate: 275,
  dietaryFiber: 28,
  addedSugars: 50,
  protein: 50,
  vitaminD: 20,
  calcium: 1300,
  iron: 18,
  potassium: 4700,
  vitaminA: 900,
  vitaminC: 90,
  vitaminE: 15,
  vitaminK: 120,
  thiamin: 1.2,
  riboflavin: 1.3,
  niacin: 16,
  vitaminB6: 1.7,
  folate: 400,
  vitaminB12: 2.4,
  biotin: 30,
  pantothenicAcid: 5,
  phosphorus: 1250,
  iodine: 150,
  magnesium: 420,
  zinc: 11,
  selenium: 55,
  copper: 0.9,
  manganese: 2.3,
  chromium: 35,
  molybdenum: 45,
  chloride: 2300,
};

function calculateDV(value: number, dailyValue: number): number {
  return Math.round((value / dailyValue) * 100);
}

export const NutritionFactsLabel = forwardRef<HTMLDivElement, NutritionFactsLabelProps>(
  ({ data, productName, showOptionalNutrients = false, className }, ref) => {
    const hasOptionalNutrients = showOptionalNutrients && (
      data.vitaminA || data.vitaminC || data.vitaminE || data.vitaminK ||
      data.thiamin || data.riboflavin || data.niacin || data.vitaminB6 ||
      data.folate || data.vitaminB12 || data.biotin || data.pantothenicAcid ||
      data.phosphorus || data.iodine || data.magnesium || data.zinc ||
      data.selenium || data.copper || data.manganese || data.chromium ||
      data.molybdenum || data.chloride
    );

    return (
      <div
        ref={ref}
        className={cn(
          "bg-white text-black font-sans border-2 border-black p-1",
          className
        )}
        style={{
          width: '280px',
          fontFamily: 'Helvetica, Arial, sans-serif',
        }}
      >
        {/* Header */}
        <div className="text-[28px] font-extrabold leading-none tracking-tight">
          Nutrition Facts
        </div>
        
        {/* Servings */}
        <div className="border-b border-black pb-1 mt-1">
          <div className="flex justify-between text-[11px]">
            <span>{data.servingsPerContainer} servings per container</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="font-bold text-[13px]">Serving size</span>
            <span className="font-bold text-[13px]">{data.servingSize}</span>
          </div>
        </div>

        {/* Calories */}
        <div className="border-b-[8px] border-black py-1">
          <div className="text-[8px] font-bold">Amount per serving</div>
          <div className="flex justify-between items-baseline">
            <span className="text-[22px] font-extrabold">Calories</span>
            <span className="text-[32px] font-extrabold leading-none">{data.calories}</span>
          </div>
        </div>

        {/* % Daily Value header */}
        <div className="text-right text-[8px] font-bold border-b border-black py-0.5">
          % Daily Value*
        </div>

        {/* Nutrients */}
        <div className="text-[11px]">
          {/* Total Fat */}
          <div className="flex justify-between border-b border-black py-0.5">
            <span><span className="font-bold">Total Fat</span> {data.totalFat}g</span>
            <span className="font-bold">{calculateDV(data.totalFat, DAILY_VALUES.totalFat)}%</span>
          </div>
          
          {/* Saturated Fat */}
          <div className="flex justify-between border-b border-black py-0.5 pl-4">
            <span>Saturated Fat {data.saturatedFat}g</span>
            <span className="font-bold">{calculateDV(data.saturatedFat, DAILY_VALUES.saturatedFat)}%</span>
          </div>
          
          {/* Trans Fat */}
          <div className="flex justify-between border-b border-black py-0.5 pl-4">
            <span><em>Trans</em> Fat {data.transFat}g</span>
            <span></span>
          </div>
          
          {/* Cholesterol */}
          <div className="flex justify-between border-b border-black py-0.5">
            <span><span className="font-bold">Cholesterol</span> {data.cholesterol}mg</span>
            <span className="font-bold">{calculateDV(data.cholesterol, DAILY_VALUES.cholesterol)}%</span>
          </div>
          
          {/* Sodium */}
          <div className="flex justify-between border-b border-black py-0.5">
            <span><span className="font-bold">Sodium</span> {data.sodium}mg</span>
            <span className="font-bold">{calculateDV(data.sodium, DAILY_VALUES.sodium)}%</span>
          </div>
          
          {/* Total Carbohydrate */}
          <div className="flex justify-between border-b border-black py-0.5">
            <span><span className="font-bold">Total Carbohydrate</span> {data.totalCarbohydrate}g</span>
            <span className="font-bold">{calculateDV(data.totalCarbohydrate, DAILY_VALUES.totalCarbohydrate)}%</span>
          </div>
          
          {/* Dietary Fiber */}
          <div className="flex justify-between border-b border-black py-0.5 pl-4">
            <span>Dietary Fiber {data.dietaryFiber}g</span>
            <span className="font-bold">{calculateDV(data.dietaryFiber, DAILY_VALUES.dietaryFiber)}%</span>
          </div>
          
          {/* Total Sugars */}
          <div className="flex justify-between border-b border-black py-0.5 pl-4">
            <span>Total Sugars {data.totalSugars}g</span>
            <span></span>
          </div>
          
          {/* Added Sugars */}
          <div className="flex justify-between border-b border-black py-0.5 pl-8">
            <span>Includes {data.addedSugars}g Added Sugars</span>
            <span className="font-bold">{calculateDV(data.addedSugars, DAILY_VALUES.addedSugars)}%</span>
          </div>
          
          {/* Protein */}
          <div className="flex justify-between border-b-[8px] border-black py-0.5">
            <span><span className="font-bold">Protein</span> {data.protein}g</span>
            <span></span>
          </div>
          
          {/* Mandatory Micronutrients */}
          <div className="flex justify-between border-b border-black py-0.5">
            <span>Vitamin D {data.vitaminD}mcg</span>
            <span className="font-bold">{calculateDV(data.vitaminD, DAILY_VALUES.vitaminD)}%</span>
          </div>
          
          <div className="flex justify-between border-b border-black py-0.5">
            <span>Calcium {data.calcium}mg</span>
            <span className="font-bold">{calculateDV(data.calcium, DAILY_VALUES.calcium)}%</span>
          </div>
          
          <div className="flex justify-between border-b border-black py-0.5">
            <span>Iron {data.iron}mg</span>
            <span className="font-bold">{calculateDV(data.iron, DAILY_VALUES.iron)}%</span>
          </div>
          
          <div className="flex justify-between border-b-[4px] border-black py-0.5">
            <span>Potassium {data.potassium}mg</span>
            <span className="font-bold">{calculateDV(data.potassium, DAILY_VALUES.potassium)}%</span>
          </div>

          {/* Optional Nutrients */}
          {hasOptionalNutrients && (
            <>
              {data.vitaminA !== undefined && data.vitaminA > 0 && (
                <div className="flex justify-between border-b border-black py-0.5">
                  <span>Vitamin A {data.vitaminA}mcg</span>
                  <span className="font-bold">{calculateDV(data.vitaminA, DAILY_VALUES.vitaminA)}%</span>
                </div>
              )}
              {data.vitaminC !== undefined && data.vitaminC > 0 && (
                <div className="flex justify-between border-b border-black py-0.5">
                  <span>Vitamin C {data.vitaminC}mg</span>
                  <span className="font-bold">{calculateDV(data.vitaminC, DAILY_VALUES.vitaminC)}%</span>
                </div>
              )}
              {data.vitaminE !== undefined && data.vitaminE > 0 && (
                <div className="flex justify-between border-b border-black py-0.5">
                  <span>Vitamin E {data.vitaminE}mg</span>
                  <span className="font-bold">{calculateDV(data.vitaminE, DAILY_VALUES.vitaminE)}%</span>
                </div>
              )}
              {data.thiamin !== undefined && data.thiamin > 0 && (
                <div className="flex justify-between border-b border-black py-0.5">
                  <span>Thiamin {data.thiamin}mg</span>
                  <span className="font-bold">{calculateDV(data.thiamin, DAILY_VALUES.thiamin)}%</span>
                </div>
              )}
              {data.riboflavin !== undefined && data.riboflavin > 0 && (
                <div className="flex justify-between border-b border-black py-0.5">
                  <span>Riboflavin {data.riboflavin}mg</span>
                  <span className="font-bold">{calculateDV(data.riboflavin, DAILY_VALUES.riboflavin)}%</span>
                </div>
              )}
              {data.niacin !== undefined && data.niacin > 0 && (
                <div className="flex justify-between border-b border-black py-0.5">
                  <span>Niacin {data.niacin}mg</span>
                  <span className="font-bold">{calculateDV(data.niacin, DAILY_VALUES.niacin)}%</span>
                </div>
              )}
              {data.vitaminB6 !== undefined && data.vitaminB6 > 0 && (
                <div className="flex justify-between border-b border-black py-0.5">
                  <span>Vitamin B6 {data.vitaminB6}mg</span>
                  <span className="font-bold">{calculateDV(data.vitaminB6, DAILY_VALUES.vitaminB6)}%</span>
                </div>
              )}
              {data.folate !== undefined && data.folate > 0 && (
                <div className="flex justify-between border-b border-black py-0.5">
                  <span>Folate {data.folate}mcg DFE</span>
                  <span className="font-bold">{calculateDV(data.folate, DAILY_VALUES.folate)}%</span>
                </div>
              )}
              {data.vitaminB12 !== undefined && data.vitaminB12 > 0 && (
                <div className="flex justify-between border-b border-black py-0.5">
                  <span>Vitamin B12 {data.vitaminB12}mcg</span>
                  <span className="font-bold">{calculateDV(data.vitaminB12, DAILY_VALUES.vitaminB12)}%</span>
                </div>
              )}
              {data.phosphorus !== undefined && data.phosphorus > 0 && (
                <div className="flex justify-between border-b border-black py-0.5">
                  <span>Phosphorus {data.phosphorus}mg</span>
                  <span className="font-bold">{calculateDV(data.phosphorus, DAILY_VALUES.phosphorus)}%</span>
                </div>
              )}
              {data.magnesium !== undefined && data.magnesium > 0 && (
                <div className="flex justify-between border-b border-black py-0.5">
                  <span>Magnesium {data.magnesium}mg</span>
                  <span className="font-bold">{calculateDV(data.magnesium, DAILY_VALUES.magnesium)}%</span>
                </div>
              )}
              {data.zinc !== undefined && data.zinc > 0 && (
                <div className="flex justify-between border-b border-black py-0.5">
                  <span>Zinc {data.zinc}mg</span>
                  <span className="font-bold">{calculateDV(data.zinc, DAILY_VALUES.zinc)}%</span>
                </div>
              )}
              {data.selenium !== undefined && data.selenium > 0 && (
                <div className="flex justify-between border-b border-black py-0.5">
                  <span>Selenium {data.selenium}mcg</span>
                  <span className="font-bold">{calculateDV(data.selenium, DAILY_VALUES.selenium)}%</span>
                </div>
              )}
              {data.copper !== undefined && data.copper > 0 && (
                <div className="flex justify-between border-b border-black py-0.5">
                  <span>Copper {data.copper}mg</span>
                  <span className="font-bold">{calculateDV(data.copper, DAILY_VALUES.copper)}%</span>
                </div>
              )}
              {data.manganese !== undefined && data.manganese > 0 && (
                <div className="flex justify-between border-b border-black py-0.5">
                  <span>Manganese {data.manganese}mg</span>
                  <span className="font-bold">{calculateDV(data.manganese, DAILY_VALUES.manganese)}%</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="text-[7px] pt-1 leading-tight">
          * The % Daily Value (DV) tells you how much a nutrient in a serving of food contributes to a daily diet. 2,000 calories a day is used for general nutrition advice.
        </div>
      </div>
    );
  }
);

NutritionFactsLabel.displayName = 'NutritionFactsLabel';
