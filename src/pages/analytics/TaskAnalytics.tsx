import { useState } from 'react';
import { useEmployeeTaskMetrics, useTeamTaskMetrics, useTaskTrends, useFoodSafetyCompliance } from '@/hooks/useTaskAnalytics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, TrendingUp, TrendingDown, Minus, Users, Shield, Clock, CheckCircle, AlertTriangle, Calendar } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const TaskAnalytics = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('this_month');
  
  // Calculate date range
  const getDateRange = () => {
    const now = new Date();
    switch (dateRange) {
      case 'this_month':
        return { from: startOfMonth(now), to: endOfMonth(now) };
      case 'last_month':
        const lastMonth = subMonths(now, 1);
        return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
      case 'last_3_months':
        return { from: subMonths(now, 3), to: now };
      default:
        return { from: startOfMonth(now), to: endOfMonth(now) };
    }
  };
  
  const range = getDateRange();
  const { data: teamMetrics } = useTeamTaskMetrics(range);
  const { data: employeeMetrics } = useEmployeeTaskMetrics(undefined, range);
  const { data: trends } = useTaskTrends(30);
  const { data: foodSafetyData } = useFoodSafetyCompliance(range);
  
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };
  
  const formatMinutes = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Task Analytics</h1>
          </div>
          <p className="text-muted-foreground">Performance metrics and KPIs</p>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-40">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="last_month">Last Month</SelectItem>
            <SelectItem value="last_3_months">Last 3 Months</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-3xl font-bold">{teamMetrics?.total_tasks || 0}</p>
            <p className="text-sm text-muted-foreground">Total Tasks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-3xl font-bold text-green-600">{teamMetrics?.completed_tasks || 0}</p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-3xl font-bold text-red-600">{teamMetrics?.overdue_tasks || 0}</p>
            <p className="text-sm text-muted-foreground">Overdue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-3xl font-bold">{teamMetrics?.avg_completion_rate || 0}%</p>
            <p className="text-sm text-muted-foreground">Completion Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-3xl font-bold">{formatMinutes(teamMetrics?.avg_completion_time_minutes || 0)}</p>
            <p className="text-sm text-muted-foreground">Avg Time</p>
          </CardContent>
        </Card>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="employees">Employee KPIs</TabsTrigger>
          <TabsTrigger value="food_safety">Food Safety Compliance</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Task Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Task Trend (30 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickFormatter={(d) => format(new Date(d), 'MMM d')} fontSize={12} />
                      <YAxis />
                      <Tooltip labelFormatter={(d) => format(new Date(d), 'MMM d, yyyy')} />
                      <Line type="monotone" dataKey="created" stroke="#3b82f6" name="Created" />
                      <Line type="monotone" dataKey="completed" stroke="#22c55e" name="Completed" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            {/* By Category */}
            <Card>
              <CardHeader>
                <CardTitle>Tasks by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={teamMetrics?.by_category || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" fontSize={12} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" name="Total" />
                      <Bar dataKey="completed" fill="#22c55e" name="Completed" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* By Priority */}
          <Card>
            <CardHeader>
              <CardTitle>Tasks by Priority</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {teamMetrics?.by_priority.map((p) => (
                  <div key={p.priority} className="text-center p-4 border rounded-lg">
                    <Badge variant={p.priority === 'urgent' ? 'destructive' : p.priority === 'high' ? 'default' : 'secondary'} className="mb-2">
                      {p.priority}
                    </Badge>
                    <p className="text-2xl font-bold">{p.count}</p>
                    <p className="text-sm text-muted-foreground">
                      {p.count > 0 ? Math.round((p.completed / p.count) * 100) : 0}% done
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Employee KPIs Tab */}
        <TabsContent value="employees">
          <Card>
            <CardHeader>
              <CardTitle>Employee Performance</CardTitle>
              <CardDescription>Individual task completion metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Completion Rate</TableHead>
                    <TableHead>On-Time Rate</TableHead>
                    <TableHead>Overdue</TableHead>
                    <TableHead>Avg Time</TableHead>
                    <TableHead>Food Safety</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeeMetrics?.map((emp) => (
                    <TableRow key={emp.employee_id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={emp.avatar_url} />
                            <AvatarFallback>{emp.employee_name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          {emp.employee_name}
                        </div>
                      </TableCell>
                      <TableCell>{emp.total_assigned}</TableCell>
                      <TableCell>{emp.total_completed}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={emp.completion_rate} className="w-16 h-2" />
                          <span className={cn(
                            "text-sm font-medium",
                            emp.completion_rate >= 90 ? "text-green-600" :
                            emp.completion_rate >= 70 ? "text-yellow-600" : "text-red-600"
                          )}>{emp.completion_rate}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          emp.on_time_rate >= 90 ? "text-green-600" :
                          emp.on_time_rate >= 70 ? "text-yellow-600" : "text-red-600"
                        )}>{emp.on_time_rate}%</span>
                      </TableCell>
                      <TableCell>
                        {emp.overdue_count > 0 ? (
                          <Badge variant="destructive">{emp.overdue_count}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {formatMinutes(emp.avg_completion_time_minutes)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={emp.food_safety_completion_rate >= 100 ? 'default' : 'destructive'}>
                          {emp.food_safety_completion_rate}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Food Safety Tab */}
        <TabsContent value="food_safety" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-green-200">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <Shield className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-3xl font-bold text-green-600">{foodSafetyData?.compliance_rate || 0}%</p>
                    <p className="text-sm text-muted-foreground">Compliance Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-3xl font-bold">{foodSafetyData?.total || 0}</p>
                <p className="text-sm text-muted-foreground">Total Tasks</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-3xl font-bold text-green-600">{foodSafetyData?.on_time || 0}</p>
                <p className="text-sm text-muted-foreground">Completed On-Time</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-3xl font-bold text-red-600">{foodSafetyData?.missed || 0}</p>
                <p className="text-sm text-muted-foreground">Missed/Overdue</p>
              </CardContent>
            </Card>
          </div>
          
          {/* Food Safety Tasks List */}
          <Card>
            <CardHeader>
              <CardTitle>Food Safety Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {foodSafetyData?.tasks.slice(0, 20).map((task: any) => (
                    <TableRow key={task.id}>
                      <TableCell>{task.title}</TableCell>
                      <TableCell>{task.category_name || '-'}</TableCell>
                      <TableCell>{task.assigned_to_name || '-'}</TableCell>
                      <TableCell>
                        {task.due_date && format(new Date(task.due_date), 'MMM d, yyyy')}
                        {task.due_time && ` ${task.due_time}`}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          ['completed', 'verified'].includes(task.status) ? 'default' :
                          task.status === 'overdue' ? 'destructive' : 'secondary'
                        }>
                          {task.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TaskAnalytics;
