/**
 * Pallet Configuration Calculation Utilities
 * Core functions for validating and calculating pallet configurations
 */

// Standard pallet dimensions
export const PALLET_TYPES = {
  US_STANDARD: { lengthIn: 48, widthIn: 40, name: "US Standard (48\" × 40\")" },
  EURO: { lengthIn: 47.24, widthIn: 31.5, name: "Euro Pallet (1200mm × 800mm)" },
  CUSTOM: { lengthIn: 0, widthIn: 0, name: "Custom" },
} as const;

export type PalletType = keyof typeof PALLET_TYPES;

export const PALLET_HEIGHT_IN = 6; // Standard pallet height ~6"
export const STANDARD_PALLET_WEIGHT_KG = 20; // Standard wooden pallet ~20kg

// Weight limits (in lbs, common industry standards)
export const PALLET_WEIGHT_LIMITS = {
  STANDARD: 2500, // Standard pallet max capacity in lbs
  TRUCK: 44000, // Typical truck weight limit in lbs
  CONTAINER_20FT: 47900, // 20ft container max in lbs
  CONTAINER_40FT: 58860, // 40ft container max in lbs
};

export interface OverhangResult {
  front: number;
  back: number;
  left: number;
  right: number;
  maxOverhang: number;
  hasOverhang: boolean;
}

export type OverhangSeverity = 'none' | 'warning' | 'danger';

export interface TiValidationResult {
  isValid: boolean;
  maxTi: number;
  optimalTi: number;
  message: string | null;
  optimalArrangement: {
    cols: number;
    rows: number;
    orientation: 'lengthwise' | 'widthwise';
  } | null;
}

export interface PalletMetrics {
  casesPerPallet: number;
  totalUnits: number;
  totalWeightKg: number;
  totalWeightLbs: number;
  cubicFeet: number;
  cubicMeters: number;
  cubeUtilization: number;
  stackHeightIn: number;
  isOverweight: boolean;
  weightWarning: string | null;
}

/**
 * Calculate maximum number of cases (Ti) that can fit in one layer
 */
export function calculateMaxTi(
  boxLengthIn: number,
  boxWidthIn: number,
  palletLengthIn: number = PALLET_TYPES.US_STANDARD.lengthIn,
  palletWidthIn: number = PALLET_TYPES.US_STANDARD.widthIn
): { maxTi: number; optimalTi: number; arrangement: TiValidationResult['optimalArrangement'] } {
  if (!boxLengthIn || !boxWidthIn || boxLengthIn <= 0 || boxWidthIn <= 0) {
    return { maxTi: 0, optimalTi: 0, arrangement: null };
  }

  // Orientation 1: Box length along pallet length
  const cols1 = Math.floor(palletLengthIn / boxLengthIn);
  const rows1 = Math.floor(palletWidthIn / boxWidthIn);
  const fit1 = cols1 * rows1;

  // Orientation 2: Box width along pallet length (rotated 90°)
  const cols2 = Math.floor(palletLengthIn / boxWidthIn);
  const rows2 = Math.floor(palletWidthIn / boxLengthIn);
  const fit2 = cols2 * rows2;

  if (fit1 >= fit2) {
    return {
      maxTi: fit1,
      optimalTi: fit1,
      arrangement: { cols: cols1, rows: rows1, orientation: 'lengthwise' }
    };
  } else {
    return {
      maxTi: fit2,
      optimalTi: fit2,
      arrangement: { cols: cols2, rows: rows2, orientation: 'widthwise' }
    };
  }
}

/**
 * Validate Ti configuration
 */
export function validateTiConfiguration(
  ti: number,
  boxLengthIn: number,
  boxWidthIn: number,
  palletLengthIn: number = PALLET_TYPES.US_STANDARD.lengthIn,
  palletWidthIn: number = PALLET_TYPES.US_STANDARD.widthIn
): TiValidationResult {
  if (!boxLengthIn || !boxWidthIn) {
    return {
      isValid: true,
      maxTi: 0,
      optimalTi: 0,
      message: null,
      optimalArrangement: null,
    };
  }

  const { maxTi, optimalTi, arrangement } = calculateMaxTi(
    boxLengthIn,
    boxWidthIn,
    palletLengthIn,
    palletWidthIn
  );

  if (ti > maxTi) {
    return {
      isValid: false,
      maxTi,
      optimalTi,
      message: `Maximum ${maxTi} cases fit per layer. You entered ${ti}. Please reduce to ${maxTi} or less.`,
      optimalArrangement: arrangement,
    };
  }

  if (ti < optimalTi && ti > 0) {
    return {
      isValid: true,
      maxTi,
      optimalTi,
      message: `Optimal layout fits ${optimalTi} cases per layer. Current: ${ti} (${Math.round((ti / optimalTi) * 100)}% efficiency)`,
      optimalArrangement: arrangement,
    };
  }

  return {
    isValid: true,
    maxTi,
    optimalTi,
    message: null,
    optimalArrangement: arrangement,
  };
}

