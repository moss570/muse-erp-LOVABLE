import { useState } from 'react';
import { Plus, Trash2, Save, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { FiveWhysEntry } from '@/types/capa';

interface FiveWhysAnalysisProps {
  data: FiveWhysEntry[];
  onChange: (data: FiveWhysEntry[]) => void;
  onSave?: () => void;
  isSaving?: boolean;
  readOnly?: boolean;
}

const DEFAULT_QUESTIONS = [
  'Why did this happen?',
  'Why did that occur?',
  'Why was that the case?',
  'Why was that possible?',
  'Why did that lead to the problem?',
];

export function FiveWhysAnalysis({ 
  data, 
  onChange, 
  onSave,
  isSaving,
  readOnly = false 
}: FiveWhysAnalysisProps) {
  const ensureMinimumEntries = () => {
    if (data.length === 0) {
      onChange([
        { level: 1, question: DEFAULT_QUESTIONS[0], answer: '' },
      ]);
    }
  };

  const addLevel = () => {
    const nextLevel = data.length + 1;
    if (nextLevel <= 7) {
      onChange([
        ...data,
        { 
          level: nextLevel, 
          question: DEFAULT_QUESTIONS[Math.min(nextLevel - 1, DEFAULT_QUESTIONS.length - 1)], 
          answer: '' 
        },
      ]);
    }
  };

  const removeLevel = (level: number) => {
    if (data.length > 1) {
      onChange(
        data
          .filter(entry => entry.level !== level)
          .map((entry, idx) => ({ ...entry, level: idx + 1 }))
      );
    }
  };

  const updateEntry = (level: number, field: 'question' | 'answer', value: string) => {
    onChange(
      data.map(entry => 
        entry.level === level ? { ...entry, [field]: value } : entry
      )
    );
  };

  // Initialize with at least one entry
  if (data.length === 0 && !readOnly) {
    ensureMinimumEntries();
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">5 Whys Analysis</CardTitle>
        <CardDescription>
          Drill down to the root cause by asking "why" repeatedly
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.map((entry, index) => (
          <div key={entry.level} className="relative">
            {/* Connector line */}
            {index > 0 && (
              <div className="absolute left-4 -top-4 w-0.5 h-4 bg-border" />
            )}
            
            <div className={cn(
              'rounded-lg border p-4 space-y-3',
              entry.answer ? 'border-primary/50 bg-primary/5' : 'border-muted'
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold',
                    entry.answer 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                  )}>
                    {entry.level}
                  </div>
                  <Label className="font-medium">Why #{entry.level}</Label>
                </div>
                {!readOnly && data.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeLevel(entry.level)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Input
                  value={entry.question}
                  onChange={(e) => updateEntry(entry.level, 'question', e.target.value)}
                  placeholder="Why...?"
                  disabled={readOnly}
                  className="font-medium"
                />
                <Textarea
                  value={entry.answer}
                  onChange={(e) => updateEntry(entry.level, 'answer', e.target.value)}
                  placeholder="Because..."
                  disabled={readOnly}
                  className="min-h-[80px]"
                />
              </div>
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between pt-2">
          {!readOnly && data.length < 7 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addLevel}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Why #{data.length + 1}
            </Button>
          )}
          {!readOnly && data.length >= 7 && (
            <p className="text-sm text-muted-foreground">
              Maximum 7 levels reached
            </p>
          )}
          
          {onSave && !readOnly && (
            <Button
              type="button"
              size="sm"
              onClick={onSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Save Analysis
            </Button>
          )}
        </div>

        {/* Root cause summary */}
        {data.length >= 3 && data[data.length - 1]?.answer && (
          <div className="mt-4 p-4 rounded-lg bg-amber-50 border border-amber-200">
            <Label className="text-amber-800 font-medium">Identified Root Cause</Label>
            <p className="mt-1 text-amber-900">
              {data[data.length - 1].answer}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
