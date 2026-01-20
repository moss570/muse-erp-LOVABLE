import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMyHRDocuments, useMyPersonalDocuments, useHRDocumentTemplate, useSignHRDocument, EmployeeHRDocument } from '@/hooks/useHRDocuments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, CheckCircle, Clock, AlertTriangle, Download, Pen, Eye } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { cn } from '@/lib/utils';
import SignaturePad from '@/components/shared/SignaturePad';
import { supabase } from '@/integrations/supabase/client';

const MyDocuments = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const signDocId = searchParams.get('sign');
  const [activeTab, setActiveTab] = useState('pending');
  const [viewingDocId, setViewingDocId] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  
  const { data: hrDocuments } = useMyHRDocuments();
  const { data: personalDocuments } = useMyPersonalDocuments();
  const signDocument = useSignHRDocument();
  
  // Find document to sign
  const documentToSign = hrDocuments?.find(d => d.id === signDocId);
  const { data: templateToSign } = useHRDocumentTemplate(documentToSign?.template_id);
  
  // Filter HR documents
  const pendingDocs = hrDocuments?.filter(d => d.status === 'pending');
  const signedDocs = hrDocuments?.filter(d => d.status === 'signed');
  
  const handleSign = async () => {
    if (!signDocId || !signature) return;
    await signDocument.mutateAsync({
      document_id: signDocId,
      signature_data: signature,
    });
    setSearchParams({});
    setSignature(null);
  };

  const getDownloadUrl = async (filePath: string) => {
    const { data } = await supabase.storage.from('hr-documents').createSignedUrl(filePath, 3600);
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    }
  };
  
  const getStatusBadge = (doc: EmployeeHRDocument) => {
    if (doc.status === 'signed') {
      return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Signed</Badge>;
    }
    if (doc.due_date && isPast(new Date(doc.due_date))) {
      return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Overdue</Badge>;
    }
    return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
  };
  
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      policy: 'bg-blue-100 text-blue-700',
      handbook: 'bg-green-100 text-green-700',
      form: 'bg-purple-100 text-purple-700',
      training: 'bg-orange-100 text-orange-700',
      safety: 'bg-red-100 text-red-700',
      other: 'bg-gray-100 text-gray-700',
    };
    return colors[category] || colors.other;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            My Documents
          </h1>
          <p className="text-muted-foreground">View and sign your HR documents</p>
        </div>
      </div>
      
      {/* Alert for pending signatures */}
      {pendingDocs && pendingDocs.length > 0 && (
        <Card className="border-orange-300 bg-orange-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <span className="font-medium text-orange-800">
                {pendingDocs.length} document{pendingDocs.length !== 1 ? 's' : ''} require{pendingDocs.length === 1 ? 's' : ''} your signature
              </span>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">
            Pending Signature ({pendingDocs?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="signed">
            Signed ({signedDocs?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="personal">
            My Files ({personalDocuments?.length || 0})
          </TabsTrigger>
        </TabsList>
        
        {/* Pending Documents */}
        <TabsContent value="pending" className="space-y-4">
          {pendingDocs?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <p className="text-muted-foreground">All documents signed!</p>
              </CardContent>
            </Card>
          ) : (
            pendingDocs?.map((doc) => (
              <Card key={doc.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-muted">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{doc.template?.name}</h3>
                          <Badge className={cn("text-xs", getCategoryColor(doc.template?.category || 'other'))}>
                            {doc.template?.category}
                          </Badge>
                        </div>
                        {doc.template?.description && (
                          <p className="text-sm text-muted-foreground">{doc.template.description}</p>
                        )}
                        {doc.due_date && (
                          <p className={cn("text-sm", isPast(new Date(doc.due_date)) ? "text-red-600" : "text-muted-foreground")}>
                            Due: {format(new Date(doc.due_date), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(doc)}
                      <Button variant="outline" size="sm" onClick={() => setViewingDocId(doc.template_id)}>
                        <Eye className="h-4 w-4 mr-1" />View
                      </Button>
                      <Button size="sm" onClick={() => setSearchParams({ sign: doc.id })}>
                        <Pen className="h-4 w-4 mr-1" />Sign
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
        
        {/* Signed Documents */}
        <TabsContent value="signed" className="space-y-4">
          {signedDocs?.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-green-100">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">{doc.template?.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Signed on {doc.signed_at && format(new Date(doc.signed_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setViewingDocId(doc.template_id)}>
                    <Eye className="h-4 w-4 mr-1" />View
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        
        {/* Personal Documents */}
        <TabsContent value="personal" className="space-y-4">
          {personalDocuments?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No personal documents uploaded
              </CardContent>
            </Card>
          ) : (
            personalDocuments?.map((doc) => (
              <Card key={doc.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-muted">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-medium">{doc.name}</h3>
                        <p className="text-sm text-muted-foreground">{doc.document_type.replace('_', ' ')}</p>
                        {doc.expiry_date && (
                          <p className={cn("text-sm", isPast(new Date(doc.expiry_date)) ? "text-red-600" : "text-muted-foreground")}>
                            {isPast(new Date(doc.expiry_date)) ? 'Expired' : 'Expires'}: {format(new Date(doc.expiry_date), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => getDownloadUrl(doc.file_path)}>
                      <Download className="h-4 w-4 mr-1" />Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
      
      {/* Sign Document Dialog */}
      <Dialog open={!!signDocId} onOpenChange={(open) => !open && setSearchParams({})}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Sign Document: {templateToSign?.name}</DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 pr-4">
            {/* Document Content */}
            {templateToSign?.content && (
              <div className="prose prose-sm max-w-none mb-6">
                <div dangerouslySetInnerHTML={{ __html: templateToSign.content }} />
              </div>
            )}
            
            {templateToSign?.file_path && (
              <div className="mb-6">
                <Button variant="outline" onClick={() => getDownloadUrl(templateToSign.file_path!)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Document to Review
                </Button>
              </div>
            )}
            
            {/* Signature Section */}
            <div className="border-t pt-6 space-y-4">
              {templateToSign?.signature_text && (
                <p className="text-sm font-medium">{templateToSign.signature_text}</p>
              )}
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  By signing below, I acknowledge that I have read and understand this document.
                </p>
                <SignaturePad value={signature} onChange={setSignature} />
              </div>
            </div>
          </ScrollArea>
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setSearchParams({})}>
              Cancel
            </Button>
            <Button onClick={handleSign} disabled={!signature || signDocument.isPending}>
              <Pen className="h-4 w-4 mr-2" />
              Sign Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* View Document Dialog */}
      <ViewDocumentDialog 
        templateId={viewingDocId} 
        open={!!viewingDocId} 
        onOpenChange={(open) => !open && setViewingDocId(null)}
      />
    </div>
  );
};

// View Document Dialog Component
const ViewDocumentDialog = ({ templateId, open, onOpenChange }: { templateId: string | null; open: boolean; onOpenChange: (open: boolean) => void }) => {
  const { data: template } = useHRDocumentTemplate(templateId || undefined);

  const getDownloadUrl = async (filePath: string) => {
    const { data } = await supabase.storage.from('hr-documents').createSignedUrl(filePath, 3600);
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{template?.name}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          {template?.content && (
            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: template.content }} />
          )}
          {template?.file_path && (
            <Button variant="outline" onClick={() => getDownloadUrl(template.file_path!)}>
              <Download className="h-4 w-4 mr-2" />Download Document
            </Button>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default MyDocuments;