/**
 * Calculate overhang for each edge of the pallet
 */
export function calculateOverhang(
  ti: number,
  boxLengthIn: number,
  boxWidthIn: number,
  palletLengthIn: number = PALLET_TYPES.US_STANDARD.lengthIn,
  palletWidthIn: number = PALLET_TYPES.US_STANDARD.widthIn
): OverhangResult {
  if (!ti || !boxLengthIn || !boxWidthIn) {
    return { front: 0, back: 0, left: 0, right: 0, maxOverhang: 0, hasOverhang: false };
  }

  // Determine the best arrangement for given Ti
  const cols1 = Math.floor(palletLengthIn / boxLengthIn);
  const rows1 = Math.floor(palletWidthIn / boxWidthIn);
  const fit1 = cols1 * rows1;

  const cols2 = Math.floor(palletLengthIn / boxWidthIn);
  const rows2 = Math.floor(palletWidthIn / boxLengthIn);
  const fit2 = cols2 * rows2;

  let cols: number, rows: number, boxL: number, boxW: number;

  // Choose arrangement that can accommodate Ti
  if (fit1 >= ti || fit1 >= fit2) {
    // Calculate actual columns and rows needed for Ti
    const neededCols = Math.ceil(ti / rows1);
    cols = Math.min(neededCols, cols1);
    rows = Math.ceil(ti / cols);
    boxL = boxLengthIn;
    boxW = boxWidthIn;
  } else {
    const neededCols = Math.ceil(ti / rows2);
    cols = Math.min(neededCols, cols2);
    rows = Math.ceil(ti / cols);
    boxL = boxWidthIn;
    boxW = boxLengthIn;
  }

  // Calculate actual footprint of boxes
  const footprintLength = cols * boxL;
  const footprintWidth = rows * boxW;

  // Calculate overhang (positive = extends beyond pallet)
  const overhangLength = footprintLength - palletLengthIn;
  const overhangWidth = footprintWidth - palletWidthIn;

  // Distribute overhang evenly on both sides
  const front = Math.max(0, overhangWidth / 2);
  const back = Math.max(0, overhangWidth / 2);
  const left = Math.max(0, overhangLength / 2);
  const right = Math.max(0, overhangLength / 2);

  const maxOverhang = Math.max(front, back, left, right);

  return {
    front,
    back,
    left,
    right,
    maxOverhang,
    hasOverhang: maxOverhang > 0,
  };
}

/**
 * Get overhang severity level
 */
export function getOverhangSeverity(overhangInches: number): OverhangSeverity {
  if (overhangInches <= 0) return 'none';
  if (overhangInches < 1) return 'warning'; // Minor overhang < 1"
  return 'danger'; // Dangerous overhang >= 1"
}

/**
 * Get color class for overhang severity
 */
export function getOverhangColorClass(severity: OverhangSeverity): string {
  switch (severity) {
    case 'none':
      return 'text-green-600';
    case 'warning':
      return 'text-amber-600';
    case 'danger':
      return 'text-destructive';
  }
}

/**
 * Get background color class for overhang severity
 */
export function getOverhangBgClass(severity: OverhangSeverity): string {
  switch (severity) {
    case 'none':
      return 'bg-green-100 border-green-300';
    case 'warning':
      return 'bg-amber-100 border-amber-300';
    case 'danger':
      return 'bg-red-100 border-red-300';
  }
}

/**
 * Calculate total pallet weight
 */
export function calculateTotalWeight(
  ti: number,
  hi: number,
  caseWeightKg: number,
  palletWeightKg: number = STANDARD_PALLET_WEIGHT_KG
): { kg: number; lbs: number } {
  if (!ti || !hi || !caseWeightKg) {
    return { kg: 0, lbs: 0 };
  }
  const totalKg = (ti * hi * caseWeightKg) + palletWeightKg;
  return {
    kg: totalKg,
    lbs: totalKg * 2.20462,
  };
}

