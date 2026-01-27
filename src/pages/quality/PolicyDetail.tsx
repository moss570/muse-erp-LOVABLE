import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Edit, Clock, Users, Paperclip, MessageSquare, Link2, MoreHorizontal, CheckCircle2, AlertCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { usePolicy } from "@/hooks/usePolicies";
import { usePolicyVersions } from "@/hooks/usePolicyVersions";
import { usePolicyAttachments } from "@/hooks/usePolicyAttachments";
import { usePolicyAcknowledgements, usePolicyAcknowledgementStats } from "@/hooks/usePolicyAcknowledgements";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  review: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  archived: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
  superseded: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
};

export default function PolicyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isManager } = useAuth();
  const [activeTab, setActiveTab] = useState("content");

  const { data: policy, isLoading } = usePolicy(id);
  const { data: versions } = usePolicyVersions(id);
  const { data: attachments } = usePolicyAttachments(id);
  const { data: acknowledgements } = usePolicyAcknowledgements(id);
  const { data: ackStats } = usePolicyAcknowledgementStats(id);

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
          <Button onClick={() => navigate(`/quality/policies/${id}/edit`)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
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
            <CardContent className="pt-6">
              {policy.content ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: policy.content.replace(/\n/g, '<br/>') }} />
                </div>
              ) : attachments?.length ? (
                <div className="text-center py-8 space-y-4">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground mb-4">
                      This policy's content is available as an attached document.
                    </p>
                    <div className="flex flex-col items-center gap-2">
                      {attachments.map((attachment) => {
                        const fileUrl = attachment.file_url || 
                          (attachment.file_path ? 
                            `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/policy-attachments/${attachment.file_path}` 
                            : null);
                        return (
                          <Button key={attachment.id} variant="outline" asChild>
                            <a href={fileUrl || "#"} target="_blank" rel="noopener noreferrer">
                              <Paperclip className="h-4 w-4 mr-2" />
                              {attachment.file_name}
                            </a>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No content yet</p>
              )}
            </CardContent>
          </Card>
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
    </div>
  );
}
