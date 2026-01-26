import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Eye, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePolicy, useCreatePolicy, useUpdatePolicy, generatePolicyNumber } from '@/hooks/usePolicies';
import { useAuth } from '@/contexts/AuthContext';
import { PolicyMetadataForm } from '@/components/policies/PolicyMetadataForm';
import { PolicyContentEditor } from '@/components/policies/PolicyContentEditor';
import { PolicyTagsInput } from '@/components/policies/PolicyTagsInput';
import { PolicyRelatedPoliciesInput } from '@/components/policies/PolicyRelatedPoliciesInput';
import { PolicyFileUpload } from '@/components/policies/PolicyFileUpload';
import { toast } from 'sonner';
import type { PolicyFormData } from '@/types/policies';

export default function PolicyForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditMode = id !== 'new' && !!id;

  const { data: existingPolicy, isLoading } = usePolicy(id || '', { enabled: isEditMode });
  const createPolicy = useCreatePolicy();
  const updatePolicy = useUpdatePolicy();

  const [activeTab, setActiveTab] = useState('metadata');
  const [formData, setFormData] = useState<PolicyFormData>({
    title: '',
    policy_number: '',
    category_id: undefined,
    policy_type_id: undefined,
    status: 'Draft',
    version_number: 1,
    content_json: null,
    content_html: '',
    content_plain: '',
    summary: '',
    effective_date: null,
    review_date: null,
    review_frequency_months: 12,
    owned_by: user?.id || '',
    created_by: user?.id || '',
    require_acknowledgement: false,
    is_active: true,
  });

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [relatedPolicies, setRelatedPolicies] = useState<Array<{ policy_id: string; relationship_type: string }>>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load existing policy data
  useEffect(() => {
    if (existingPolicy) {
      setFormData({
        title: existingPolicy.title,
        policy_number: existingPolicy.policy_number,
        category_id: existingPolicy.category_id || undefined,
        policy_type_id: existingPolicy.policy_type_id || undefined,
        status: existingPolicy.status,
        version_number: existingPolicy.version_number,
        content_json: existingPolicy.content_json,
        content_html: existingPolicy.content_html || '',
        content_plain: existingPolicy.content_plain || '',
        summary: existingPolicy.summary || '',
        effective_date: existingPolicy.effective_date,
        review_date: existingPolicy.review_date,
        review_frequency_months: existingPolicy.review_frequency_months || 12,
        owned_by: existingPolicy.owned_by || user?.id || '',
        created_by: existingPolicy.created_by,
        require_acknowledgement: existingPolicy.require_acknowledgement,
        is_active: existingPolicy.is_active,
      });

      // Load tags if available
      if (existingPolicy.tags) {
        setSelectedTags(existingPolicy.tags.map((t: any) => t.id));
      }
    }
  }, [existingPolicy, user]);

  // Generate policy number for new policies
  useEffect(() => {
    if (!isEditMode && !formData.policy_number && formData.policy_type_id) {
      const generateNumber = async () => {
        try {
          const number = await generatePolicyNumber(formData.policy_type_id!);
          setFormData(prev => ({ ...prev, policy_number: number }));
        } catch (error) {
          console.error('Failed to generate policy number:', error);
        }
      };
      generateNumber();
    }
  }, [formData.policy_type_id, isEditMode, formData.policy_number]);

  // Warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleBack = () => {
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Are you sure you want to leave?')) {
        return;
      }
    }
    navigate(isEditMode ? `/policies/${id}` : '/policies');
  };

  const handleMetadataChange = (updates: Partial<PolicyFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    setHasUnsavedChanges(true);
  };

  const handleContentChange = (content: { html: string; json: any; plain: string; wordCount: number }) => {
    setFormData(prev => ({
      ...prev,
      content_html: content.html,
      content_json: content.json,
      content_plain: content.plain,
      content_word_count: content.wordCount,
    }));
    setHasUnsavedChanges(true);
  };

  const handleTagsChange = (tagIds: string[]) => {
    setSelectedTags(tagIds);
    setHasUnsavedChanges(true);
  };

  const handleRelatedPoliciesChange = (policies: Array<{ policy_id: string; relationship_type: string }>) => {
    setRelatedPolicies(policies);
    setHasUnsavedChanges(true);
  };

  const handleAttachmentsChange = (files: File[]) => {
    setAttachments(files);
    setHasUnsavedChanges(true);
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      toast.error('Title is required');
      setActiveTab('metadata');
      return false;
    }

    if (!formData.policy_type_id) {
      toast.error('Policy type is required');
      setActiveTab('metadata');
      return false;
    }

    if (!formData.owned_by) {
      toast.error('Owner is required');
      setActiveTab('metadata');
      return false;
    }

    return true;
  };

  const handleSave = async (asDraft: boolean = true) => {
    if (!validateForm()) return;

    const dataToSave = {
      ...formData,
      status: asDraft ? 'Draft' : formData.status,
    };

    try {
      if (isEditMode) {
        await updatePolicy.mutateAsync({ id: id!, updates: dataToSave });
        toast.success('Policy updated successfully');
      } else {
        const result = await createPolicy.mutateAsync(dataToSave);
        toast.success('Policy created successfully');
        navigate(`/policies/${result.id}`);
      }
      setHasUnsavedChanges(false);
    } catch (error) {
      toast.error(isEditMode ? 'Failed to update policy' : 'Failed to create policy');
    }
  };

  const handlePreview = () => {
    toast.info('Preview feature coming soon');
  };

  if (isLoading && isEditMode) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading policy...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isEditMode ? 'Edit Policy' : 'Create New Policy'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isEditMode
                ? `Editing ${formData.policy_number || 'policy'}`
                : 'Create a new policy or standard operating procedure'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePreview}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button onClick={() => handleSave(false)} disabled={createPolicy.isPending || updatePolicy.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {createPolicy.isPending || updatePolicy.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Unsaved Changes Warning */}
      {hasUnsavedChanges && (
        <Alert>
          <AlertDescription>
            You have unsaved changes. Don't forget to save before leaving this page.
          </AlertDescription>
        </Alert>
      )}

      {/* Form Content */}
      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="metadata">Metadata</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="tags">Tags</TabsTrigger>
              <TabsTrigger value="related">Related</TabsTrigger>
              <TabsTrigger value="attachments">Attachments</TabsTrigger>
            </TabsList>

            <Separator className="my-6" />

            <TabsContent value="metadata" className="space-y-6">
              <PolicyMetadataForm
                formData={formData}
                onChange={handleMetadataChange}
                isEditMode={isEditMode}
              />
            </TabsContent>

            <TabsContent value="content" className="space-y-6">
              <PolicyContentEditor
                initialContent={formData.content_json}
                initialHtml={formData.content_html}
                onChange={handleContentChange}
              />
            </TabsContent>

            <TabsContent value="tags" className="space-y-6">
              <PolicyTagsInput
                selectedTags={selectedTags}
                onChange={handleTagsChange}
              />
            </TabsContent>

            <TabsContent value="related" className="space-y-6">
              <PolicyRelatedPoliciesInput
                policyId={id}
                relatedPolicies={relatedPolicies}
                onChange={handleRelatedPoliciesChange}
              />
            </TabsContent>

            <TabsContent value="attachments" className="space-y-6">
              <PolicyFileUpload
                policyId={id}
                attachments={attachments}
                onChange={handleAttachmentsChange}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Bottom Actions */}
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={handleBack}>
          Cancel
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleSave(true)}
            disabled={createPolicy.isPending || updatePolicy.isPending}
          >
            Save as Draft
          </Button>
          <Button
            onClick={() => handleSave(false)}
            disabled={createPolicy.isPending || updatePolicy.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {createPolicy.isPending || updatePolicy.isPending ? 'Saving...' : 'Save Policy'}
          </Button>
        </div>
      </div>
    </div>
  );
}
