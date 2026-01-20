import { useState } from 'react';
import { useHRDocumentTemplates, usePendingHRDocuments, useAssignHRDocument, useCreateHRDocumentTemplate, HRDocumentTemplate } from '@/hooks/useHRDocuments';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, Plus, Send, Users, Clock, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

const HRDocuments = () => {
  const [activeTab, setActiveTab] = useState('templates');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState<string | null>(null);
  
  const { data: templates } = useHRDocumentTemplates();
  const { data: pendingDocs } = usePendingHRDocuments();
  
  // Stats
  const stats = {
    totalTemplates: templates?.length || 0,
    pendingSignatures: pendingDocs?.length || 0,
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            HR Documents
          </h1>
          <p className="text-muted-foreground">Manage document templates and track signatures</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />New Template
        </Button>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <p className="text-3xl font-bold">{stats.totalTemplates}</p>
                <p className="text-sm text-muted-foreground">Document Templates</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={stats.pendingSignatures > 0 ? "border-orange-300" : undefined}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Clock className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-3xl font-bold">{stats.pendingSignatures}</p>
                <p className="text-sm text-muted-foreground">Pending Signatures</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="pending">Pending Signatures ({stats.pendingSignatures})</TabsTrigger>
        </TabsList>
        
        {/* Templates Tab */}
        <TabsContent value="templates">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Signature Required</TableHead>
                  <TableHead>Auto-Assign</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates?.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{template.name}</p>
                        {template.description && (
                          <p className="text-sm text-muted-foreground">{template.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{template.category}</Badge>
                    </TableCell>
                    <TableCell>
                      {template.requires_signature ? (
                        <Badge className="bg-green-500">Required</Badge>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {template.assign_to_new_hires && <Badge variant="secondary" className="mr-1">New Hires</Badge>}
                      {template.assign_to_all && <Badge variant="secondary">All</Badge>}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => setShowAssignDialog(template.id)}>
                        <Send className="h-4 w-4 mr-1" />Assign
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
        
        {/* Pending Signatures Tab */}
        <TabsContent value="pending">
          <Card>
            <CardContent className="pt-6">
              {pendingDocs?.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <p className="text-muted-foreground">All documents signed!</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Document</TableHead>
                      <TableHead>Assigned</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Reminders</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingDocs?.map((doc: any) => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{doc.employee?.first_name} {doc.employee?.last_name}</p>
                            <p className="text-sm text-muted-foreground">{doc.employee?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{doc.template?.name}</TableCell>
                        <TableCell>{format(new Date(doc.created_at), 'MMM d, yyyy')}</TableCell>
                        <TableCell>
                          {doc.due_date ? format(new Date(doc.due_date), 'MMM d, yyyy') : '-'}
                        </TableCell>
                        <TableCell>{doc.reminder_count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Create Template Dialog */}
      <CreateTemplateDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
      
      {/* Assign Document Dialog */}
      {showAssignDialog && (
        <AssignDocumentDialog
          templateId={showAssignDialog}
          open={!!showAssignDialog}
          onOpenChange={(open) => !open && setShowAssignDialog(null)}
        />
      )}
    </div>
  );
};

// Create Template Dialog
const CreateTemplateDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
  const createTemplate = useCreateHRDocumentTemplate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'policy' as const,
    content: '',
    requires_signature: true,
    signature_text: 'I acknowledge that I have read and understand this document.',
    assign_to_new_hires: false,
  });
  const [file, setFile] = useState<File | null>(null);
  
  const handleSubmit = async () => {
    await createTemplate.mutateAsync({ ...formData, file: file || undefined });
    onOpenChange(false);
    setFormData({ name: '', description: '', category: 'policy', content: '', requires_signature: true, signature_text: 'I acknowledge that I have read and understand this document.', assign_to_new_hires: false });
    setFile(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Document Template</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Name *</Label>
            <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Document name" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Brief description" rows={2} />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={formData.category} onValueChange={(v: any) => setFormData({ ...formData, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="policy">Policy</SelectItem>
                <SelectItem value="handbook">Handbook</SelectItem>
                <SelectItem value="form">Form</SelectItem>
                <SelectItem value="training">Training</SelectItem>
                <SelectItem value="safety">Safety</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Content (HTML)</Label>
            <Textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} placeholder="Document content in HTML" rows={4} />
          </div>
          <div>
            <Label>Or Upload PDF</Label>
            <Input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Requires Signature</Label>
            <Switch checked={formData.requires_signature} onCheckedChange={(c) => setFormData({ ...formData, requires_signature: c })} />
          </div>
          {formData.requires_signature && (
            <div>
              <Label>Signature Acknowledgment Text</Label>
              <Textarea value={formData.signature_text} onChange={(e) => setFormData({ ...formData, signature_text: e.target.value })} rows={2} />
            </div>
          )}
          <div className="flex items-center justify-between">
            <Label>Auto-assign to New Hires</Label>
            <Switch checked={formData.assign_to_new_hires} onCheckedChange={(c) => setFormData({ ...formData, assign_to_new_hires: c })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!formData.name || createTemplate.isPending}>Create Template</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Assign Document Dialog
const AssignDocumentDialog = ({ templateId, open, onOpenChange }: { templateId: string; open: boolean; onOpenChange: (open: boolean) => void }) => {
  const assignDocument = useAssignHRDocument();
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  
  const { data: employees } = useQuery({
    queryKey: ['employees-for-assignment'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, first_name, last_name, email').order('first_name');
      return data;
    },
  });
  
  const handleAssign = async () => {
    if (selectedEmployees.length === 0) return;
    await assignDocument.mutateAsync({
      template_id: templateId,
      employee_ids: selectedEmployees,
      due_date: dueDate || undefined,
    });
    onOpenChange(false);
    setSelectedEmployees([]);
    setDueDate('');
  };
  
  const toggleEmployee = (id: string) => {
    setSelectedEmployees(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]);
  };
  
  const selectAll = () => {
    if (selectedEmployees.length === employees?.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(employees?.map(e => e.id) || []);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Assign Document</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Due Date (optional)</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Select Employees</Label>
              <Button variant="ghost" size="sm" onClick={selectAll}>
                {selectedEmployees.length === employees?.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            <div className="border rounded-lg max-h-60 overflow-y-auto">
              {employees?.map((emp) => (
                <label key={emp.id} className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer border-b last:border-b-0">
                  <Checkbox checked={selectedEmployees.includes(emp.id)} onCheckedChange={() => toggleEmployee(emp.id)} />
                  <div>
                    <p className="font-medium text-sm">{emp.first_name} {emp.last_name}</p>
                    <p className="text-xs text-muted-foreground">{emp.email}</p>
                  </div>
                </label>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-2">{selectedEmployees.length} employee(s) selected</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAssign} disabled={selectedEmployees.length === 0 || assignDocument.isPending}>
            <Send className="h-4 w-4 mr-2" />Assign to {selectedEmployees.length} Employee(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default HRDocuments;
