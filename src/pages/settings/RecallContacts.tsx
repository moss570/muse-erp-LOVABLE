import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Edit, Trash2, Phone, Mail, Building, Shield } from "lucide-react";

const RecallContacts = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);
  const [formData, setFormData] = useState({
    contactType: 'internal',
    roleTitle: '',
    contactName: '',
    organization: '',
    phone: '',
    phoneSecondary: '',
    email: '',
    notifyClass1: true,
    notifyClass2: true,
    notifyClass3: false,
    notifyMockDrill: true,
    notifyByPhone: true,
    notifyByEmail: true,
    notifyBySms: false,
    notificationOrder: 99
  });

  const { data: contacts } = useQuery({
    queryKey: ['recall-contacts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('recall_contacts')
        .select('*')
        .eq('is_active', true)
        .order('notification_order');
      return data;
    }
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        contact_type: formData.contactType,
        role_title: formData.roleTitle,
        contact_name: formData.contactName,
        organization: formData.organization,
        phone: formData.phone,
        phone_secondary: formData.phoneSecondary,
        email: formData.email,
        notify_class_1: formData.notifyClass1,
        notify_class_2: formData.notifyClass2,
        notify_class_3: formData.notifyClass3,
        notify_mock_drill: formData.notifyMockDrill,
        notify_by_phone: formData.notifyByPhone,
        notify_by_email: formData.notifyByEmail,
        notify_by_sms: formData.notifyBySms,
        notification_order: formData.notificationOrder
      };

      if (editingContact) {
        await supabase.from('recall_contacts').update(payload).eq('id', editingContact.id);
      } else {
        await supabase.from('recall_contacts').insert(payload);
      }
    },
    onSuccess: () => {
      toast({ title: "Saved", description: "Contact saved successfully." });
      setShowDialog(false);
      setEditingContact(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['recall-contacts'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('recall_contacts').update({ is_active: false }).eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recall-contacts'] });
    }
  });

  const resetForm = () => {
    setFormData({
      contactType: 'internal',
      roleTitle: '',
      contactName: '',
      organization: '',
      phone: '',
      phoneSecondary: '',
      email: '',
      notifyClass1: true,
      notifyClass2: true,
      notifyClass3: false,
      notifyMockDrill: true,
      notifyByPhone: true,
      notifyByEmail: true,
      notifyBySms: false,
      notificationOrder: 99
    });
  };

  const openEdit = (contact: any) => {
    setEditingContact(contact);
    setFormData({
      contactType: contact.contact_type,
      roleTitle: contact.role_title,
      contactName: contact.contact_name || '',
      organization: contact.organization || '',
      phone: contact.phone || '',
      phoneSecondary: contact.phone_secondary || '',
      email: contact.email || '',
      notifyClass1: contact.notify_class_1,
      notifyClass2: contact.notify_class_2,
      notifyClass3: contact.notify_class_3,
      notifyMockDrill: contact.notify_mock_drill,
      notifyByPhone: contact.notify_by_phone,
      notifyByEmail: contact.notify_by_email,
      notifyBySms: contact.notify_by_sms,
      notificationOrder: contact.notification_order
    });
    setShowDialog(true);
  };

  const openNew = () => {
    setEditingContact(null);
    resetForm();
    setShowDialog(true);
  };

  const internalContacts = contacts?.filter(c => c.contact_type === 'internal') || [];
  const externalContacts = contacts?.filter(c => c.contact_type === 'external') || [];
  const regulatoryContacts = contacts?.filter(c => c.contact_type === 'regulatory') || [];

  const ContactTable = ({ title, contactList, icon: Icon }: { title: string; contactList: any[]; icon: React.ElementType }) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          {title} ({contactList.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Notify For</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contactList.map(contact => (
              <TableRow key={contact.id}>
                <TableCell>{contact.notification_order}</TableCell>
                <TableCell className="font-medium">{contact.role_title}</TableCell>
                <TableCell>{contact.contact_name || '-'}</TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {contact.phone && (
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="h-3 w-3" />
                        {contact.phone}
                      </div>
                    )}
                    {contact.email && (
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="h-3 w-3" />
                        {contact.email}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {contact.notify_class_1 && <Badge variant="destructive" className="text-xs">I</Badge>}
                    {contact.notify_class_2 && <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">II</Badge>}
                    {contact.notify_class_3 && <Badge variant="secondary" className="text-xs">III</Badge>}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(contact)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(contact.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {contactList.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                  No contacts configured
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Recall Contacts</h1>
        </div>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button onClick={openNew}>
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingContact ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Contact Type</Label>
                  <Select value={formData.contactType} onValueChange={(v) => setFormData({ ...formData, contactType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internal">Internal</SelectItem>
                      <SelectItem value="external">External</SelectItem>
                      <SelectItem value="regulatory">Regulatory</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Notification Order</Label>
                  <Input
                    type="number"
                    value={formData.notificationOrder}
                    onChange={(e) => setFormData({ ...formData, notificationOrder: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <Label>Role/Title *</Label>
                <Input value={formData.roleTitle} onChange={(e) => setFormData({ ...formData, roleTitle: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Contact Name</Label>
                  <Input value={formData.contactName} onChange={(e) => setFormData({ ...formData, contactName: e.target.value })} />
                </div>
                <div>
                  <Label>Organization</Label>
                  <Input value={formData.organization} onChange={(e) => setFormData({ ...formData, organization: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Phone</Label>
                  <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Notify For Recall Classes</Label>
                <div className="flex gap-4 mt-2">
                  <div className="flex items-center gap-2">
                    <Switch checked={formData.notifyClass1} onCheckedChange={(c) => setFormData({ ...formData, notifyClass1: c })} />
                    <span>Class I</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={formData.notifyClass2} onCheckedChange={(c) => setFormData({ ...formData, notifyClass2: c })} />
                    <span>Class II</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={formData.notifyClass3} onCheckedChange={(c) => setFormData({ ...formData, notifyClass3: c })} />
                    <span>Class III</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
                <Button onClick={() => saveMutation.mutate()} disabled={!formData.roleTitle || saveMutation.isPending}>Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <ContactTable title="Internal Contacts" contactList={internalContacts} icon={Users} />
      <ContactTable title="External Contacts" contactList={externalContacts} icon={Building} />
      <ContactTable title="Regulatory Contacts" contactList={regulatoryContacts} icon={Shield} />
    </div>
  );
};

export default RecallContacts;
