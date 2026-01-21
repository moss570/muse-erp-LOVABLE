/**
 * Volume conversion utilities for manufacturing recipes.
 * Each recipe batch yields a standard 1 KG weight, with a configurable volume yield.
 */

// Standard conversion factors to Liters
const VOLUME_TO_LITERS: Record<string, number> = {
  GAL: 3.78541,
  L: 1,
  FL_OZ: 0.0295735,
  ML: 0.001,
  PT: 0.473176,
  QT: 0.946353,
};

// Volume unit options for dropdowns
export const VOLUME_UNITS = [
  { value: "GAL", label: "Gallons (GAL)" },
  { value: "L", label: "Liters (L)" },
  { value: "FL_OZ", label: "Fluid Ounces (FL OZ)" },
] as const;

export type VolumeUnit = (typeof VOLUME_UNITS)[number]["value"];

/**
 * Convert volume between different units
 */
export function convertVolume(
  value: number,
  fromUnit: string,
  toUnit: string
): number {
  const fromFactor = VOLUME_TO_LITERS[fromUnit] || 1;
  const toFactor = VOLUME_TO_LITERS[toUnit] || 1;
  const liters = value * fromFactor;
  return liters / toFactor;
}

/**
 * Calculate volume from weight using recipe's volume per KG
 */
export function calculateVolumeFromWeight(
  weightKg: number,
  volumePerKg: number,
  volumeUnit: string
): { volume: number; unit: string } {
  return {
    volume: weightKg * volumePerKg,
    unit: volumeUnit,
  };
}

/**
 * Calculate weight from volume using recipe's volume per KG
 */
export function calculateWeightFromVolume(
  volume: number,
  volumeUnit: string,
  volumePerKg: number,
  targetVolumeUnit: string
): number {
  // First convert volume to the recipe's volume unit
  const normalizedVolume = convertVolume(volume, volumeUnit, targetVolumeUnit);
  // Then calculate weight
  return volumePerKg > 0 ? normalizedVolume / volumePerKg : 0;
}

/**
 * Format a quantity with both weight and volume display
 */
export function formatDualUnits(
  weightKg: number,
  volumePerKg: number | null,
  volumeUnit: string | null
): string {
  const weightStr = `${weightKg.toFixed(1)} KG`;
  
  if (!volumePerKg || !volumeUnit) {
    return weightStr;
  }
  
  const volume = weightKg * volumePerKg;
  const volumeStr = `${volume.toFixed(1)} ${volumeUnit}`;
  
  return `${weightStr} (${volumeStr})`;
}

/**
 * Get display string for volume
 */
export function formatVolume(
  volume: number | null | undefined,
  unit: string | null | undefined
): string {
  if (volume === null || volume === undefined || !unit) {
    return "—";
  }
  return `${volume.toFixed(2)} ${unit}`;
}
