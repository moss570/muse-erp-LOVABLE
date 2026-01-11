import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

interface Document {
  id: string;
  document_name: string;
  requirement_id?: string;
  expiry_date?: string;
  file_path?: string;
  file_url?: string;
}

interface Requirement {
  id: string;
  document_name: string;
  is_required?: boolean;
}

interface DocumentComplianceSummaryProps {
  documents: Document[];
  requirements: Requirement[];
  entityType: 'supplier' | 'material';
}

export function DocumentComplianceSummary({ 
  documents, 
  requirements,
  entityType 
}: DocumentComplianceSummaryProps) {
  // Calculate required documents status
  const requiredDocs = requirements.filter(r => r.is_required);
  const uploadedRequiredDocs = requiredDocs.filter(req => 
    documents.some(d => d.requirement_id === req.id && (d.file_path || d.file_url))
  );
  const missingRequiredDocs = requiredDocs.filter(req => 
    !documents.some(d => d.requirement_id === req.id && (d.file_path || d.file_url))
  );

  // Calculate expiration status
  const today = new Date();
  const docsWithExpiry = documents.filter(d => d.expiry_date);
  
  const expiredDocs = docsWithExpiry.filter(d => {
    const expiryDate = parseISO(d.expiry_date!);
    return expiryDate < today;
  });

  const expiringSoonDocs = docsWithExpiry.filter(d => {
    const expiryDate = parseISO(d.expiry_date!);
    const daysUntilExpiry = differenceInDays(expiryDate, today);
    return daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
  });

  const validDocs = docsWithExpiry.filter(d => {
    const expiryDate = parseISO(d.expiry_date!);
    const daysUntilExpiry = differenceInDays(expiryDate, today);
    return daysUntilExpiry > 30;
  });

  // Overall compliance status
  const isFullyCompliant = missingRequiredDocs.length === 0 && expiredDocs.length === 0;
  const hasWarnings = expiringSoonDocs.length > 0;
  const hasIssues = missingRequiredDocs.length > 0 || expiredDocs.length > 0;

  return (
    <Card className={
      hasIssues 
        ? 'border-destructive/50 bg-destructive/5' 
        : hasWarnings 
          ? 'border-amber-500/50 bg-amber-500/5' 
          : 'border-green-500/50 bg-green-500/5'
    }>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Document Compliance
          {isFullyCompliant && !hasWarnings && (
            <Badge variant="outline" className="ml-auto bg-green-500/10 text-green-700 border-green-500/30">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Compliant
            </Badge>
          )}
          {hasWarnings && !hasIssues && (
            <Badge variant="outline" className="ml-auto bg-amber-500/10 text-amber-700 border-amber-500/30">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Attention Needed
            </Badge>
          )}
          {hasIssues && (
            <Badge variant="outline" className="ml-auto bg-destructive/10 text-destructive border-destructive/30">
              <XCircle className="h-3 w-3 mr-1" />
              Issues Found
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Required Documents Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Required Documents</span>
            <span className="font-medium">
              {uploadedRequiredDocs.length} / {requiredDocs.length}
            </span>
          </div>
          
          {missingRequiredDocs.length > 0 && (
            <div className="pl-3 border-l-2 border-destructive/50 space-y-1">
              <p className="text-xs font-medium text-destructive">Missing Required:</p>
              {missingRequiredDocs.map(req => (
                <p key={req.id} className="text-xs text-muted-foreground flex items-center gap-1">
                  <XCircle className="h-3 w-3 text-destructive" />
                  {req.document_name}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Expiration Status */}
        {docsWithExpiry.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-sm text-muted-foreground">Document Expiration</p>
            
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className={`p-2 rounded-md ${expiredDocs.length > 0 ? 'bg-destructive/10' : 'bg-muted/50'}`}>
                <p className={`text-lg font-semibold ${expiredDocs.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {expiredDocs.length}
                </p>
                <p className="text-xs text-muted-foreground">Expired</p>
              </div>
              <div className={`p-2 rounded-md ${expiringSoonDocs.length > 0 ? 'bg-amber-500/10' : 'bg-muted/50'}`}>
                <p className={`text-lg font-semibold ${expiringSoonDocs.length > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                  {expiringSoonDocs.length}
                </p>
                <p className="text-xs text-muted-foreground">Expiring Soon</p>
              </div>
              <div className="p-2 rounded-md bg-muted/50">
                <p className="text-lg font-semibold text-green-600">{validDocs.length}</p>
                <p className="text-xs text-muted-foreground">Valid</p>
              </div>
            </div>

            {expiredDocs.length > 0 && (
              <div className="pl-3 border-l-2 border-destructive/50 space-y-1">
                <p className="text-xs font-medium text-destructive">Expired Documents:</p>
                {expiredDocs.map(doc => (
                  <p key={doc.id} className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3 text-destructive" />
                    {doc.document_name}
                  </p>
                ))}
              </div>
            )}

            {expiringSoonDocs.length > 0 && (
              <div className="pl-3 border-l-2 border-amber-500/50 space-y-1">
                <p className="text-xs font-medium text-amber-600">Expiring within 30 days:</p>
                {expiringSoonDocs.map(doc => {
                  const daysLeft = differenceInDays(parseISO(doc.expiry_date!), today);
                  return (
                    <p key={doc.id} className="text-xs text-muted-foreground flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                      {doc.document_name} ({daysLeft} days)
                    </p>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Summary note */}
        <p className="text-xs text-muted-foreground pt-2 border-t">
          Review documents in the "Documents" tab to upload or renew.
        </p>
      </CardContent>
    </Card>
  );
}
