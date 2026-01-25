import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Mail, Send, RotateCcw, Save, Loader2, Info } from 'lucide-react';
import { 
  useEmailTemplates, 
  useUpdateEmailTemplate, 
  useTestEmailTemplate,
  DEFAULT_EMAIL_TEMPLATES,
  EMAIL_TEMPLATE_LABELS,
  MERGE_FIELDS,
  type EmailTemplate 
} from '@/hooks/useEmailTemplates';
import { EmailTemplatePreview } from '@/components/settings/EmailTemplatePreview';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function EmailTemplateEditor() {
  const navigate = useNavigate();
  const { data: templates, isLoading } = useEmailTemplates();
  const updateTemplate = useUpdateEmailTemplate();
  const testEmail = useTestEmailTemplate();
  
  const [selectedType, setSelectedType] = useState<string>('');
  const [formData, setFormData] = useState<Partial<EmailTemplate>>({});
  const [hasChanges, setHasChanges] = useState(false);
  
  // Get company name for preview
  const { data: companySettings } = useQuery({
    queryKey: ['company-settings-name'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('company_name')
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const companyName = companySettings?.company_name || 'Your Company';

  // Set initial selected template
  useEffect(() => {
    if (templates && templates.length > 0 && !selectedType) {
      setSelectedType(templates[0].email_type);
    }
  }, [templates, selectedType]);

  // Load template data when selection changes
  useEffect(() => {
    if (templates && selectedType) {
      const template = templates.find(t => t.email_type === selectedType);
      if (template) {
        setFormData({
          subject: template.subject,
          heading: template.heading,
          body_text: template.body_text,
          button_text: template.button_text,
          footer_text: template.footer_text,
        });
        setHasChanges(false);
      }
    }
  }, [templates, selectedType]);

  const handleInputChange = (field: keyof EmailTemplate, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    const template = templates?.find(t => t.email_type === selectedType);
    if (!template) return;

    await updateTemplate.mutateAsync({
      id: template.id,
      updates: {
        subject: formData.subject || '',
        heading: formData.heading || null,
        body_text: formData.body_text || '',
        button_text: formData.button_text || null,
        footer_text: formData.footer_text || null,
      },
    });
    setHasChanges(false);
  };

  const handleReset = () => {
    const defaults = DEFAULT_EMAIL_TEMPLATES[selectedType];
    if (defaults) {
      setFormData({
        subject: defaults.subject || '',
        heading: defaults.heading || '',
        body_text: defaults.body_text || '',
        button_text: defaults.button_text || '',
        footer_text: defaults.footer_text || '',
      });
      setHasChanges(true);
      toast.info('Reset to defaults. Click Save to apply changes.');
    }
  };

  const handleSendTest = async () => {
    if (hasChanges) {
      toast.error('Please save your changes before sending a test email.');
      return;
    }
    await testEmail.mutateAsync({ emailType: selectedType });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentLabel = EMAIL_TEMPLATE_LABELS[selectedType] || { label: selectedType, description: '' };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Mail className="h-6 w-6" />
            Email Templates
          </h1>
          <p className="text-muted-foreground">
            Customize the content and appearance of system emails
          </p>
        </div>
      </div>

      {/* Template Tabs */}
      <Tabs value={selectedType} onValueChange={setSelectedType} className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1">
          {templates?.map((template) => {
            const label = EMAIL_TEMPLATE_LABELS[template.email_type];
            return (
              <TabsTrigger 
                key={template.email_type} 
                value={template.email_type}
                className="text-sm"
              >
                {label?.label || template.template_name}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {templates?.map((template) => (
          <TabsContent key={template.email_type} value={template.email_type} className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Editor */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Edit Template</CardTitle>
                  <CardDescription>{currentLabel.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Subject */}
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject Line</Label>
                    <Input
                      id="subject"
                      value={formData.subject || ''}
                      onChange={(e) => handleInputChange('subject', e.target.value)}
                      placeholder="Email subject..."
                    />
                  </div>

                  {/* Heading */}
                  <div className="space-y-2">
                    <Label htmlFor="heading">Heading</Label>
                    <Input
                      id="heading"
                      value={formData.heading || ''}
                      onChange={(e) => handleInputChange('heading', e.target.value)}
                      placeholder="Email heading..."
                    />
                  </div>

                  {/* Body Text */}
                  <div className="space-y-2">
                    <Label htmlFor="body_text">Body Text</Label>
                    <Textarea
                      id="body_text"
                      value={formData.body_text || ''}
                      onChange={(e) => handleInputChange('body_text', e.target.value)}
                      placeholder="Main email content..."
                      rows={4}
                    />
                  </div>

                  {/* Button Text */}
                  <div className="space-y-2">
                    <Label htmlFor="button_text">Button Text</Label>
                    <Input
                      id="button_text"
                      value={formData.button_text || ''}
                      onChange={(e) => handleInputChange('button_text', e.target.value)}
                      placeholder="Call-to-action button text..."
                    />
                  </div>

                  {/* Footer Text */}
                  <div className="space-y-2">
                    <Label htmlFor="footer_text">Footer Text</Label>
                    <Textarea
                      id="footer_text"
                      value={formData.footer_text || ''}
                      onChange={(e) => handleInputChange('footer_text', e.target.value)}
                      placeholder="Additional information..."
                      rows={2}
                    />
                  </div>

                  {/* Merge Fields Info */}
                  <div className="rounded-lg border p-3 bg-muted/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Available Merge Fields</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {MERGE_FIELDS.map((field) => (
                        <TooltipProvider key={field.field}>
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge 
                                variant="secondary" 
                                className="font-mono text-xs cursor-help"
                              >
                                {field.field}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{field.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2 pt-4">
                    <Button 
                      onClick={handleSave} 
                      disabled={!hasChanges || updateTemplate.isPending}
                    >
                      {updateTemplate.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save Changes
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleSendTest}
                      disabled={testEmail.isPending || hasChanges}
                    >
                      {testEmail.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Send Test Email
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={handleReset}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset to Default
                    </Button>
                  </div>

                  {hasChanges && (
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      You have unsaved changes.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Preview */}
              <EmailTemplatePreview
                companyName={companyName}
                heading={formData.heading || ''}
                bodyText={formData.body_text || ''}
                buttonText={formData.button_text || ''}
                footerText={formData.footer_text || ''}
              />
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
