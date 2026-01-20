import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ChannelMembersDialogProps {
  channelId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ChannelMembersDialog = ({ channelId, open, onOpenChange }: ChannelMembersDialogProps) => {
  const { data: members } = useQuery({
    queryKey: ['channel-members', channelId],
    queryFn: async () => {
      const { data } = await supabase
        .from('chat_channel_members')
        .select(`
          *,
          user:profiles(id, first_name, last_name, avatar_url)
        `)
        .eq('channel_id', channelId);
      return data;
    },
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Channel Members ({members?.length || 0})</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-96">
          <div className="space-y-2">
            {members?.map((member) => {
              const fullName = member.user 
                ? `${member.user.first_name || ''} ${member.user.last_name || ''}`.trim() 
                : 'Unknown User';
              
              return (
                <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted">
                  <Avatar>
                    <AvatarImage src={member.user?.avatar_url || undefined} />
                    <AvatarFallback>{member.user?.first_name?.charAt(0) || '?'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{fullName}</p>
                  </div>
                  {member.role === 'owner' && <Badge>Owner</Badge>}
                  {member.role === 'admin' && <Badge variant="secondary">Admin</Badge>}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ChannelMembersDialog;
