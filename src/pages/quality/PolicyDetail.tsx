import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Edit, Clock, Users, Paperclip, MessageSquare, Link2, MoreHorizontal, CheckCircle2, AlertCircle, FileText, RefreshCw, Loader2, Eye, FileCode, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { usePolicy, usePolicyCategories, usePolicyTypes } from "@/hooks/usePolicies";
import { usePolicyVersions } from "@/hooks/usePolicyVersions";
import { usePolicyAttachments } from "@/hooks/usePolicyAttachments";
import { usePolicyAcknowledgements, usePolicyAcknowledgementStats } from "@/hooks/usePolicyAcknowledgements";
import { usePolicySQFMappings } from "@/hooks/useSQF";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import PolicyFormDialog from "@/components/policies/PolicyFormDialog";
import PolicyDocumentViewer from "@/components/policies/PolicyDocumentViewer";
import PolicySQFMappingsTab from "@/components/policies/PolicySQFMappingsTab";
import PolicySideBySideView from "@/components/policies/PolicySideBySideView";
import "@/styles/policy-document.css";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  review: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  archived: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
  superseded: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
};

// Format policy content with proper HTML rendering
function formatPolicyContent(content: string): string {
  return content
    // Convert markdown-style headers (## HEADER)
    .replace(/\n## ([^\n]+)\n/g, '<h2 class="text-lg font-bold mt-6 mb-3 text-foreground border-b pb-2">$1</h2>')
    // Convert bold text (**text**)
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold">$1</strong>')
    // Convert double newlines to paragraph breaks
    .replace(/\n\n+/g, '</p><p class="mb-3">')
    // Convert single newlines to line breaks
    .replace(/\n/g, '<br/>')
    // Wrap in paragraph tags
    .replace(/^/, '<p class="mb-3">')
    .replace(/$/, '</p>')
    // Clean up empty paragraphs
    .replace(/<p class="mb-3"><\/p>/g, '')
    .replace(/<p class="mb-3"><br\/>/g, '<p class="mb-3">');
}

export default function PolicyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isManager } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("content");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [contentViewMode, setContentViewMode] = useState<"visual" | "extracted">("visual");
  const [isCompareEnabled, setIsCompareEnabled] = useState(false);
  const [selectedMappingId, setSelectedMappingId] = useState<string | null>(null);

  const { data: policy, isLoading } = usePolicy(id);
  const { data: versions } = usePolicyVersions(id);
  const { data: attachments } = usePolicyAttachments(id);
  const { data: acknowledgements } = usePolicyAcknowledgements(id);
  const { data: ackStats } = usePolicyAcknowledgementStats(id);
  const { data: sqfMappings } = usePolicySQFMappings(id);
  const { data: categories } = usePolicyCategories();
  const { data: types } = usePolicyTypes();

  // Get the selected mapping with full details
  const selectedMapping = selectedMappingId 
    ? sqfMappings?.find(m => m.id === selectedMappingId) 
    : null;

  const handleReanalyze = async () => {
    if (!attachments?.length || !id) {
      toast.error("No attachments found to analyze");
      return;
    }

    const attachment = attachments[0]; // Use first attachment
    if (!attachment.file_path) {
      toast.error("Attachment file path not found");
      return;
    }

    setIsReanalyzing(true);
    try {
      // Download the file from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("policy-attachments")
        .download(attachment.file_path);

      if (downloadError || !fileData) {
        throw new Error("Failed to download attachment");
      }

      // Convert to base64
      const arrayBuffer = await fileData.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const fileBase64 = btoa(binary);

      // Get the active SQF edition
      const { data: editions } = await supabase
        .from("sqf_editions")
        .select("id")
        .eq("is_active", true)
        .limit(1);
      
      const editionId = editions?.[0]?.id;
      if (!editionId) {
        throw new Error("No active SQF edition found");
      }

      // Call the analyze function
      const { data, error } = await supabase.functions.invoke("analyze-policy-sqf", {
        body: {
          fileBase64,
          fileName: attachment.file_name,
          mimeType: attachment.file_type || "application/octet-stream",
          editionId,
        },
      });

      if (error) throw error;

      if (data?.success && data.document_content) {
        // Update the policy with the extracted content
        const { error: updateError } = await supabase
          .from("policies")
          .update({ content: data.document_content })
          .eq("id", id);

        if (updateError) throw updateError;

        // Upsert SQF mappings with evidence_excerpts
        if (data.mappings && data.mappings.length > 0) {
          const { data: user } = await supabase.auth.getUser();
          const mappingsToUpsert = data.mappings.map((m: any) => ({
            policy_id: id,
            sqf_code_id: m.sqf_code_id,
            compliance_status: m.compliance_status,
            gap_description: m.gap_description || null,
            notes: m.explanation,
            created_by: user.user?.id,
            evidence_excerpts: m.evidence_excerpts ?? [],
          }));

          const { error: mappingError } = await supabase
            .from("policy_sqf_mappings")
            .upsert(mappingsToUpsert as any, {
              onConflict: "policy_id,sqf_code_id",
            });

          if (mappingError) {
            console.error("Failed to update SQF mappings:", mappingError);
          }
        }

        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["policy", id] });
        queryClient.invalidateQueries({ queryKey: ["policy-sqf-mappings", id] });
        queryClient.invalidateQueries({ queryKey: ["sqf-compliance-summary"] });
        toast.success(`Policy content extracted${data.mappings?.length ? ` with ${data.mappings.length} SQF mappings` : ""}`);
      } else {
        toast.error(data?.error || "Failed to extract content from document");
      }
    } catch (error) {
      console.error("Re-analyze error:", error);
      toast.error("Failed to re-analyze document");
    } finally {
      setIsReanalyzing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Policy not found</h2>
        <Button variant="outline" onClick={() => navigate("/quality/policies")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Policies
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/quality/policies")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-mono text-muted-foreground">{policy.policy_number}</span>
              <Badge className={statusColors[policy.status]}>{policy.status}</Badge>
              <Badge variant="outline">v{policy.version}</Badge>
            </div>
            <h1 className="text-2xl font-bold">{policy.title}</h1>
            {policy.summary && (
              <p className="text-muted-foreground mt-1 max-w-2xl">{policy.summary}</p>
            )}
          </div>
        </div>
        {isManager && (
          <div className="flex gap-2">
            <Button onClick={() => setIsEditOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        )}
      </div>

      {/* Metadata Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Category</div>
            <div className="font-medium flex items-center gap-1">
              {policy.category?.icon} {policy.category?.name || "Uncategorized"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Effective Date</div>
            <div className="font-medium">
              {policy.effective_date ? format(new Date(policy.effective_date), "MMM d, yyyy") : "Not set"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Review Date</div>
            <div className="font-medium">
              {policy.review_date ? format(new Date(policy.review_date), "MMM d, yyyy") : "Not set"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Owner</div>
            <div className="font-medium">
              {policy.owner ? `${policy.owner.first_name} ${policy.owner.last_name}` : "Not assigned"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Acknowledgement Progress */}
      {policy.requires_acknowledgement && ackStats && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Acknowledgement Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Progress value={ackStats.percentage} className="flex-1" />
              <span className="text-sm font-medium">
                {ackStats.total_acknowledged} / {ackStats.total_required} ({ackStats.percentage}%)
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="sqf-codes" className="flex items-center gap-1">
            <BookOpen className="h-3 w-3" />
            SQF Codes ({sqfMappings?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="versions" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Versions ({versions?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="attachments" className="flex items-center gap-1">
            <Paperclip className="h-3 w-3" />
            Attachments ({attachments?.length || 0})
          </TabsTrigger>
          {policy.requires_acknowledgement && (
            <TabsTrigger value="acknowledgements" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              Acknowledgements
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="content" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{policy.title}</CardTitle>
                  <CardDescription>
                    {policy.policy_number} • Version {policy.version}
                    {policy.effective_date && ` • Effective: ${format(new Date(policy.effective_date), "MMM d, yyyy")}`}
                    {policy.review_date && ` • Review: ${format(new Date(policy.review_date), "MMM d, yyyy")}`}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {/* View mode toggle */}
                  {attachments?.length > 0 && (
                    <div className="flex items-center gap-1 border rounded-lg p-0.5">
                      <Button 
                        variant={contentViewMode === "visual" ? "secondary" : "ghost"}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setContentViewMode("visual")}
                        title="View original document"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Original
                      </Button>
                      <Button 
                        variant={contentViewMode === "extracted" ? "secondary" : "ghost"}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setContentViewMode("extracted")}
                        title="View extracted text"
                      >
                        <FileCode className="h-3.5 w-3.5 mr-1" />
                        Text
                      </Button>
                    </div>
                  )}
                  {/* Re-analyze button */}
                  {attachments?.length > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleReanalyze}
                      disabled={isReanalyzing}
                      title="Re-extract content from document"
                    >
                      {isReanalyzing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="p-0">
              {/* Visual Document View (Original) */}
              {contentViewMode === "visual" && attachments?.length ? (
                <div className="min-h-[600px]">
                  <PolicyDocumentViewer
                    filePath={attachments[0].file_path!}
                    fileName={attachments[0].file_name}
                    fileType={attachments[0].file_type || undefined}
                    fileUrl={attachments[0].file_url || undefined}
                    className="h-[600px]"
                  />
                </div>
              ) : contentViewMode === "extracted" && policy.content ? (
                /* Extracted Text View */
                <div className="p-6 prose prose-sm dark:prose-invert max-w-none">
                  <div 
                    dangerouslySetInnerHTML={{ 
                      __html: formatPolicyContent(policy.content)
                    }} 
                  />
                </div>
              ) : contentViewMode === "extracted" && !policy.content && attachments?.length ? (
                /* No extracted content yet */
                <div className="text-center py-8 space-y-4 p-6">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground mb-4">
                      This policy's text content hasn't been extracted yet. Click the re-analyze button to extract searchable text from the document.
                    </p>
                    <Button 
                      onClick={handleReanalyze} 
                      disabled={isReanalyzing}
                    >
                      {isReanalyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Extracting Content...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Extract Text Content
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : !attachments?.length ? (
                /* No attachments at all */
                <div className="text-center py-8 p-6">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No document attached to this policy</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sqf-codes" className="mt-4">
          {isCompareEnabled && selectedMapping ? (
            <PolicySideBySideView
              policy={{
                id: policy.id,
                title: policy.title,
                content: policy.content,
              }}
              attachment={attachments?.[0] ? {
                file_path: attachments[0].file_path!,
                file_name: attachments[0].file_name,
                file_type: attachments[0].file_type,
                file_url: attachments[0].file_url,
              } : null}
              selectedMapping={selectedMapping as any}
              onClose={() => {
                setIsCompareEnabled(false);
                setSelectedMappingId(null);
              }}
            />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <PolicySQFMappingsTab
                  policyId={id!}
                  onAnalyze={handleReanalyze}
                  isAnalyzing={isReanalyzing}
                  onCompareToggle={(enabled) => {
                    setIsCompareEnabled(enabled);
                    if (!enabled) setSelectedMappingId(null);
                  }}
                  isCompareEnabled={isCompareEnabled}
                  selectedMappingId={selectedMappingId}
                  onMappingSelect={(mappingId) => {
                    setSelectedMappingId(mappingId);
                    if (mappingId && isCompareEnabled) {
                      // Already in compare mode with selection
                    }
                  }}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="versions" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {versions?.length ? (
                <div className="space-y-4">
                  {versions.map((version, index) => (
                    <div key={version.id} className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                          {version.version_number}
                        </div>
                        {index < versions.length - 1 && (
                          <div className="w-px h-8 bg-border mt-2" />
                        )}
                      </div>
                      <div className="flex-1 pt-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Version {version.version_number}</span>
                          <Badge variant="outline">{version.status}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {version.creator && `${version.creator.first_name} ${version.creator.last_name} • `}
                          {format(new Date(version.created_at), "MMM d, yyyy 'at' h:mm a")}
                        </div>
                        {version.change_notes && (
                          <p className="text-sm mt-1">{version.change_notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No version history</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attachments" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {attachments?.length ? (
                <div className="space-y-2">
                  {attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="font-medium">{attachment.file_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {attachment.file_size && `${(attachment.file_size / 1024).toFixed(1)} KB • `}
                          {format(new Date(attachment.uploaded_at), "MMM d, yyyy")}
                        </div>
                      </div>
                      {attachment.file_url && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={attachment.file_url} target="_blank" rel="noopener noreferrer">
                            Download
                          </a>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No attachments</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="acknowledgements" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {acknowledgements?.length ? (
                <div className="space-y-2">
                  {acknowledgements.map((ack) => (
                    <div key={ack.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {ack.employee?.first_name?.[0]}{ack.employee?.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="font-medium">
                          {ack.employee?.first_name} {ack.employee?.last_name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {ack.employee?.department?.name} • v{ack.policy_version}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        {format(new Date(ack.acknowledged_at), "MMM d, yyyy")}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No acknowledgements yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Policy Dialog */}
      {categories && types && (
        <PolicyFormDialog
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          categories={categories}
          types={types}
          policy={policy}
        />
      )}
    </div>
  );
}
