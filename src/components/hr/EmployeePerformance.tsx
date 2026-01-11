import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Plus, GraduationCap, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface EmployeePerformanceProps {
  employeeId: string;
}

const TRAINING_TYPES = [
  { value: 'sop', label: 'SOP Training' },
  { value: 'safety', label: 'Safety Training' },
  { value: 'food_safety', label: 'Food Safety' },
  { value: 'equipment', label: 'Equipment Training' },
  { value: 'certification', label: 'Certification' },
  { value: 'other', label: 'Other' },
];

const DISCIPLINE_TYPES = [
  { value: 'verbal_warning', label: 'Verbal Warning' },
  { value: 'written_warning', label: 'Written Warning' },
  { value: 'final_warning', label: 'Final Warning' },
  { value: 'suspension', label: 'Suspension' },
  { value: 'termination', label: 'Termination' },
];

const DISCIPLINE_CATEGORIES = [
  { value: 'attendance', label: 'Attendance' },
  { value: 'performance', label: 'Performance' },
  { value: 'conduct', label: 'Conduct' },
  { value: 'safety', label: 'Safety Violation' },
  { value: 'policy_violation', label: 'Policy Violation' },
  { value: 'other', label: 'Other' },
];

export function EmployeePerformance({ employeeId }: EmployeePerformanceProps) {
  const [isTrainingDialogOpen, setIsTrainingDialogOpen] = useState(false);
  const [isDisciplineDialogOpen, setIsDisciplineDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Training form state
  const [trainingName, setTrainingName] = useState('');
  const [trainingType, setTrainingType] = useState('');
  const [trainingDate, setTrainingDate] = useState('');
  const [trainingNotes, setTrainingNotes] = useState('');

  // Discipline form state
  const [disciplineType, setDisciplineType] = useState('');
  const [disciplineCategory, setDisciplineCategory] = useState('');
  const [incidentDate, setIncidentDate] = useState('');
  const [disciplineDescription, setDisciplineDescription] = useState('');
  const [actionTaken, setActionTaken] = useState('');

  const { data: training } = useQuery({
    queryKey: ['employee-training', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_training')
        .select('*')
        .eq('employee_id', employeeId)
        .order('training_date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: discipline } = useQuery({
    queryKey: ['employee-discipline', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_discipline')
        .select('*')
        .eq('employee_id', employeeId)
        .order('incident_date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const createTraining = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('employee_training')
        .insert({
          employee_id: employeeId,
          training_name: trainingName,
          training_type: trainingType,
          training_date: trainingDate,
          notes: trainingNotes || null,
          status: 'scheduled',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-training', employeeId] });
      toast({ title: 'Training record added' });
      setIsTrainingDialogOpen(false);
      resetTrainingForm();
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const createDiscipline = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('employee_discipline')
        .insert({
          employee_id: employeeId,
          discipline_type: disciplineType,
          category: disciplineCategory,
          incident_date: incidentDate,
          description: disciplineDescription,
          action_taken: actionTaken || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-discipline', employeeId] });
      toast({ title: 'Discipline record added' });
      setIsDisciplineDialogOpen(false);
      resetDisciplineForm();
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const resetTrainingForm = () => {
    setTrainingName('');
    setTrainingType('');
    setTrainingDate('');
    setTrainingNotes('');
  };

  const resetDisciplineForm = () => {
    setDisciplineType('');
    setDisciplineCategory('');
    setIncidentDate('');
    setDisciplineDescription('');
    setActionTaken('');
  };

  const getTrainingStatusBadge = (status: string | null) => {
    const styles: Record<string, { className: string; icon: React.ReactNode }> = {
      scheduled: { className: 'bg-blue-100 text-blue-800', icon: <Clock className="h-3 w-3" /> },
      in_progress: { className: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-3 w-3" /> },
      completed: { className: 'bg-green-100 text-green-800', icon: <CheckCircle2 className="h-3 w-3" /> },
      failed: { className: 'bg-red-100 text-red-800', icon: <AlertTriangle className="h-3 w-3" /> },
      expired: { className: 'bg-gray-100 text-gray-800', icon: <AlertTriangle className="h-3 w-3" /> },
    };
    
    const style = styles[status || 'scheduled'] || styles.scheduled;
    
    return (
      <Badge variant="outline" className={`gap-1 ${style.className}`}>
        {style.icon}
        {(status || 'scheduled').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    );
  };

  const getDisciplineTypeBadge = (type: string) => {
    const severity: Record<string, string> = {
      verbal_warning: 'bg-yellow-100 text-yellow-800',
      written_warning: 'bg-orange-100 text-orange-800',
      final_warning: 'bg-red-100 text-red-800',
      suspension: 'bg-red-200 text-red-900',
      termination: 'bg-red-300 text-red-950',
    };
    
    return (
      <Badge variant="outline" className={severity[type] || 'bg-gray-100 text-gray-800'}>
        {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    );
  };

  return (
    <Tabs defaultValue="training" className="w-full">
      <TabsList>
        <TabsTrigger value="training">Training & SOPs</TabsTrigger>
        <TabsTrigger value="discipline">Progressive Discipline</TabsTrigger>
      </TabsList>

      <TabsContent value="training" className="mt-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Training Records</CardTitle>
            <Button onClick={() => setIsTrainingDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Training
            </Button>
          </CardHeader>
          <CardContent>
            {training && training.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Training</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Expiry</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {training.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{t.training_name}</p>
                            {t.notes && (
                              <p className="text-xs text-muted-foreground">{t.notes}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {TRAINING_TYPES.find(type => type.value === t.training_type)?.label || t.training_type}
                      </TableCell>
                      <TableCell>
                        {format(new Date(t.training_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>{getTrainingStatusBadge(t.status)}</TableCell>
                      <TableCell>
                        {t.score != null ? `${t.score}%` : '-'}
                      </TableCell>
                      <TableCell>
                        {t.expiry_date 
                          ? format(new Date(t.expiry_date), 'MMM d, yyyy')
                          : 'No expiry'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <GraduationCap className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No training records yet</p>
                <p className="text-sm">Track SOP training, certifications, and safety training</p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="discipline" className="mt-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Discipline Records</CardTitle>
            <Button onClick={() => setIsDisciplineDialogOpen(true)} variant="destructive">
              <Plus className="h-4 w-4 mr-2" />
              Add Record
            </Button>
          </CardHeader>
          <CardContent>
            {discipline && discipline.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {discipline.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        {format(new Date(d.incident_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>{getDisciplineTypeBadge(d.discipline_type)}</TableCell>
                      <TableCell>
                        {DISCIPLINE_CATEGORIES.find(c => c.value === d.category)?.label || d.category}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        {d.description}
                      </TableCell>
                      <TableCell>
                        {d.is_closed ? (
                          <Badge variant="outline" className="bg-green-100 text-green-800">Closed</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Open</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-30 text-green-500" />
                <p>No discipline records</p>
                <p className="text-sm">This employee has a clean record</p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Training Dialog */}
      <Dialog open={isTrainingDialogOpen} onOpenChange={setIsTrainingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Training Record</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Training Name *</Label>
              <Input
                value={trainingName}
                onChange={(e) => setTrainingName(e.target.value)}
                placeholder="e.g., Food Safety Basics"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select value={trainingType} onValueChange={setTrainingType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRAINING_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Training Date *</Label>
                <Input
                  type="date"
                  value={trainingDate}
                  onChange={(e) => setTrainingDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={trainingNotes}
                onChange={(e) => setTrainingNotes(e.target.value)}
                placeholder="Additional notes"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsTrainingDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => createTraining.mutate()}
                disabled={!trainingName || !trainingType || !trainingDate || createTraining.isPending}
              >
                Add Training
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Discipline Dialog */}
      <Dialog open={isDisciplineDialogOpen} onOpenChange={setIsDisciplineDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Discipline Record</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select value={disciplineType} onValueChange={setDisciplineType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DISCIPLINE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={disciplineCategory} onValueChange={setDisciplineCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {DISCIPLINE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Incident Date *</Label>
              <Input
                type="date"
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                value={disciplineDescription}
                onChange={(e) => setDisciplineDescription(e.target.value)}
                placeholder="Describe the incident"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Action Taken</Label>
              <Textarea
                value={actionTaken}
                onChange={(e) => setActionTaken(e.target.value)}
                placeholder="What action was taken?"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsDisciplineDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={() => createDiscipline.mutate()}
                disabled={!disciplineType || !disciplineCategory || !incidentDate || !disciplineDescription || createDiscipline.isPending}
              >
                Add Record
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
