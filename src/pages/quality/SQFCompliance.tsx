import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Plus, Search, FileText, BookOpen, ClipboardCheck, Upload, Settings } from "lucide-react";
import { useSQFEditions, useSQFCodes, useSQFComplianceAudits } from "@/hooks/useSQF";
import { format } from "date-fns";
import SQFEditionUploadDialog from "@/components/sqf/SQFEditionUploadDialog";
import SQFEditionSettingsDialog from "@/components/sqf/SQFEditionSettingsDialog";
import { useAuth } from "@/contexts/AuthContext";

export default function SQFCompliance() {
  const { isManager } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedEdition, setSelectedEdition] = useState<any>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const { data: editions } = useSQFEditions();
  const currentEdition = editions?.find(e => e.is_active);
  const { data: codes } = useSQFCodes(currentEdition?.id);
  const { data: audits } = useSQFComplianceAudits();

  const filteredCodes = codes?.filter(code =>
    code.code_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    code.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalCodes = codes?.length || 0;
  const mandatoryCodes = codes?.filter(c => c.is_mandatory).length || 0;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SQF Compliance</h1>
          <p className="text-muted-foreground">Manage SQF code requirements and compliance tracking</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><FileText className="mr-2 h-4 w-4" />Export Report</Button>
          {isManager && (
            <Button variant="outline" onClick={() => setIsUploadOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />Upload SQF Code
            </Button>
          )}
          <Button><Plus className="mr-2 h-4 w-4" />New Audit</Button>
        </div>
      </div>

      {currentEdition ? (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <BookOpen className="h-8 w-8 text-primary" />
                <div>
                  <h3 className="font-semibold">Current Edition: {currentEdition.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Version {currentEdition.version} • Effective {currentEdition.effective_date ? format(new Date(currentEdition.effective_date), "MMM d, yyyy") : "N/A"}
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{totalCodes}</div>
                  <div className="text-xs text-muted-foreground">Total Codes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{mandatoryCodes}</div>
                  <div className="text-xs text-muted-foreground">Mandatory</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No SQF Edition Uploaded</h3>
            <p className="text-muted-foreground mb-4">
              Upload your SQF Code PDF to get started. AI will automatically extract all code requirements.
            </p>
            {isManager && (
              <Button onClick={() => setIsUploadOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Upload SQF Code Document
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="codes">SQF Codes</TabsTrigger>
          <TabsTrigger value="editions">Editions</TabsTrigger>
          <TabsTrigger value="audits">Audits</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Compliance Score</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">87%</div><Progress value={87} className="mt-2" /></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Mapped Policies</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">42</div><p className="text-xs text-muted-foreground">of {totalCodes} requirements</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Open Findings</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-destructive">3</div><p className="text-xs text-muted-foreground">Requires action</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Next Audit</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">15</div><p className="text-xs text-muted-foreground">days remaining</p></CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="codes" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div><CardTitle>SQF Code Requirements</CardTitle><CardDescription>Browse and manage SQF code mappings</CardDescription></div>
                <div className="relative w-64"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search codes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8" /></div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-32">Code</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead className="w-24">Category</TableHead>
                      <TableHead className="w-24">Mandatory</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCodes?.map((code) => (
                      <TableRow key={code.id}>
                        <TableCell className="font-mono font-medium">{code.code_number}</TableCell>
                        <TableCell><div className="font-medium">{code.title}</div></TableCell>
                        <TableCell>{code.category || "—"}</TableCell>
                        <TableCell>{code.is_mandatory ? <Badge variant="destructive">Required</Badge> : <Badge variant="outline">Optional</Badge>}</TableCell>
                        <TableCell><Button variant="ghost" size="sm"><ClipboardCheck className="h-4 w-4" /></Button></TableCell>
                      </TableRow>
                    ))}
                    {(!filteredCodes || filteredCodes.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          {currentEdition ? "No codes found. AI parsing may still be in progress." : "Upload an SQF edition to view codes."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="editions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div><CardTitle>SQF Editions</CardTitle><CardDescription>Manage uploaded SQF code editions</CardDescription></div>
                {isManager && (
                  <Button onClick={() => setIsUploadOpen(true)}>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload New Edition
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Edition</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Effective Date</TableHead>
                    <TableHead>Codes Extracted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {editions?.map((edition) => (
                    <TableRow key={edition.id}>
                      <TableCell className="font-medium">{edition.name}</TableCell>
                      <TableCell>{edition.version}</TableCell>
                      <TableCell>
                        {edition.effective_date ? format(new Date(edition.effective_date), "MMM d, yyyy") : "—"}
                      </TableCell>
                      <TableCell>{edition.codes_extracted || 0}</TableCell>
                      <TableCell>
                        {edition.is_active ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setSelectedEdition(edition);
                            setIsSettingsOpen(true);
                          }}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!editions || editions.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No editions uploaded yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audits" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>SQF Audits</CardTitle><CardDescription>Manage compliance audits and findings</CardDescription></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Audit Number</TableHead><TableHead>Type</TableHead><TableHead>Date</TableHead><TableHead>Auditor</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {audits?.map((audit) => (
                    <TableRow key={audit.id}>
                      <TableCell className="font-medium">{audit.audit_number}</TableCell>
                      <TableCell className="capitalize">{audit.audit_type?.replace("_", " ")}</TableCell>
                      <TableCell>{format(new Date(audit.audit_date), "MMM d, yyyy")}</TableCell>
                      <TableCell>{audit.auditor_name || "—"}</TableCell>
                      <TableCell><Badge variant={audit.status === "completed" ? "default" : "secondary"}>{audit.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {(!audits || audits.length === 0) && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No audits scheduled</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upload Dialog */}
      <SQFEditionUploadDialog open={isUploadOpen} onOpenChange={setIsUploadOpen} />
      
      {/* Edition Settings Dialog */}
      <SQFEditionSettingsDialog 
        edition={selectedEdition} 
        open={isSettingsOpen} 
        onOpenChange={setIsSettingsOpen} 
      />
    </div>
  );
}
