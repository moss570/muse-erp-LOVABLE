import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Archive,
  Download,
  Share,
  Copy,
  MoreVertical,
  FileText,
  Clock,
  MessageSquare,
  Paperclip,
  Users,
  GitBranch,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { usePolicy } from '@/hooks/usePolicies';
import { usePolicyVersions } from '@/hooks/usePolicyVersions';
import { usePolicyAttachments } from '@/hooks/usePolicyAttachments';
import { usePolicyComments } from '@/hooks/usePolicyComments';
import { PolicyStatusBadge } from '@/components/policies/PolicyStatusBadge';
import { PolicyCategoryBadge } from '@/components/policies/PolicyCategoryBadge';
import { PolicyTypeBadge } from '@/components/policies/PolicyTypeIcon';
import { PolicyMetadataBar } from '@/components/policies/PolicyMetadataBar';
import { PolicyContentViewer } from '@/components/policies/PolicyContentViewer';
import { PolicyTableOfContents } from '@/components/policies/PolicyTableOfContents';
import { PolicyAttachmentsPanel } from '@/components/policies/PolicyAttachmentsPanel';
import { PolicyVersionHistoryPanel } from '@/components/policies/PolicyVersionHistoryPanel';
import { PolicyRelatedPolicies } from '@/components/policies/PolicyRelatedPolicies';
import { PolicyAcknowledgementStatus } from '@/components/policies/PolicyAcknowledgementStatus';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function PolicyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('content');

  const { data: policy, isLoading } = usePolicy(id || '');
  const { data: versions } = usePolicyVersions(id || '');
  const { data: attachments } = usePolicyAttachments(id || '');
  const { data: comments } = usePolicyComments(id || '');

  const handleBack = () => {
    navigate('/policies');
  };

  const handleEdit = () => {
    navigate(`/policies/${id}/edit`);
  };

  const handleDownload = () => {
    toast.info('Download to Word feature coming soon');
  };

  const handleShare = () => {
    toast.info('Share policy feature coming soon');
  };

  const handleDuplicate = () => {
    toast.info('Duplicate policy feature coming soon');
  };

  const handleArchive = () => {
    toast.info('Archive policy feature coming soon');
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Policy Not Found</h2>
        <p className="text-muted-foreground mb-6">
          The policy you're looking for doesn't exist or has been removed.
        </p>
        <Button onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Policies
        </Button>
      </div>
    );
  }

  const isReviewOverdue = policy.review_date && new Date(policy.review_date) < new Date();
  const isReviewDueSoon = policy.review_date &&
    new Date(policy.review_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const openCommentsCount = comments?.filter(c => !c.is_resolved).length || 0;
  const attachmentsCount = attachments?.length || 0;
  const versionsCount = versions?.length || 0;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0 flex-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="shrink-0 mt-1"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="min-w-0 flex-1">
            {/* Policy Number */}
            <div className="text-sm text-muted-foreground font-mono mb-1">
              {policy.policy_number}
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              {policy.title}
            </h1>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <PolicyStatusBadge status={policy.status} />
              {policy.policy_type && (
                <PolicyTypeBadge policyType={policy.policy_type} />
              )}
              {policy.category && (
                <PolicyCategoryBadge category={policy.category} />
              )}
            </div>

            {/* Metadata */}
            <PolicyMetadataBar policy={policy} className="mb-2" />

            {/* Review Alert */}
            {isReviewOverdue && (
              <div className="flex items-center gap-2 text-sm text-destructive mt-3 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="font-medium">
                  Review overdue since {format(new Date(policy.review_date!), 'MMM dd, yyyy')}
                </span>
              </div>
            )}
            {isReviewDueSoon && !isReviewOverdue && (
              <div className="flex items-center gap-2 text-sm text-amber-600 mt-3 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <Clock className="h-4 w-4 shrink-0" />
                <span className="font-medium">
                  Review due {format(new Date(policy.review_date!), 'MMM dd, yyyy')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {policy.status === 'Draft' && (
            <Button onClick={handleEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download as Word
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleShare}>
                <Share className="h-4 w-4 mr-2" />
                Share Policy
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {policy.status !== 'Archived' && (
                <DropdownMenuItem
                  onClick={handleArchive}
                  className="text-destructive focus:text-destructive"
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Archive Policy
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar - Table of Contents */}
        <div className="lg:col-span-1">
          <PolicyTableOfContents policy={policy} />
        </div>

        {/* Center - Main Content */}
        <div className="lg:col-span-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="content" className="gap-1.5">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Content</span>
              </TabsTrigger>
              <TabsTrigger value="versions" className="gap-1.5">
                <GitBranch className="h-4 w-4" />
                <span className="hidden sm:inline">Versions</span>
                {versionsCount > 0 && (
                  <span className="ml-1 text-xs">({versionsCount})</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="attachments" className="gap-1.5">
                <Paperclip className="h-4 w-4" />
                <span className="hidden sm:inline">Files</span>
                {attachmentsCount > 0 && (
                  <span className="ml-1 text-xs">({attachmentsCount})</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="comments" className="gap-1.5">
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Comments</span>
                {openCommentsCount > 0 && (
                  <span className="ml-1 text-xs">({openCommentsCount})</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="acknowledgements" className="gap-1.5">
                <CheckCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Acks</span>
              </TabsTrigger>
              <TabsTrigger value="related" className="gap-1.5">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Related</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="mt-6">
              <PolicyContentViewer policy={policy} />
            </TabsContent>

            <TabsContent value="versions" className="mt-6">
              <PolicyVersionHistoryPanel policyId={policy.id} />
            </TabsContent>

            <TabsContent value="attachments" className="mt-6">
              <PolicyAttachmentsPanel policyId={policy.id} />
            </TabsContent>

            <TabsContent value="comments" className="mt-6">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground text-center py-8">
                    Comments feature coming soon
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="acknowledgements" className="mt-6">
              <PolicyAcknowledgementStatus policyId={policy.id} />
            </TabsContent>

            <TabsContent value="related" className="mt-6">
              <PolicyRelatedPolicies policyId={policy.id} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
