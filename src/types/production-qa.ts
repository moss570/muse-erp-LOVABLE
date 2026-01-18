export type ProductionFailureCategory = 
  | 'temperature'
  | 'overrun'
  | 'weight'
  | 'appearance'
  | 'texture'
  | 'flavor'
  | 'contamination'
  | 'micro'
  | 'packaging'
  | 'labeling'
  | 'equipment'
  | 'process'
  | 'ingredient'
  | 'other';

export interface ProductionQAFailureData {
  production_lot_id: string;
  lot_number: string;
  test_id?: string;
  test_name?: string;
  
  // Failure details
  failure_category: ProductionFailureCategory;
  failure_reason: string;
  
  // Product info
  product_id: string;
  product_name: string;
  product_sku: string;
  
  // Production context
  production_date: string;
  line_id?: string;
  line_name?: string;
  machine_id?: string;
  machine_name?: string;
  operator_id?: string;
  operator_name?: string;
  
  // Test results (if from a specific test)
  test_type?: string;
  expected_value?: string;
  actual_value?: string;
  unit_of_measure?: string;
  
  // Batch quantities
  batch_size?: number;
  quantity_affected?: number;
  quantity_on_hold?: number;
  
  // Related materials (for ingredient issues)
  ingredient_lot_numbers?: string[];
  supplier_ids?: string[];
}

export interface ProductionFailureCategoryConfig {
  label: string;
  defaultSeverity: 'minor' | 'major' | 'critical';
  defaultCapaType: string;
  icon: string;
  description: string;
}

export const PRODUCTION_FAILURE_CONFIG: Record<ProductionFailureCategory, ProductionFailureCategoryConfig> = {
  temperature: {
    label: 'Temperature Deviation',
    defaultSeverity: 'major',
    defaultCapaType: 'process',
    icon: 'Thermometer',
    description: 'Product temperature outside acceptable range during production',
  },
  overrun: {
    label: 'Overrun Out of Spec',
    defaultSeverity: 'minor',
    defaultCapaType: 'process',
    icon: 'Wind',
    description: 'Air incorporation (overrun) not within specification',
  },
  weight: {
    label: 'Weight/Fill Variance',
    defaultSeverity: 'minor',
    defaultCapaType: 'equipment',
    icon: 'Scale',
    description: 'Container fill weight outside acceptable tolerance',
  },
  appearance: {
    label: 'Appearance Defect',
    defaultSeverity: 'minor',
    defaultCapaType: 'product',
    icon: 'Eye',
    description: 'Visual defects in color, separation, ice crystals, etc.',
  },
  texture: {
    label: 'Texture/Consistency Issue',
    defaultSeverity: 'major',
    defaultCapaType: 'process',
    icon: 'Layers',
    description: 'Product texture or consistency not meeting standards',
  },
  flavor: {
    label: 'Flavor/Taste Defect',
    defaultSeverity: 'major',
    defaultCapaType: 'product',
    icon: 'Cherry',
    description: 'Off-flavors, incorrect flavor profile, or taste defects',
  },
  contamination: {
    label: 'Contamination/Foreign Material',
    defaultSeverity: 'critical',
    defaultCapaType: 'process',
    icon: 'AlertTriangle',
    description: 'Foreign material, allergen cross-contact, or contamination detected',
  },
  micro: {
    label: 'Microbiological Failure',
    defaultSeverity: 'critical',
    defaultCapaType: 'process',
    icon: 'Bug',
    description: 'Failed microbiological testing (coliform, listeria, salmonella, etc.)',
  },
  packaging: {
    label: 'Packaging Defect',
    defaultSeverity: 'minor',
    defaultCapaType: 'equipment',
    icon: 'Package',
    description: 'Damaged containers, seal failures, or packaging issues',
  },
  labeling: {
    label: 'Labeling Error',
    defaultSeverity: 'minor',
    defaultCapaType: 'process',
    icon: 'Tag',
    description: 'Incorrect labels, missing allergen info, or labeling mistakes',
  },
  equipment: {
    label: 'Equipment Malfunction',
    defaultSeverity: 'major',
    defaultCapaType: 'equipment',
    icon: 'Wrench',
    description: 'Equipment failure affecting product quality',
  },
  process: {
    label: 'Process Deviation',
    defaultSeverity: 'major',
    defaultCapaType: 'process',
    icon: 'GitBranch',
    description: 'Deviation from standard operating procedures',
  },
  ingredient: {
    label: 'Ingredient Issue',
    defaultSeverity: 'major',
    defaultCapaType: 'material',
    icon: 'Beaker',
    description: 'Problem with raw material or ingredient quality',
  },
  other: {
    label: 'Other',
    defaultSeverity: 'minor',
    defaultCapaType: 'product',
    icon: 'MoreHorizontal',
    description: 'Other issue not covered by standard categories',
  },
};
