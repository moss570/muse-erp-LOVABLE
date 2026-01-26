import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Search, Clock, AlertTriangle, CheckCircle, Calendar } from "lucide-react";
import { useEmployeePolicyTrainings, useOverdueTrainingsCount, useExpiringTrainings } from "@/hooks/usePolicyTraining";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; color: string }> = {
  not_started: { label: "Not Started", color: "bg-muted text-muted-foreground" },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-800" },
  completed: { label: "Completed", color: "bg-green-100 text-green-800" },
  expired: { label: "Expired", color: "bg-red-100 text-red-800" },
  failed: { label: "Failed", color: "bg-destructive text-destructive-foreground" },
};

export default function PolicyTraining() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  
  const { data: trainings, isLoading } = useEmployeePolicyTrainings();
  const { data: overdueCount } = useOverdueTrainingsCount();
  const { data: expiringTrainings } = useExpiringTrainings(30);

  const filteredTrainings = trainings?.filter(training => {
    const employeeName = `${training.employee?.first_name || ""} ${training.employee?.last_name || ""}`.toLowerCase();
    const policyTitle = training.policy?.title?.toLowerCase() || "";
    return employeeName.includes(searchQuery.toLowerCase()) || policyTitle.includes(searchQuery.toLowerCase());
  });

  const totalTrainings = trainings?.length || 0;
  const completedTrainings = trainings?.filter(t => t.status === "completed").length || 0;
  const inProgressTrainings = trainings?.filter(t => t.status === "in_progress").length || 0;
  const overallComplianceRate = totalTrainings > 0 ? Math.round((completedTrainings / totalTrainings) * 100) : 0;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Policy Training</h1>
          <p className="text-muted-foreground">
            Track employee training and compliance across all policies
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            Schedule Training
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Assign Training
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="expiring">Expiring Soon</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Overall Compliance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{overallComplianceRate}%</div>
                <Progress value={overallComplianceRate} className="mt-2" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{completedTrainings}</div>
                <p className="text-xs text-muted-foreground">of {totalTrainings} assignments</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{inProgressTrainings}</div>
                <p className="text-xs text-muted-foreground">Active training</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-destructive">{overdueCount}</div>
                <p className="text-xs text-muted-foreground">Requires attention</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Overdue Training
                </CardTitle>
                <CardDescription>Employees with past-due training assignments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {trainings?.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed")
                    .slice(0, 5)
                    .map((training) => (
                      <div key={training.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {training.employee?.first_name?.[0]}{training.employee?.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-sm">
                              {training.employee?.first_name} {training.employee?.last_name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {training.policy?.title}
                            </div>
                          </div>
                        </div>
                        <Badge variant="destructive" className="text-xs">
                          {training.due_date && formatDistanceToNow(new Date(training.due_date), { addSuffix: true })}
                        </Badge>
                      </div>
                    ))}
                  {(!trainings || trainings.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed").length === 0) && (
                    <div className="text-center text-muted-foreground py-4">
                      <CheckCircle className="mx-auto h-8 w-8 mb-2 text-green-500" />
                      <p className="text-sm">No overdue training!</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-500" />
                  Expiring Soon
                </CardTitle>
                <CardDescription>Training certifications expiring in the next 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {expiringTrainings?.slice(0, 5).map((training) => (
                    <div key={training.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {training.employee?.first_name?.[0]}{training.employee?.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm">
                            {training.employee?.first_name} {training.employee?.last_name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {training.policy?.title}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Expires {training.expires_at && format(new Date(training.expires_at), "MMM d")}
                      </Badge>
                    </div>
                  ))}
                  {(!expiringTrainings || expiringTrainings.length === 0) && (
                    <div className="text-center text-muted-foreground py-4">
                      <CheckCircle className="mx-auto h-8 w-8 mb-2 text-green-500" />
                      <p className="text-sm">No training expiring soon</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Training Assignments</CardTitle>
                  <CardDescription>All employee training assignments and status</CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by employee or policy..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Policy</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        Loading training assignments...
                      </TableCell>
                    </TableRow>
                  ) : filteredTrainings?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No training assignments found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTrainings?.map((training) => {
                      const status = statusConfig[training.status] || statusConfig.not_started;
                      const isOverdue = training.due_date && new Date(training.due_date) < new Date() && training.status !== "completed";
                      
                      return (
                        <TableRow key={training.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>
                                  {training.employee?.first_name?.[0]}{training.employee?.last_name?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">
                                  {training.employee?.first_name} {training.employee?.last_name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {training.employee?.employee_number}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{training.policy?.title}</div>
                            <div className="text-xs text-muted-foreground">{training.policy?.policy_number}</div>
                          </TableCell>
                          <TableCell>
                            {training.assigned_at ? format(new Date(training.assigned_at), "MMM d, yyyy") : "—"}
                          </TableCell>
                          <TableCell>
                            <div className={cn("flex items-center gap-1", isOverdue && "text-destructive")}>
                              {training.due_date ? format(new Date(training.due_date), "MMM d, yyyy") : "—"}
                              {isOverdue && <AlertTriangle className="h-4 w-4" />}
                            </div>
                          </TableCell>
                          <TableCell>
                            {training.completed_at ? format(new Date(training.completed_at), "MMM d, yyyy") : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge className={status.color}>{status.label}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expiring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Expiring Certifications</CardTitle>
              <CardDescription>Training certifications expiring in the next 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              {(!expiringTrainings || expiringTrainings.length === 0) ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="mx-auto h-8 w-8 mb-2 text-green-500" />
                  <p>No training certifications expiring in the next 30 days</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Policy</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expiringTrainings.map((training) => (
                      <TableRow key={training.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {training.employee?.first_name?.[0]}{training.employee?.last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">
                                {training.employee?.first_name} {training.employee?.last_name}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{training.policy?.title}</TableCell>
                        <TableCell>
                          {training.completed_at ? format(new Date(training.completed_at), "MMM d, yyyy") : "—"}
                        </TableCell>
                        <TableCell>
                          {training.expires_at ? format(new Date(training.expires_at), "MMM d, yyyy") : "—"}
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">Renew</Button>
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
    </div>
  );
}
