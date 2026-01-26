import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, AlertTriangle, AlertCircle, TrendingUp, FileText, Star } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useActiveSQFEdition } from '@/hooks/useSQFEditions';
import { useSQFComplianceSummary } from '@/hooks/useSQFCodes';
import { useMappingsWithGaps } from '@/hooks/usePolicySQFMappings';

export default function SQFComplianceDashboard() {
  const navigate = useNavigate();
  const { data: activeEdition } = useActiveSQFEdition();
  const { data: complianceSummary } = useSQFComplianceSummary(activeEdition?.id);
  const { data: criticalGaps } = useMappingsWithGaps('Critical');
  const { data: allGaps } = useMappingsWithGaps();

  // Calculate overall statistics
  const totalCodes = complianceSummary?.length || 0;
  const fullyCompliant = complianceSummary?.filter(c => c.overall_compliance_status === 'Fully_Compliant').length || 0;
  const partiallyCompliant = complianceSummary?.filter(c => c.overall_compliance_status === 'Partially_Compliant').length || 0;
  const notAddressed = complianceSummary?.filter(c => c.overall_compliance_status === 'Not_Addressed').length || 0;
  const totalFundamental = complianceSummary?.filter(c => c.is_fundamental).length || 0;
  const fundamentalCompliant = complianceSummary?.filter(c => c.is_fundamental && c.overall_compliance_status === 'Fully_Compliant').length || 0;

  const overallCompliancePercentage = totalCodes > 0 ? Math.round((fullyCompliant / totalCodes) * 100) : 0;
  const fundamentalCompliancePercentage = totalFundamental > 0 ? Math.round((fundamentalCompliant / totalFundamental) * 100) : 0;

  // Group codes by category
  const codesByCategory = complianceSummary?.reduce((acc, code) => {
    const category = code.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(code);
    return acc;
  }, {} as Record<string, typeof complianceSummary>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">SQF Compliance Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          {activeEdition ? `${activeEdition.edition_name} Compliance Status` : 'No Active Edition'}
        </p>
      </div>

      {!activeEdition ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Active SQF Edition</h3>
            <p className="text-muted-foreground mb-4">
              Please upload and activate an SQF edition to view compliance
            </p>
            <Button onClick={() => navigate('/settings/sqf-editions')}>
              Go to SQF Editions
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Overall Statistics */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">{overallCompliancePercentage}%</div>
                    <div className="text-sm text-muted-foreground mt-1">Overall Compliance</div>
                  </div>
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
                <Progress value={overallCompliancePercentage} className="mt-3" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-green-600">{fullyCompliant}</div>
                    <div className="text-sm text-muted-foreground mt-1">Fully Compliant</div>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  of {totalCodes} total codes
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-orange-600">{notAddressed}</div>
                    <div className="text-sm text-muted-foreground mt-1">Not Addressed</div>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-orange-600" />
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  require attention
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-red-600">{allGaps?.length || 0}</div>
                    <div className="text-sm text-muted-foreground mt-1">Active Gaps</div>
                  </div>
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {criticalGaps?.length || 0} critical
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Fundamental Requirements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-600 fill-yellow-600" />
                Fundamental Requirements
              </CardTitle>
              <CardDescription>
                Critical requirements that must be met for SQF certification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      {fundamentalCompliant} of {totalFundamental} Compliant
                    </span>
                    <span className="text-sm font-medium">{fundamentalCompliancePercentage}%</span>
                  </div>
                  <Progress value={fundamentalCompliancePercentage} className="h-3" />
                </div>

                {complianceSummary?.filter(c => c.is_fundamental && c.overall_compliance_status !== 'Fully_Compliant').length > 0 && (
                  <div className="pt-4">
                    <h4 className="font-medium mb-3">Action Required</h4>
                    <div className="space-y-2">
                      {complianceSummary
                        ?.filter(c => c.is_fundamental && c.overall_compliance_status !== 'Fully_Compliant')
                        .slice(0, 5)
                        .map(code => (
                          <Card key={code.sqf_code_id} className="cursor-pointer hover:bg-accent/50"
                                onClick={() => navigate(`/sqf/codes/${code.sqf_code_id}`)}>
                            <CardContent className="py-3 flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="font-mono text-xs">
                                    {code.code_number}
                                  </Badge>
                                  <span className="text-sm font-medium">{code.code_title}</span>
                                </div>
                              </div>
                              <Badge variant={code.overall_compliance_status === 'Not_Addressed' ? 'destructive' : 'secondary'}>
                                {code.overall_compliance_status.replace('_', ' ')}
                              </Badge>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tabs for detailed views */}
          <Tabs defaultValue="by-category" className="space-y-4">
            <TabsList>
              <TabsTrigger value="by-category">By Category</TabsTrigger>
              <TabsTrigger value="gaps">Gaps & Issues</TabsTrigger>
              <TabsTrigger value="not-addressed">Not Addressed</TabsTrigger>
            </TabsList>

            {/* By Category Tab */}
            <TabsContent value="by-category">
              <Card>
                <CardHeader>
                  <CardTitle>Compliance by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Compliant</TableHead>
                        <TableHead className="text-right">Partial</TableHead>
                        <TableHead className="text-right">Not Addressed</TableHead>
                        <TableHead className="text-right">%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {codesByCategory && Object.entries(codesByCategory).map(([category, codes]) => {
                        const total = codes.length;
                        const compliant = codes.filter(c => c.overall_compliance_status === 'Fully_Compliant').length;
                        const partial = codes.filter(c => c.overall_compliance_status === 'Partially_Compliant').length;
                        const notAddr = codes.filter(c => c.overall_compliance_status === 'Not_Addressed').length;
                        const percentage = Math.round((compliant / total) * 100);

                        return (
                          <TableRow key={category}>
                            <TableCell className="font-medium">{category}</TableCell>
                            <TableCell className="text-right">{total}</TableCell>
                            <TableCell className="text-right text-green-600">{compliant}</TableCell>
                            <TableCell className="text-right text-orange-600">{partial}</TableCell>
                            <TableCell className="text-right text-red-600">{notAddr}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Progress value={percentage} className="w-20 h-2" />
                                <span className="text-sm font-medium w-12">{percentage}%</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Gaps Tab */}
            <TabsContent value="gaps">
              <Card>
                <CardHeader>
                  <CardTitle>Compliance Gaps</CardTitle>
                  <CardDescription>
                    SQF codes with identified compliance gaps
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!allGaps || allGaps.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircle className="h-12 w-12 mx-auto text-green-600 mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Gaps Identified</h3>
                      <p className="text-muted-foreground">
                        All mapped SQF codes are currently compliant
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {allGaps.map(gap => (
                        <Card key={gap.id} className="cursor-pointer hover:bg-accent/50"
                              onClick={() => navigate(`/policies/${gap.policy_id}`)}>
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="font-mono text-xs">
                                    {gap.sqf_code?.code_number}
                                  </Badge>
                                  <Badge variant="destructive">{gap.gap_severity} Gap</Badge>
                                  <Badge variant="outline">{gap.policy?.policy_number}</Badge>
                                </div>
                                <h4 className="font-semibold mb-1">{gap.policy?.title}</h4>
                                {gap.gap_description && (
                                  <p className="text-sm text-muted-foreground">{gap.gap_description}</p>
                                )}
                                {gap.gap_target_date && (
                                  <p className="text-xs text-muted-foreground mt-2">
                                    Target: {new Date(gap.gap_target_date).toLocaleDateString()}
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

            {/* Not Addressed Tab */}
            <TabsContent value="not-addressed">
              <Card>
                <CardHeader>
                  <CardTitle>Not Addressed Requirements</CardTitle>
                  <CardDescription>
                    SQF codes that haven't been mapped to any policies yet
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {complianceSummary?.filter(c => c.overall_compliance_status === 'Not_Addressed').length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircle className="h-12 w-12 mx-auto text-green-600 mb-4" />
                      <h3 className="text-lg font-medium mb-2">All Codes Addressed</h3>
                      <p className="text-muted-foreground">
                        Every SQF code has been mapped to at least one policy
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {complianceSummary
                          ?.filter(c => c.overall_compliance_status === 'Not_Addressed')
                          .map(code => (
                            <TableRow key={code.sqf_code_id}
                                      className="cursor-pointer hover:bg-accent/50"
                                      onClick={() => navigate(`/sqf/codes/${code.sqf_code_id}`)}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="font-mono text-xs">
                                    {code.code_number}
                                  </Badge>
                                  {code.is_fundamental && (
                                    <Star className="h-3 w-3 text-yellow-600 fill-yellow-600" />
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>{code.code_title}</TableCell>
                              <TableCell>
                                <Badge variant="secondary">{code.category}</Badge>
                              </TableCell>
                              <TableCell>
                                <Button size="sm" variant="outline"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigate(`/sqf/codes/${code.sqf_code_id}/map`);
                                        }}>
                                  Map
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
