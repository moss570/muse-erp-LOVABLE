import { useState } from 'react';
import { Award, Save, Loader2, Scale, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

import { GRADE_CONFIG } from '@/types/supplier-scoring';

export default function SupplierScoringSettings() {
  const [saving, setSaving] = useState(false);

  const [weights, setWeights] = useState({
    quality: 40,
    delivery: 25,
    price: 15,
    service: 10,
    documentation: 10,
  });

  const [thresholds, setThresholds] = useState({
    grade_a_min: 90,
    grade_b_min: 75,
    grade_c_min: 60,
    grade_d_min: 40,
  });

  const [settings, setSettings] = useState({
    scoring_period_months: 12,
    auto_flag_below_grade: 'D',
    auto_require_improvement_plan: true,
  });

  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
  const weightsValid = totalWeight === 100;

  const handleWeightChange = (key: keyof typeof weights, value: number) => {
    setWeights((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!weightsValid) {
      toast.error('Weights must total 100%');
      return;
    }
    setSaving(true);
    // Mock save - in real implementation, call mutation
    await new Promise((resolve) => setTimeout(resolve, 500));
    toast.success('Configuration saved');
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Award className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Supplier Scoring Configuration</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Configure how supplier performance is measured and graded
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || !weightsValid}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          <Save className="h-4 w-4 mr-2" />
          Save Configuration
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Weight Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-4 w-4" />
              Score Weights
            </CardTitle>
            <CardDescription>
              Adjust the importance of each performance category (must total 100%)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!weightsValid && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Weights must total 100%. Current total: {totalWeight}%
                </AlertDescription>
              </Alert>
            )}

            <WeightSlider
              label="Quality"
              description="Product quality, defect rates, test results"
              value={weights.quality}
              onChange={(v) => handleWeightChange('quality', v)}
              color="bg-green-500"
            />
            <WeightSlider
              label="Delivery"
              description="On-time delivery, lead time accuracy"
              value={weights.delivery}
              onChange={(v) => handleWeightChange('delivery', v)}
              color="bg-blue-500"
            />
            <WeightSlider
              label="Price"
              description="Price competitiveness, cost stability"
              value={weights.price}
              onChange={(v) => handleWeightChange('price', v)}
              color="bg-purple-500"
            />
            <WeightSlider
              label="Service"
              description="Responsiveness, communication, issue resolution"
              value={weights.service}
              onChange={(v) => handleWeightChange('service', v)}
              color="bg-amber-500"
            />
            <WeightSlider
              label="Documentation"
              description="COAs, certifications, compliance documents"
              value={weights.documentation}
              onChange={(v) => handleWeightChange('documentation', v)}
              color="bg-cyan-500"
            />

            <div className="flex items-center justify-between pt-4 border-t">
              <span className="font-medium">Total</span>
              <span
                className={cn(
                  'text-lg font-bold',
                  weightsValid ? 'text-green-600' : 'text-red-600'
                )}
              >
                {totalWeight}%
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Grade Thresholds */}
          <Card>
            <CardHeader>
              <CardTitle>Grade Thresholds</CardTitle>
              <CardDescription>
                Set minimum scores for each grade level
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(['A', 'B', 'C', 'D'] as const).map((grade) => {
                const key = `grade_${grade.toLowerCase()}_min` as keyof typeof thresholds;
                const gradeConfig = GRADE_CONFIG[grade];

                return (
                  <div key={grade} className="flex items-center gap-4">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg',
                        gradeConfig.bgColor,
                        gradeConfig.color
                      )}
                    >
                      {grade}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{gradeConfig.label}</p>
                      <p className="text-xs text-muted-foreground">{gradeConfig.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">≥</span>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={thresholds[key]}
                        onChange={(e) =>
                          setThresholds((prev) => ({
                            ...prev,
                            [key]: parseInt(e.target.value) || 0,
                          }))
                        }
                        className="w-20"
                      />
                    </div>
                  </div>
                );
              })}

              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg',
                    GRADE_CONFIG.F.bgColor,
                    GRADE_CONFIG.F.color
                  )}
                >
                  F
                </div>
                <div className="flex-1">
                  <p className="font-medium">{GRADE_CONFIG.F.label}</p>
                  <p className="text-xs text-muted-foreground">{GRADE_CONFIG.F.description}</p>
                </div>
                <span className="text-muted-foreground">
                  Below {thresholds.grade_d_min}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Scoring Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Scoring Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Scoring Period</Label>
                <Select
                  value={settings.scoring_period_months.toString()}
                  onValueChange={(v) =>
                    setSettings((prev) => ({
                      ...prev,
                      scoring_period_months: parseInt(v),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 months</SelectItem>
                    <SelectItem value="6">6 months</SelectItem>
                    <SelectItem value="12">12 months</SelectItem>
                    <SelectItem value="24">24 months</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Data from this period is used to calculate scores
                </p>
              </div>

              <div className="space-y-2">
                <Label>Auto-flag Below Grade</Label>
                <Select
                  value={settings.auto_flag_below_grade}
                  onValueChange={(v) =>
                    setSettings((prev) => ({
                      ...prev,
                      auto_flag_below_grade: v,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="C">Grade C or below</SelectItem>
                    <SelectItem value="D">Grade D or below</SelectItem>
                    <SelectItem value="F">Grade F only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Require Improvement Plan</Label>
                  <p className="text-xs text-muted-foreground">
                    Auto-flag suppliers for improvement plans
                  </p>
                </div>
                <Switch
                  checked={settings.auto_require_improvement_plan}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({
                      ...prev,
                      auto_require_improvement_plan: checked,
                    }))
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Weight Slider Component
function WeightSlider({
  label,
  description,
  value,
  onChange,
  color,
}: {
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
  color: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <Label className="font-medium">{label}</Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min={0}
            max={100}
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value) || 0)}
            className="w-16 text-right"
          />
          <span className="text-muted-foreground">%</span>
        </div>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        max={100}
        step={5}
        className={cn('w-full', `[&>span>span]:${color}`)}
      />
    </div>
  );
}
