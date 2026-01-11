import { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  FileText, 
  Plus, 
  ExternalLink, 
  MoreHorizontal,
  RefreshCw,
  History,
  Eye
} from 'lucide-react';
import { useComplianceDocuments, type EntityType } from '@/hooks/useComplianceDocuments';
import { DocumentExpirationBadge } from './DocumentExpirationBadge';
import { ComplianceDocumentUploadDialog } from './ComplianceDocumentUploadDialog';
import { DocumentRenewalDialog } from './DocumentRenewalDialog';
import { cn } from '@/lib/utils';

interface ComplianceDocumentsPanelProps {
  entityId: string;
  entityType: EntityType;
  entityName: string;
  showArchived?: boolean;
  className?: string;
}

export function ComplianceDocumentsPanel({
  entityId,
  entityType,
  entityName,
  showArchived = false,
  className,
}: ComplianceDocumentsPanelProps) {
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [renewDocument, setRenewDocument] = useState<{
    id: string;
    name: string;
    type: string;
  } | null>(null);
  const [viewArchived, setViewArchived] = useState(showArchived);

  const { data: documents, isLoading } = useComplianceDocuments(entityId, entityType);

  const filteredDocuments = documents?.filter(
    (doc) => viewArchived || doc.is_current
  );

  const currentDocuments = documents?.filter((doc) => doc.is_current) || [];
  const archivedCount = (documents?.length || 0) - currentDocuments.length;

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Compliance Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Compliance Documents
            {currentDocuments.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {currentDocuments.length}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {archivedCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewArchived(!viewArchived)}
                className="text-muted-foreground"
              >
                <History className="h-4 w-4 mr-1" />
                {viewArchived ? 'Hide' : 'Show'} Archived ({archivedCount})
              </Button>
            )}
            <Button size="sm" onClick={() => setShowUploadDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Upload
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredDocuments && filteredDocuments.length > 0 ? (
            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Expiration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <TableRow
                      key={doc.id}
                      className={cn(!doc.is_current && 'opacity-50')}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className={cn(!doc.is_current && 'line-through')}>
                            {doc.document_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {doc.document_type.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {doc.expiration_date ? (
                          format(new Date(doc.expiration_date), 'MMM d, yyyy')
                        ) : (
                          <span className="text-muted-foreground">No expiry</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {doc.is_current ? (
                          <DocumentExpirationBadge
                            expirationDate={doc.expiration_date}
                            size="sm"
                            showDays={false}
                          />
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Archived
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {doc.file_url && (
                              <DropdownMenuItem asChild>
                                <a
                                  href={doc.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  View Document
                                </a>
                              </DropdownMenuItem>
                            )}
                            {doc.is_current && (
                              <DropdownMenuItem
                                onClick={() =>
                                  setRenewDocument({
                                    id: doc.id,
                                    name: doc.document_name,
                                    type: doc.document_type,
                                  })
                                }
                              >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Upload Renewal
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No compliance documents uploaded yet</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setShowUploadDialog(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Upload First Document
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ComplianceDocumentUploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        entityId={entityId}
        entityType={entityType}
        entityName={entityName}
      />

      {renewDocument && (
        <DocumentRenewalDialog
          open={true}
          onOpenChange={() => setRenewDocument(null)}
          documentId={renewDocument.id}
          documentName={renewDocument.name}
          documentType={renewDocument.type}
        />
      )}
    </>
  );
}
