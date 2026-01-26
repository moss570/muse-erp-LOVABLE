import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCreatePolicy, useGeneratePolicyNumber, type Policy, type PolicyCategory, type PolicyType } from "@/hooks/usePolicies";
import { supabase } from "@/integrations/supabase/client";

interface PolicyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: PolicyCategory[];
  types: PolicyType[];
  policy?: Policy;
}

export default function PolicyFormDialog({ 
  open, 
  onOpenChange, 
  categories, 
  types,
  policy 
}: PolicyFormDialogProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("metadata");
  const [formData, setFormData] = useState({
    title: "",
    summary: "",
    content: "",
    type_id: "",
    category_id: "",
    department_id: "",
    effective_date: "",
    review_date: "",
    requires_acknowledgement: false,
    acknowledgement_frequency_days: 365,
  });

  const { data: policyNumber } = useGeneratePolicyNumber(formData.type_id || undefined);
  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });
  const createPolicy = useCreatePolicy();

  useEffect(() => {
    if (policy) {
      setFormData({
        title: policy.title,
        summary: policy.summary || "",
        content: policy.content || "",
        type_id: policy.type_id || "",
        category_id: policy.category_id || "",
        department_id: policy.department_id || "",
        effective_date: policy.effective_date || "",
        review_date: policy.review_date || "",
        requires_acknowledgement: policy.requires_acknowledgement,
        acknowledgement_frequency_days: policy.acknowledgement_frequency_days || 365,
      });
    } else {
      setFormData({
        title: "",
        summary: "",
        content: "",
        type_id: "",
        category_id: "",
        department_id: "",
        effective_date: "",
        review_date: "",
        requires_acknowledgement: false,
        acknowledgement_frequency_days: 365,
      });
    }
  }, [policy, open]);

  const handleSubmit = () => {
    if (!formData.title || !formData.type_id) return;

    createPolicy.mutate(
      {
        policy_number: policyNumber || `POL-${Date.now()}`,
        title: formData.title,
        summary: formData.summary || null,
        content: formData.content || null,
        type_id: formData.type_id,
        category_id: formData.category_id || null,
        department_id: formData.department_id || null,
        effective_date: formData.effective_date || null,
        review_date: formData.review_date || null,
        requires_acknowledgement: formData.requires_acknowledgement,
        acknowledgement_frequency_days: formData.requires_acknowledgement ? formData.acknowledgement_frequency_days : null,
        status: "draft",
      },
      {
        onSuccess: (data) => {
          onOpenChange(false);
          navigate(`/quality/policies/${data.id}`);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{policy ? "Edit Policy" : "Create New Policy"}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="metadata">Details</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
          </TabsList>

          <TabsContent value="metadata" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter policy title"
                />
              </div>

              <div>
                <Label htmlFor="type">Document Type *</Label>
                <Select 
                  value={formData.type_id} 
                  onValueChange={(v) => setFormData({ ...formData, type_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {types.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name} ({type.code_prefix})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select 
                  value={formData.category_id} 
                  onValueChange={(v) => setFormData({ ...formData, category_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {policyNumber && (
                <div className="col-span-2">
                  <Label>Policy Number (Auto-generated)</Label>
                  <Input value={policyNumber} disabled className="font-mono" />
                </div>
              )}

              <div>
                <Label htmlFor="department">Department</Label>
                <Select 
                  value={formData.department_id} 
                  onValueChange={(v) => setFormData({ ...formData, department_id: v })}
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
                <Label htmlFor="effective_date">Effective Date</Label>
                <Input
                  id="effective_date"
                  type="date"
                  value={formData.effective_date}
                  onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="review_date">Review Date</Label>
                <Input
                  id="review_date"
                  type="date"
                  value={formData.review_date}
                  onChange={(e) => setFormData({ ...formData, review_date: e.target.value })}
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="summary">Summary</Label>
                <Textarea
                  id="summary"
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  placeholder="Brief description of this policy"
                  rows={2}
                />
              </div>

              <div className="col-span-2 flex items-center justify-between border rounded-lg p-4">
                <div>
                  <Label>Requires Acknowledgement</Label>
                  <p className="text-sm text-muted-foreground">
                    Employees must acknowledge they have read this policy
                  </p>
                </div>
                <Switch
                  checked={formData.requires_acknowledgement}
                  onCheckedChange={(checked) => setFormData({ ...formData, requires_acknowledgement: checked })}
                />
              </div>

              {formData.requires_acknowledgement && (
                <div>
                  <Label htmlFor="frequency">Re-acknowledgement Frequency (days)</Label>
                  <Input
                    id="frequency"
                    type="number"
                    value={formData.acknowledgement_frequency_days}
                    onChange={(e) => setFormData({ ...formData, acknowledgement_frequency_days: parseInt(e.target.value) || 365 })}
                  />
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="content" className="mt-4">
            <div>
              <Label htmlFor="content">Policy Content</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Enter the full policy content..."
                rows={15}
                className="font-mono text-sm"
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!formData.title || !formData.type_id || createPolicy.isPending}
          >
            {createPolicy.isPending ? "Creating..." : "Create Policy"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
