import { useState } from 'react';
import { useTaskTemplates, useDeleteTaskTemplate, useDuplicateTaskTemplate, useGenerateRecurringTasks } from '@/hooks/useTaskTemplates';
import { useTaskCategories } from '@/hooks/useTasks';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, Edit, Trash2, Copy, Play, Clock, Shield, Calendar, 
  RotateCcw, Search, MoreHorizontal 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import TaskTemplateDialog from '@/components/tasks/TaskTemplateDialog';
import CreateTaskFromTemplateDialog from '@/components/tasks/CreateTaskFromTemplateDialog';
import type { TaskTemplate } from '@/types/tasks';

const TaskTemplates = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [createFromTemplateId, setCreateFromTemplateId] = useState<string | null>(null);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);
  
  const deleteTemplate = useDeleteTaskTemplate();
  const duplicateTemplate = useDuplicateTaskTemplate();
  const generateRecurring = useGenerateRecurringTasks();
  const { data: categories } = useTaskCategories();
  
  // Fetch based on active tab
  const { data: templates, isLoading } = useTaskTemplates({
    is_recurring: activeTab === 'recurring' ? true : undefined,
    is_food_safety: activeTab === 'food_safety' ? true : undefined,
  });
  
  // Filter by search
  const filteredTemplates = templates?.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.description?.toLowerCase().includes(search.toLowerCase())
  );
  
  const getRecurrenceLabel = (template: TaskTemplate) => {
    if (!template.is_recurring) return null;
    
    switch (template.recurrence_pattern) {
      case 'daily':
        return `Daily at ${template.recurrence_time || 'any time'}`;
      case 'weekly': {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const selectedDays = template.recurrence_days_of_week?.map((d: number) => days[d]).join(', ');
        return `Weekly on ${selectedDays || 'selected days'}`;
      }
      case 'monthly':
        return `Monthly on day ${template.recurrence_day_of_month}`;
      case 'shift_start':
        return 'At shift start';
      case 'shift_end':
        return 'At shift end';
      default:
        return template.recurrence_pattern;
    }
  };
  
  const handleEdit = (templateId: string) => {
    setEditingTemplateId(templateId);
    setShowTemplateDialog(true);
  };
  
  const handleDuplicate = async (templateId: string) => {
    await duplicateTemplate.mutateAsync(templateId);
  };
  
  const handleDelete = async () => {
    if (deleteTemplateId) {
      await deleteTemplate.mutateAsync(deleteTemplateId);
      setDeleteTemplateId(null);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Task Templates</h1>
          <p className="text-muted-foreground">Create reusable task templates and configure recurring tasks</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => generateRecurring.mutate()} disabled={generateRecurring.isPending}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Generate Recurring
          </Button>
          <Button onClick={() => { setEditingTemplateId(null); setShowTemplateDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>
      </div>
      
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Templates</TabsTrigger>
          <TabsTrigger value="recurring">
            <Clock className="h-4 w-4 mr-1" />
            Recurring
          </TabsTrigger>
          <TabsTrigger value="food_safety">
            <Shield className="h-4 w-4 mr-1" />
            Food Safety
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab}>
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 text-center text-muted-foreground">Loading templates...</div>
              ) : filteredTemplates?.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">No templates found</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Template Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Assignment</TableHead>
                      <TableHead>Requirements</TableHead>
                      <TableHead>Recurrence</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTemplates?.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{template.name}</span>
                              {template.is_food_safety && (
                                <Badge variant="destructive" className="text-xs">
                                  <Shield className="h-3 w-3 mr-1" />
                                  Food Safety
                                </Badge>
                              )}
                            </div>
                            {template.description && (
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {template.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {template.category && (
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: template.category.color }} 
                              />
                              <span className="text-sm">{template.category.name}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {template.default_assignee_type === 'specific' && 'Specific Employee'}
                            {template.default_assignee_type === 'role' && `Role: ${template.default_role}`}
                            {template.default_assignee_type === 'department' && 'Department'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            {template.requires_photo && <span title="Requires Photo">📷</span>}
                            {template.requires_signature && <span title="Requires Signature">✍️</span>}
                            {template.requires_notes && <span title="Requires Notes">📝</span>}
                            {template.checklist_items?.length > 0 && (
                              <span title={`${template.checklist_items.length} Checklist Items`}>
                                ☑️ {template.checklist_items.length}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {template.is_recurring ? (
                            <Badge variant="secondary" className="gap-1">
                              <Calendar className="h-3 w-3" />
                              {getRecurrenceLabel(template)}
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">One-time</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setCreateFromTemplateId(template.id)}>
                                <Play className="h-4 w-4 mr-2" />
                                Create Task
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(template.id)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDuplicate(template.id)}>
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => setDeleteTemplateId(template.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Food Safety Quick Templates */}
      {activeTab === 'food_safety' && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Common Food Safety Templates</CardTitle>
            <CardDescription>Quick-add common food safety verification tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: 'Temperature Log', icon: '🌡️', type: 'temperature_log' },
                { name: 'Cleaning Verification', icon: '🧹', type: 'cleaning_verification' },
                { name: 'Equipment Check', icon: '⚙️', type: 'equipment_check' },
                { name: 'Sanitation Inspection', icon: '✨', type: 'sanitation_inspection' },
              ].map((item) => (
                <Button
                  key={item.type}
                  variant="outline"
                  className="h-auto py-4 flex flex-col gap-2"
                  onClick={() => {
                    // Pre-fill template dialog with food safety defaults
                    setEditingTemplateId(null);
                    setShowTemplateDialog(true);
                    // Note: In a full implementation, you'd pass default values to the dialog
                  }}
                >
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-sm">{item.name}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Dialogs */}
      <TaskTemplateDialog
        open={showTemplateDialog}
        onOpenChange={setShowTemplateDialog}
        templateId={editingTemplateId}
      />
      
      {createFromTemplateId && (
        <CreateTaskFromTemplateDialog
          open={!!createFromTemplateId}
          onOpenChange={(open) => !open && setCreateFromTemplateId(null)}
          templateId={createFromTemplateId}
        />
      )}
      
      <AlertDialog open={!!deleteTemplateId} onOpenChange={(open) => !open && setDeleteTemplateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate the template. It will no longer generate recurring tasks.
              Existing tasks created from this template will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TaskTemplates;
