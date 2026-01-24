import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useShiftTemplates } from '@/hooks/useScheduleFeatures';
import { useJobPositions } from '@/hooks/useEmployees';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Clock } from 'lucide-react';

interface ShiftTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate?: (template: any) => void;
  canEdit?: boolean;
}

export function ShiftTemplateDialog({ open, onOpenChange, onSelectTemplate, canEdit = true }: ShiftTemplateDialogProps) {
  const { templates, createTemplate, deleteTemplate } = useShiftTemplates();
  const isFieldsDisabled = !canEdit;
  const { positions } = useJobPositions();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_time: '09:00',
    end_time: '17:00',
    break_minutes: 30,
    department_id: '',
    job_position_id: '',
    color: '#3b82f6',
  });

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createTemplate.mutateAsync({
      name: formData.name,
      description: formData.description || null,
      start_time: formData.start_time,
      end_time: formData.end_time,
      break_minutes: formData.break_minutes,
      department_id: formData.department_id || null,
      job_position_id: formData.job_position_id || null,
      color: formData.color || null,
    });
    setShowForm(false);
    setFormData({
      name: '',
      description: '',
      start_time: '09:00',
      end_time: '17:00',
      break_minutes: 30,
      department_id: '',
      job_position_id: '',
      color: '#3b82f6',
    });
  };

  const calculateHours = (start: string, end: string, breakMins: number) => {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    const totalMins = (endH * 60 + endM) - (startH * 60 + startM) - breakMins;
    return (totalMins / 60).toFixed(1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Shift Templates</DialogTitle>
        </DialogHeader>

        {!showForm ? (
          <div className="space-y-4">
            <Button onClick={() => setShowForm(true)} className="w-full" disabled={isFieldsDisabled}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Template
            </Button>

            {templates.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No templates yet. Create one to save time when scheduling.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow 
                      key={template.id}
                      className={onSelectTemplate ? 'cursor-pointer hover:bg-muted/50' : ''}
                      onClick={() => onSelectTemplate?.(template)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: template.color || '#3b82f6' }}
                          />
                          <div>
                            <div className="font-medium">{template.name}</div>
                            {template.description && (
                              <div className="text-xs text-muted-foreground">{template.description}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {template.start_time?.slice(0, 5)} - {template.end_time?.slice(0, 5)}
                      </TableCell>
                      <TableCell>
                        {calculateHours(
                          template.start_time || '00:00',
                          template.end_time || '00:00',
                          template.break_minutes || 0
                        )}h
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isFieldsDisabled}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTemplate.mutate(template.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Morning Shift"
                  required
                  disabled={isFieldsDisabled}
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                  rows={2}
                  disabled={isFieldsDisabled}
                />
              </div>

              <div>
                <Label htmlFor="start_time">Start Time *</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  required
                  disabled={isFieldsDisabled}
                />
              </div>

              <div>
                <Label htmlFor="end_time">End Time *</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  required
                  disabled={isFieldsDisabled}
                />
              </div>

              <div>
                <Label htmlFor="break_minutes">Break (minutes)</Label>
                <Input
                  id="break_minutes"
                  type="number"
                  value={formData.break_minutes}
                  onChange={(e) => setFormData({ ...formData, break_minutes: parseInt(e.target.value) || 0 })}
                  min={0}
                  disabled={isFieldsDisabled}
                />
              </div>

              <div>
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="h-10"
                  disabled={isFieldsDisabled}
                />
              </div>

              <div>
                <Label htmlFor="department_id">Department</Label>
                <Select
                  value={formData.department_id}
                  onValueChange={(value) => setFormData({ ...formData, department_id: value })}
                  disabled={isFieldsDisabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments?.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="job_position_id">Position</Label>
                <Select
                  value={formData.job_position_id}
                  onValueChange={(value) => setFormData({ ...formData, job_position_id: value })}
                  disabled={isFieldsDisabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    {positions?.map((pos) => (
                      <SelectItem key={pos.id} value={pos.id}>
                        {pos.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                Total hours: {calculateHours(formData.start_time, formData.end_time, formData.break_minutes)}
              </span>
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTemplate.isPending || isFieldsDisabled}>
                {createTemplate.isPending ? 'Creating...' : 'Create Template'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
