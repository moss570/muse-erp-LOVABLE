import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, FileText, CheckCircle, AlertTriangle, Link as LinkIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSQFCode } from '@/hooks/useSQFCodes';
import { useSQFCodeMappings } from '@/hooks/usePolicySQFMappings';
import { useSQFComplianceSummary } from '@/hooks/useSQFCodes';

export default function SQFCodeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: code, isLoading } = useSQFCode(id);
  const { data: mappings } = useSQFCodeMappings(id);
  const { data: complianceSummary } = useSQFComplianceSummary();

  const summary = complianceSummary?.find((s) => s.sqf_code_id === id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading SQF code...</div>
      </div>
    );
  }

  if (!code) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">SQF Code Not Found</h3>
          <p className="text-muted-foreground mb-4">
            The SQF code you're looking for doesn't exist
          </p>
          <Button onClick={() => navigate('/sqf/codes')}>
            Back to Library
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate('/sqf/codes')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Library
        </Button>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="font-mono">
                {code.code_number}
              </Badge>
              {code.is_fundamental && (
                <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                  <Star className="h-3 w-3 mr-1 fill-yellow-600" />
                  Fundamental
                </Badge>
              )}
              {code.module && <Badge variant="secondary">{code.module}</Badge>}
              {code.category && <Badge>{code.category}</Badge>}
            </div>
            <h1 className="text-3xl font-bold mb-2">{code.title}</h1>
            {code.description && (
              <p className="text-muted-foreground">{code.description}</p>
            )}
          </div>

          <Button onClick={() => navigate(`/sqf/codes/${id}/map`)}>
            <LinkIcon className="h-4 w-4 mr-2" />
            Map to Policy
          </Button>
        </div>
      </div>

      {/* Compliance Status Alert */}
      {summary && (
        <Alert variant={
          summary.overall_compliance_status === 'Fully_Compliant' ? 'default' :
          summary.overall_compliance_status === 'Not_Addressed' ? 'destructive' : undefined
        }>
          {summary.overall_compliance_status === 'Fully_Compliant' ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <AlertTitle>
            {summary.overall_compliance_status === 'Fully_Compliant' ? 'Fully Compliant' :
             summary.overall_compliance_status === 'Partially_Compliant' ? 'Partially Compliant' :
             summary.overall_compliance_status === 'Non_Compliant' ? 'Non-Compliant' :
             'Not Addressed'}
          </AlertTitle>
          <AlertDescription>
            {summary.total_policies_mapped > 0 ? (
              <>
                Addressed by {summary.total_policies_mapped} {summary.total_policies_mapped === 1 ? 'policy' : 'policies'}
                {summary.has_any_gaps && ` with ${summary.policies_with_gaps} gap(s) identified`}
              </>
            ) : (
              'This SQF requirement has not been mapped to any policies yet'
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs defaultValue="requirement" className="space-y-4">
        <TabsList>
          <TabsTrigger value="requirement">Requirement</TabsTrigger>
          <TabsTrigger value="guidance">Guidance & Verification</TabsTrigger>
          <TabsTrigger value="mappings">
            Policy Mappings {mappings && mappings.length > 0 && `(${mappings.length})`}
          </TabsTrigger>
          <TabsTrigger value="related">Related Codes</TabsTrigger>
        </TabsList>

        {/* Requirement Tab */}
        <TabsContent value="requirement" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Requirement Text</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <p className="text-base leading-relaxed whitespace-pre-wrap">
                  {code.requirement_text}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Classification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Section</div>
                  <div>{code.section || '—'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Sub-Section</div>
                  <div>{code.sub_section || '—'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Category</div>
                  <div>{code.category || '—'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Module</div>
                  <div>{code.module || '—'}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Attributes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Fundamental Requirement</span>
                  {code.is_fundamental ? (
                    <Badge className="bg-yellow-600">Yes</Badge>
                  ) : (
                    <Badge variant="outline">No</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Mandatory</span>
                  {code.is_mandatory ? (
                    <Badge className="bg-green-600">Yes</Badge>
                  ) : (
                    <Badge variant="outline">No</Badge>
                  )}
                </div>
                {code.applies_to && code.applies_to.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Applies To</div>
                    <div className="flex flex-wrap gap-1">
                      {code.applies_to.map((item) => (
                        <Badge key={item} variant="secondary" className="text-xs">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Guidance Tab */}
        <TabsContent value="guidance" className="space-y-4">
          {code.guidance_notes && (
            <Card>
              <CardHeader>
                <CardTitle>Guidance Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{code.guidance_notes}</p>
              </CardContent>
            </Card>
          )}

          {code.examples && (
            <Card>
              <CardHeader>
                <CardTitle>Examples</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{code.examples}</p>
              </CardContent>
            </Card>
          )}

          {code.common_pitfalls && (
            <Card>
              <CardHeader>
                <CardTitle>Common Pitfalls</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{code.common_pitfalls}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Verification Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {code.verification_methods && code.verification_methods.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Verification Methods</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {code.verification_methods.map((method, idx) => (
                      <li key={idx} className="text-sm">{method}</li>
                    ))}
                  </ul>
                </div>
              )}

              {code.evidence_required && code.evidence_required.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Evidence Required</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {code.evidence_required.map((evidence, idx) => (
                      <li key={idx} className="text-sm">{evidence}</li>
                    ))}
                  </ul>
                </div>
              )}

              {code.documentation_needed && code.documentation_needed.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Documentation Needed</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {code.documentation_needed.map((doc, idx) => (
                      <li key={idx} className="text-sm">{doc}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mappings Tab */}
        <TabsContent value="mappings">
          <Card>
            <CardHeader>
              <CardTitle>Policy Mappings</CardTitle>
              <CardDescription>
                Policies that address this SQF requirement
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!mappings || mappings.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Mappings</h3>
                  <p className="text-muted-foreground mb-4">
                    This SQF code hasn't been mapped to any policies yet
                  </p>
                  <Button onClick={() => navigate(`/sqf/codes/${id}/map`)}>
                    Create Mapping
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {mappings.map((mapping) => (
                    <Card key={mapping.id} className="cursor-pointer hover:bg-accent/50 transition-colors"
                          onClick={() => navigate(`/policies/${mapping.policy_id}`)}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="font-mono text-xs">
                                {mapping.policy?.policy_number}
                              </Badge>
                              <Badge variant={
                                mapping.compliance_status === 'Compliant' ? 'default' :
                                mapping.compliance_status === 'Partial' ? 'secondary' :
                                mapping.compliance_status === 'Non_Compliant' ? 'destructive' : 'outline'
                              }>
                                {mapping.compliance_status.replace('_', ' ')}
                              </Badge>
                              {mapping.has_gaps && (
                                <Badge variant="destructive">
                                  {mapping.gap_severity} Gap
                                </Badge>
                              )}
                            </div>
                            <h4 className="font-semibold">{mapping.policy?.title}</h4>
                            {mapping.evidence_description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {mapping.evidence_description}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Related Codes Tab */}
        <TabsContent value="related">
          <Card>
            <CardHeader>
              <CardTitle>Related SQF Codes</CardTitle>
              <CardDescription>
                Related requirements and cross-references
              </CardDescription>
            </CardHeader>
            <CardContent>
              {code.supersedes && (
                <div className="mb-4">
                  <h4 className="font-medium mb-2">Supersedes</h4>
                  <Card className="cursor-pointer hover:bg-accent/50" onClick={() => navigate(`/sqf/codes/${code.supersedes?.id}`)}>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs">
                          {code.supersedes.code_number}
                        </Badge>
                        <span className="text-sm">{code.supersedes.title}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {code.related_codes && code.related_codes.length > 0 ? (
                <div>
                  <h4 className="font-medium mb-2">Related Codes</h4>
                  <div className="space-y-2">
                    {code.related_codes.map((relatedCode) => (
                      <Card key={relatedCode.id} className="cursor-pointer hover:bg-accent/50"
                            onClick={() => navigate(`/sqf/codes/${relatedCode.id}`)}>
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-xs">
                              {relatedCode.code_number}
                            </Badge>
                            <span className="text-sm">{relatedCode.title}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No related codes
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
