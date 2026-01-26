import { useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

interface PolicyTrainingRequirementsProps {
  policyId: string;
  requirements?: any;
  onChange?: (requirements: any) => void;
}

export function PolicyTrainingRequirements({
  policyId,
  requirements,
  onChange,
}: PolicyTrainingRequirementsProps) {
  const [trainingRequired, setTrainingRequired] = useState(requirements?.training_required || false);
  const [formData, setFormData] = useState({
    training_name: requirements?.training_name || '',
    training_description: requirements?.training_description || '',
    training_type: requirements?.training_type || 'Initial',
    training_duration_minutes: requirements?.training_duration_minutes || 30,
    refresher_frequency_months: requirements?.refresher_frequency_months || null,
    requires_quiz: requirements?.requires_quiz || false,
    minimum_passing_score: requirements?.minimum_passing_score || 80,
    required_for_all_employees: requirements?.required_for_all_employees || false,
  });

  const handleToggleTraining = (enabled: boolean) => {
    setTrainingRequired(enabled);
    onChange?.({ ...formData, training_required: enabled });
  };

  const handleUpdate = (key: string, value: any) => {
    const updated = { ...formData, [key]: value, training_required: trainingRequired };
    setFormData({ ...formData, [key]: value });
    onChange?.(updated);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            <CardTitle>Training Requirements</CardTitle>
          </div>
          <Switch
            checked={trainingRequired}
            onCheckedChange={handleToggleTraining}
          />
        </div>
        <CardDescription>
          Define training requirements for employees on this policy
        </CardDescription>
      </CardHeader>

      {trainingRequired && (
        <CardContent className="space-y-4">
          {/* Training Name */}
          <div className="space-y-2">
            <Label htmlFor="training_name">Training Name *</Label>
            <Input
              id="training_name"
              value={formData.training_name}
              onChange={(e) => handleUpdate('training_name', e.target.value)}
              placeholder="e.g., HACCP Fundamentals Training"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="training_description">Description</Label>
            <Textarea
              id="training_description"
              value={formData.training_description}
              onChange={(e) => handleUpdate('training_description', e.target.value)}
              placeholder="What will employees learn?"
              rows={3}
            />
          </div>

          {/* Training Type and Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="training_type">Training Type</Label>
              <Select
                value={formData.training_type}
                onValueChange={(val) => handleUpdate('training_type', val)}
              >
                <SelectTrigger id="training_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Initial">Initial (one-time)</SelectItem>
                  <SelectItem value="Refresher">Refresher (periodic)</SelectItem>
                  <SelectItem value="Annual">Annual</SelectItem>
                  <SelectItem value="Change-Triggered">Change-Triggered</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="training_duration_minutes">Duration (minutes)</Label>
              <Input
                id="training_duration_minutes"
                type="number"
                value={formData.training_duration_minutes}
                onChange={(e) => handleUpdate('training_duration_minutes', parseInt(e.target.value))}
              />
            </div>
          </div>

          {/* Refresher Frequency */}
          {(formData.training_type === 'Refresher' || formData.training_type === 'Annual') && (
            <div className="space-y-2">
              <Label htmlFor="refresher_frequency_months">Refresher Frequency</Label>
              <Select
                value={formData.refresher_frequency_months?.toString() || '12'}
                onValueChange={(val) => handleUpdate('refresher_frequency_months', parseInt(val))}
              >
                <SelectTrigger id="refresher_frequency_months">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">Every 3 months</SelectItem>
                  <SelectItem value="6">Every 6 months</SelectItem>
                  <SelectItem value="12">Annually</SelectItem>
                  <SelectItem value="24">Every 2 years</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Quiz/Assessment */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="requires_quiz"
                checked={formData.requires_quiz}
                onCheckedChange={(checked) => handleUpdate('requires_quiz', checked)}
              />
              <Label htmlFor="requires_quiz">Require quiz/assessment</Label>
            </div>

            {formData.requires_quiz && (
              <div className="ml-6 space-y-2">
                <Label htmlFor="minimum_passing_score">Minimum Passing Score (%)</Label>
                <Input
                  id="minimum_passing_score"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.minimum_passing_score}
                  onChange={(e) => handleUpdate('minimum_passing_score', parseInt(e.target.value))}
                />
              </div>
            )}
          </div>

          {/* Required For */}
          <div className="space-y-2">
            <Label>Required For</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="required_for_all_employees"
                checked={formData.required_for_all_employees}
                onCheckedChange={(checked) => handleUpdate('required_for_all_employees', checked)}
              />
              <Label htmlFor="required_for_all_employees">All Employees</Label>
            </div>
            {!formData.required_for_all_employees && (
              <p className="text-sm text-muted-foreground">
                Select specific job positions in advanced settings
              </p>
            )}
          </div>

          {/* Summary */}
          <div className="pt-4 border-t">
            <h4 className="font-medium mb-2">Training Summary</h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{formData.training_type}</Badge>
              <Badge variant="outline">{formData.training_duration_minutes} minutes</Badge>
              {formData.requires_quiz && (
                <Badge variant="outline">Quiz Required ({formData.minimum_passing_score}%)</Badge>
              )}
              {formData.refresher_frequency_months && (
                <Badge variant="outline">
                  Refresher every {formData.refresher_frequency_months} months
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