/**
 * Calculate cubic footage
 */
export function calculateCubicFeet(
  ti: number,
  hi: number,
  boxLengthIn: number,
  boxWidthIn: number,
  boxHeightIn: number
): number {
  if (!ti || !hi || !boxLengthIn || !boxWidthIn || !boxHeightIn) {
    return 0;
  }
  const volumeIn3 = ti * hi * boxLengthIn * boxWidthIn * boxHeightIn;
  return volumeIn3 / 1728; // Convert cubic inches to cubic feet
}

/**
 * Calculate cube utilization percentage
 */
export function calculateCubeUtilization(
  ti: number,
  hi: number,
  boxLengthIn: number,
  boxWidthIn: number,
  boxHeightIn: number,
  palletLengthIn: number = PALLET_TYPES.US_STANDARD.lengthIn,
  palletWidthIn: number = PALLET_TYPES.US_STANDARD.widthIn
): number {
  if (!ti || !hi || !boxLengthIn || !boxWidthIn || !boxHeightIn) {
    return 0;
  }

  // Calculate product volume
  const productVolume = ti * hi * boxLengthIn * boxWidthIn * boxHeightIn;

  // Calculate pallet volume (using stack height)
  const stackHeight = PALLET_HEIGHT_IN + (hi * boxHeightIn);
  const palletVolume = palletLengthIn * palletWidthIn * stackHeight;

  if (palletVolume === 0) return 0;

  return (productVolume / palletVolume) * 100;
}

/**
 * Calculate comprehensive pallet metrics
 */
export function calculatePalletMetrics(
  ti: number,
  hi: number,
  unitsPerCase: number,
  caseWeightKg: number,
  boxLengthIn: number,
  boxWidthIn: number,
  boxHeightIn: number,
  palletLengthIn: number = PALLET_TYPES.US_STANDARD.lengthIn,
  palletWidthIn: number = PALLET_TYPES.US_STANDARD.widthIn
): PalletMetrics | null {
  if (!ti || !hi) {
    return null;
  }

  const casesPerPallet = ti * hi;
  const totalUnits = casesPerPallet * unitsPerCase;
  const weight = calculateTotalWeight(ti, hi, caseWeightKg);
  const cubicFeet = calculateCubicFeet(ti, hi, boxLengthIn, boxWidthIn, boxHeightIn);
  const cubeUtilization = calculateCubeUtilization(
    ti, hi, boxLengthIn, boxWidthIn, boxHeightIn, palletLengthIn, palletWidthIn
  );
  const stackHeightIn = PALLET_HEIGHT_IN + (hi * boxHeightIn);

  // Check weight limits
  const isOverweight = weight.lbs > PALLET_WEIGHT_LIMITS.STANDARD;
  let weightWarning: string | null = null;
  
  if (weight.lbs > PALLET_WEIGHT_LIMITS.STANDARD) {
    weightWarning = `Exceeds standard pallet capacity (${PALLET_WEIGHT_LIMITS.STANDARD.toLocaleString()} lbs)`;
  }

  return {
    casesPerPallet,
    totalUnits,
    totalWeightKg: weight.kg,
    totalWeightLbs: weight.lbs,
    cubicFeet,
    cubicMeters: cubicFeet * 0.0283168,
    cubeUtilization,
    stackHeightIn,
    isOverweight,
    weightWarning,
  };
}

/**
 * Get height warning based on common clearance limits
 */
export function getHeightWarning(stackHeightIn: number): string | null {
  const DOORWAY_HEIGHT = 84; // Standard 7ft doorway
  const TRUCK_HEIGHT = 102; // Standard 53ft trailer interior height
  const RACK_HEIGHT_STD = 96; // Standard pallet rack height

  if (stackHeightIn > TRUCK_HEIGHT) {
    return `Exceeds truck interior height (${TRUCK_HEIGHT}")`;
  }
  if (stackHeightIn > RACK_HEIGHT_STD) {
    return `Exceeds standard rack height (${RACK_HEIGHT_STD}")`;
  }
  if (stackHeightIn > DOORWAY_HEIGHT) {
    return `Exceeds standard doorway (${DOORWAY_HEIGHT}")`;
  }
  return null;
}
