import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Check, Clock, MessageSquare, ClipboardList, Umbrella, FileText, GraduationCap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const NotificationBell = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  
  const { data: notifications } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(20);
      return data;
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });
  
  // Real-time subscription for instant notification updates
  useEffect(() => {
    if (!user?.id) return;
    
    const subscription = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
        }
      )
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id, queryClient]);
  
  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;
  
  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
  
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', user?.id)
        .eq('is_read', false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
  
  const getIcon = (type: string) => {
    const icons: Record<string, any> = {
      task_assigned: ClipboardList,
      task_due: Clock,
      task_overdue: Clock,
      chat_mention: MessageSquare,
      chat_message: MessageSquare,
      pto_request: Umbrella,
      pto_approved: Umbrella,
      pto_denied: Umbrella,
      document_required: FileText,
      training_due: GraduationCap,
    };
    const Icon = icons[type] || Bell;
    return <Icon className="h-4 w-4" />;
  };
  
  const getLink = (notification: any) => {
    switch (notification.link_type) {
      case 'task': return `/tasks?id=${notification.link_id}`;
      case 'chat': return `/chat?channel=${notification.link_id}`;
      case 'pto': return '/my/time-off';
      case 'document': return `/my/documents?sign=${notification.link_id}`;
      default: return '#';
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <p className="font-semibold">Notifications</p>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => markAllAsRead.mutate()}>
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {!notifications?.length ? (
            <p className="text-center text-muted-foreground py-8">No notifications</p>
          ) : (
            notifications.map((notification) => (
              <Link
                key={notification.id}
                to={getLink(notification)}
                onClick={() => {
                  if (!notification.is_read) markAsRead.mutate(notification.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex items-start gap-3 p-3 hover:bg-muted border-b",
                  !notification.is_read && "bg-blue-50"
                )}
              >
                <div className="mt-1 text-muted-foreground">
                  {getIcon(notification.notification_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {notification.title}
                  </p>
                  {notification.message && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </p>
                </div>
                {!notification.is_read && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                )}
              </Link>
            ))
          )}
        </ScrollArea>
        <div className="p-2 border-t">
          <Link to="/notifications" onClick={() => setOpen(false)}>
            <Button variant="ghost" className="w-full" size="sm">
              View all notifications
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
