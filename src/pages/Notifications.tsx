import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Check, Trash2, Clock, MessageSquare, ClipboardList, Umbrella, FileText } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const Notifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const { data: notifications } = useQuery({
    queryKey: ['all-notifications', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(100);
      return data;
    },
    enabled: !!user?.id,
  });
  
  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['all-notifications'] }),
  });
  
  const deleteNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      await supabase.from('notifications').delete().eq('id', notificationId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['all-notifications'] }),
  });
  
  const getIcon = (type: string) => {
    const icons: Record<string, any> = {
      task_assigned: ClipboardList,
      task_due: Clock,
      task_overdue: Clock,
      chat_mention: MessageSquare,
      pto_request: Umbrella,
      pto_approved: Umbrella,
      document_required: FileText,
    };
    const Icon = icons[type] || Bell;
    return <Icon className="h-5 w-5" />;
  };
  
  const unread = notifications?.filter(n => !n.is_read) || [];
  const read = notifications?.filter(n => n.is_read) || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Notifications</h1>
          </div>
          <p className="text-muted-foreground">{unread.length} unread</p>
        </div>
      </div>
      
      {unread.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Unread ({unread.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {unread.map((notification) => (
              <div
                key={notification.id}
                className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg"
              >
                <div className="text-blue-600">
                  {getIcon(notification.notification_type)}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{notification.title}</p>
                  {notification.message && <p className="text-sm text-muted-foreground">{notification.message}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => markAsRead.mutate(notification.id)}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteNotification.mutate(notification.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>All Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {read.map((notification) => (
            <div
              key={notification.id}
              className="flex items-start gap-4 p-4 border rounded-lg"
            >
              <div className="text-muted-foreground">
                {getIcon(notification.notification_type)}
              </div>
              <div className="flex-1">
                <p className="font-medium">{notification.title}</p>
                {notification.message && <p className="text-sm text-muted-foreground">{notification.message}</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(notification.created_at), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => deleteNotification.mutate(notification.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default Notifications;
