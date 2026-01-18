import { useState } from 'react';
import { Plus, Trash2, Save, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { FishboneCategory } from '@/types/capa';

interface FishboneDiagramProps {
  data: { categories: FishboneCategory[] };
  onChange: (data: { categories: FishboneCategory[] }) => void;
  problem?: string;
  onSave?: () => void;
  isSaving?: boolean;
  readOnly?: boolean;
}

const DEFAULT_CATEGORIES: FishboneCategory[] = [
  { name: 'Man (People)', causes: [] },
  { name: 'Machine (Equipment)', causes: [] },
  { name: 'Method (Process)', causes: [] },
  { name: 'Material', causes: [] },
  { name: 'Measurement', causes: [] },
  { name: 'Mother Nature (Environment)', causes: [] },
];

const CATEGORY_COLORS: Record<string, string> = {
  'Man (People)': 'bg-blue-100 text-blue-800 border-blue-300',
  'Machine (Equipment)': 'bg-gray-100 text-gray-800 border-gray-300',
  'Method (Process)': 'bg-purple-100 text-purple-800 border-purple-300',
  'Material': 'bg-amber-100 text-amber-800 border-amber-300',
  'Measurement': 'bg-green-100 text-green-800 border-green-300',
  'Mother Nature (Environment)': 'bg-cyan-100 text-cyan-800 border-cyan-300',
};

export function FishboneDiagram({ 
  data, 
  onChange, 
  problem = 'Problem',
  onSave,
  isSaving,
  readOnly = false 
}: FishboneDiagramProps) {
  const [newCause, setNewCause] = useState<Record<string, string>>({});

  // Initialize with default categories if empty
  if (data.categories.length === 0 && !readOnly) {
    onChange({ categories: DEFAULT_CATEGORIES });
    return null;
  }

  const addCause = (categoryName: string) => {
    const cause = newCause[categoryName]?.trim();
    if (!cause) return;

    onChange({
      categories: data.categories.map(cat =>
        cat.name === categoryName
          ? { ...cat, causes: [...cat.causes, cause] }
          : cat
      ),
    });
    setNewCause({ ...newCause, [categoryName]: '' });
  };

  const removeCause = (categoryName: string, causeIndex: number) => {
    onChange({
      categories: data.categories.map(cat =>
        cat.name === categoryName
          ? { ...cat, causes: cat.causes.filter((_, i) => i !== causeIndex) }
          : cat
      ),
    });
  };

  const totalCauses = data.categories.reduce((sum, cat) => sum + cat.causes.length, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Fishbone (Ishikawa) Diagram</CardTitle>
        <CardDescription>
          Identify potential causes across the 6M categories
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Visual fishbone representation */}
        <div className="relative mb-6 p-4 bg-muted/50 rounded-lg">
          {/* Problem head */}
          <div className="flex items-center justify-end mb-4">
            <div className="flex-1 h-1 bg-primary/30" />
            <div className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg font-medium text-sm">
              {problem}
            </div>
          </div>

          {/* Categories in grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {data.categories.map((category) => (
              <div
                key={category.name}
                className={cn(
                  'p-3 rounded-lg border',
                  CATEGORY_COLORS[category.name] || 'bg-muted border-border'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <Label className="font-medium text-sm">{category.name}</Label>
                  <Badge variant="outline" className="text-xs">
                    {category.causes.length}
                  </Badge>
                </div>

                {/* Causes */}
                <div className="space-y-1 mb-2">
                  {category.causes.map((cause, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between group text-sm bg-background/50 px-2 py-1 rounded"
                    >
                      <span className="truncate">{cause}</span>
                      {!readOnly && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeCause(category.name, idx)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add new cause */}
                {!readOnly && (
                  <div className="flex gap-1">
                    <Input
                      value={newCause[category.name] || ''}
                      onChange={(e) => setNewCause({ ...newCause, [category.name]: e.target.value })}
                      placeholder="Add cause..."
                      className="h-7 text-xs"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addCause(category.name);
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => addCause(category.name)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Summary and save */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {totalCauses} potential cause{totalCauses !== 1 ? 's' : ''} identified
          </p>
          
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
      </CardContent>
    </Card>
  );
}
