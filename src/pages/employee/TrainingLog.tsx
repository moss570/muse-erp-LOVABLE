import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  GraduationCap, Award, Clock, CheckCircle, AlertTriangle, 
  Search, FileText, Calendar, ExternalLink
} from 'lucide-react';
import { format, isPast, addDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface TrainingRecord {
  id: string;
  training_name: string;
  training_type: string | null;
  description?: string | null;
  status: string | null;
  completed_at?: string | null;
  score?: number | null;
  certificate_number?: string | null;
  certificate_file_path?: string | null;
  valid_from?: string | null;
  valid_until?: string | null;
  trainer_name?: string | null;
  created_at: string | null;
}

interface Skill {
  id: string;
  skill_name: string;
  skill_category?: string | null;
  proficiency_level?: string | null;
  is_certified: boolean | null;
  certified_date?: string | null;
  certification_expiry?: string | null;
  certification_number?: string | null;
}

const TrainingLog = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('training');
  const [search, setSearch] = useState('');
  
  // Fetch training records
  const { data: trainings, isLoading: loadingTraining } = useQuery({
    queryKey: ['my-training', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('employee_training_records')
        .select('*')
        .eq('employee_id', user?.id)
        .order('created_at', { ascending: false });
      
      return data as TrainingRecord[];
    },
    enabled: !!user?.id,
  });
  
  // Fetch skills
  const { data: skills, isLoading: loadingSkills } = useQuery({
    queryKey: ['my-skills', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('employee_skills')
        .select('*')
        .eq('employee_id', user?.id)
        .order('skill_name');
      
      return data as Skill[];
    },
    enabled: !!user?.id,
  });
  
  // Filter training
  const filteredTraining = trainings?.filter(t => 
    t.training_name.toLowerCase().includes(search.toLowerCase()) ||
    (t.training_type && t.training_type.toLowerCase().includes(search.toLowerCase()))
  );
  
  // Calculate stats
  const stats = {
    total: trainings?.length || 0,
    completed: trainings?.filter(t => t.status === 'completed').length || 0,
    inProgress: trainings?.filter(t => t.status === 'in_progress').length || 0,
    pending: trainings?.filter(t => t.status === 'pending').length || 0,
    expired: trainings?.filter(t => t.status === 'expired').length || 0,
    expiringSoon: trainings?.filter(t => 
      t.valid_until && !isPast(new Date(t.valid_until)) && 
      isPast(addDays(new Date(), -30)) && 
      new Date(t.valid_until) <= addDays(new Date(), 30)
    ).length || 0,
  };
  
  const getStatusBadge = (status: string | null) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', icon: React.ElementType }> = {
      completed: { variant: 'default', icon: CheckCircle },
      in_progress: { variant: 'secondary', icon: Clock },
      pending: { variant: 'outline', icon: Clock },
      expired: { variant: 'destructive', icon: AlertTriangle },
    };
    const { variant, icon: Icon } = config[status || 'pending'] || config.pending;
    return (
      <Badge variant={variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {(status || 'pending').replace('_', ' ')}
      </Badge>
    );
  };
  
  const getTypeColor = (type: string | null) => {
    const colors: Record<string, string> = {
      safety: 'bg-red-100 text-red-700',
      food_safety: 'bg-orange-100 text-orange-700',
      equipment: 'bg-blue-100 text-blue-700',
      sop: 'bg-purple-100 text-purple-700',
      compliance: 'bg-yellow-100 text-yellow-700',
      onboarding: 'bg-green-100 text-green-700',
      general: 'bg-gray-100 text-gray-700',
    };
    return colors[type || 'general'] || colors.general;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Training & Skills</h1>
        </div>
        <p className="text-muted-foreground">View your training records and certifications</p>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total Trainings</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{stats.inProgress}</p>
            <p className="text-sm text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-gray-600">{stats.pending}</p>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card className={cn(stats.expiringSoon > 0 && "border-orange-300 bg-orange-50")}>
          <CardContent className="pt-4 text-center">
            <p className={cn("text-3xl font-bold", stats.expiringSoon > 0 && "text-orange-600")}>
              {stats.expiringSoon}
            </p>
            <p className="text-sm text-muted-foreground">Expiring Soon</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Progress Overview */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Overall Completion</span>
            <span className="text-sm font-bold">
              {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
            </span>
          </div>
          <Progress 
            value={stats.total > 0 ? (stats.completed / stats.total) * 100 : 0} 
            className="h-3"
          />
        </CardContent>
      </Card>
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="training">Training Records</TabsTrigger>
          <TabsTrigger value="skills">Skills & Certifications</TabsTrigger>
        </TabsList>
        
        {/* Training Tab */}
        <TabsContent value="training" className="space-y-4 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search training..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {loadingTraining ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : filteredTraining?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No training records found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredTraining?.map((training) => (
                <Card key={training.id}>
                  <CardContent className="pt-4">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start gap-2 flex-wrap">
                          <h3 className="font-semibold">{training.training_name}</h3>
                          {training.training_type && (
                            <Badge variant="outline" className={getTypeColor(training.training_type)}>
                              {training.training_type.replace('_', ' ')}
                            </Badge>
                          )}
                        </div>
                        {training.description && (
                          <p className="text-sm text-muted-foreground">{training.description}</p>
                        )}
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          {training.completed_at && (
                            <span className="flex items-center gap-1">
                              <CheckCircle className="h-4 w-4" />
                              Completed: {format(new Date(training.completed_at), 'MMM d, yyyy')}
                            </span>
                          )}
                          {training.valid_until && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              Expires: {format(new Date(training.valid_until), 'MMM d, yyyy')}
                            </span>
                          )}
                          {training.score !== null && training.score !== undefined && (
                            <span className="flex items-center gap-1">
                              <Award className="h-4 w-4" />
                              Score: {training.score}%
                            </span>
                          )}
                          {training.trainer_name && (
                            <span>Trainer: {training.trainer_name}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(training.status)}
                        {training.certificate_file_path && (
                          <a 
                            href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/training-certificates/${training.certificate_file_path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            <ExternalLink className="h-4 w-4" />
                            View Certificate
                          </a>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        {/* Skills Tab */}
        <TabsContent value="skills" className="space-y-4 mt-4">
          {loadingSkills ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : skills?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No skills recorded</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {skills?.map((skill) => (
                <Card key={skill.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold">{skill.skill_name}</h3>
                        {skill.skill_category && (
                          <p className="text-sm text-muted-foreground">{skill.skill_category}</p>
                        )}
                      </div>
                      {skill.is_certified && (
                        <Badge variant="default" className="gap-1 bg-green-600">
                          <Award className="h-3 w-3" />
                          Certified
                        </Badge>
                      )}
                    </div>
                    {skill.proficiency_level && (
                      <div className="flex items-center justify-between text-sm mt-3">
                        <span className="text-muted-foreground">Proficiency</span>
                        <Badge variant="outline">{skill.proficiency_level}</Badge>
                      </div>
                    )}
                    {skill.certification_expiry && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Expires: {format(new Date(skill.certification_expiry), 'MMM d, yyyy')}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TrainingLog;
