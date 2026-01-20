import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface ChecklistItem {
  id: string;
  label: string;
  required: boolean;
}

interface ChecklistBuilderProps {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
}

const ChecklistBuilder = ({ items, onChange }: ChecklistBuilderProps) => {
  const [newItemLabel, setNewItemLabel] = useState('');
  
  const addItem = () => {
    if (!newItemLabel.trim()) return;
    onChange([
      ...items,
      { id: uuidv4(), label: newItemLabel.trim(), required: false }
    ]);
    setNewItemLabel('');
  };
  
  const removeItem = (id: string) => {
    onChange(items.filter(item => item.id !== id));
  };
  
  const updateItem = (id: string, updates: Partial<ChecklistItem>) => {
    onChange(items.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };
  
  return (
    <div className="space-y-3">
      {/* Existing items */}
      {items.map((item, index) => (
        <div key={item.id} className="flex items-center gap-2 p-2 border rounded-lg bg-muted/30">
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
          <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
          <Input
            value={item.label}
            onChange={(e) => updateItem(item.id, { label: e.target.value })}
            className="flex-1"
          />
          <div className="flex items-center gap-2">
            <Label htmlFor={`req-${item.id}`} className="text-xs text-muted-foreground">Required</Label>
            <Switch
              id={`req-${item.id}`}
              checked={item.required}
              onCheckedChange={(checked) => updateItem(item.id, { required: checked })}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={() => removeItem(item.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      
      {/* Add new item */}
      <div className="flex gap-2">
        <Input
          placeholder="Add checklist item..."
          value={newItemLabel}
          onChange={(e) => setNewItemLabel(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addItem();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={addItem}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ChecklistBuilder;
