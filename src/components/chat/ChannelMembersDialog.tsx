import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPlus, X, Search, Crown, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface ChannelMembersDialogProps {
  channelId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ChannelMembersDialog = ({ channelId, open, onOpenChange }: ChannelMembersDialogProps) => {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('members');

  // Fetch channel details
  const { data: channel } = useQuery({
    queryKey: ['channel-details', channelId],
    queryFn: async () => {
      const { data } = await supabase
        .from('chat_channels')
        .select('*')
        .eq('id', channelId)
        .single();
      return data;
    },
    enabled: open,
  });

  // Fetch current members
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

  // Check if current user can manage members
  const currentUserMember = members?.find(m => m.user_id === user?.id);
  const isChannelOwnerOrAdmin = currentUserMember?.role === 'owner' || currentUserMember?.role === 'admin';
  const isChannelCreator = channel?.created_by === user?.id;
  const isSystemAdmin = role === 'admin' || role === 'manager';
  
  // For public channels, allow system admins/managers or channel creator
  // For private channels, require channel owner/admin membership
  const canManageMembers = channel?.channel_type === 'public' 
    ? (isSystemAdmin || isChannelCreator)
    : isChannelOwnerOrAdmin;

  // Fetch all users for adding
  const { data: allUsers } = useQuery({
    queryKey: ['all-users-for-channel', channelId],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url')
        .order('first_name');
      return data;
    },
    enabled: open && activeTab === 'add',
  });

  // Filter out users who are already members
  const memberIds = members?.map(m => m.user_id) || [];
  const availableUsers = allUsers?.filter(u => !memberIds.includes(u.id)) || [];
  const filteredUsers = availableUsers.filter(u => {
    const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  // Add member mutation
  const addMember = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('chat_channel_members')
        .insert({
          channel_id: channelId,
          user_id: userId,
          role: 'member',
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel-members', channelId] });
      queryClient.invalidateQueries({ queryKey: ['all-users-for-channel', channelId] });
      toast.success('Member added to channel');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add member');
    },
  });

  // Remove member mutation
  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('chat_channel_members')
        .delete()
        .eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel-members', channelId] });
      queryClient.invalidateQueries({ queryKey: ['all-users-for-channel', channelId] });
      toast.success('Member removed from channel');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to remove member');
    },
  });

  const getRoleIcon = (role: string) => {
    if (role === 'owner') return <Crown className="h-4 w-4 text-amber-500" />;
    if (role === 'admin') return <Shield className="h-4 w-4 text-blue-500" />;
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Channel Members</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="members">Members ({members?.length || 0})</TabsTrigger>
            {canManageMembers && (
              <TabsTrigger value="add">
                <UserPlus className="h-4 w-4 mr-1" />
                Add
              </TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="members" className="mt-4">
            <ScrollArea className="max-h-80">
              <div className="space-y-2">
                {members?.map((member) => {
                  const fullName = member.user 
                    ? `${member.user.first_name || ''} ${member.user.last_name || ''}`.trim() 
                    : 'Unknown User';
                  const isOwner = member.role === 'owner';
                  const canRemove = canManageMembers && !isOwner && member.user_id !== user?.id;
                  
                  return (
                    <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted group">
                      <Avatar>
                        <AvatarImage src={member.user?.avatar_url || undefined} />
                        <AvatarFallback>{member.user?.first_name?.charAt(0) || '?'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{fullName}</p>
                        <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                      </div>
                      {getRoleIcon(member.role)}
                      {canRemove && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeMember.mutate(member.id)}
                          disabled={removeMember.isPending}
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>
          
          {canManageMembers && (
            <TabsContent value="add" className="mt-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <ScrollArea className="max-h-64">
                <div className="space-y-2">
                  {filteredUsers.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      {searchQuery ? 'No users found' : 'All users are already members'}
                    </p>
                  ) : (
                    filteredUsers.map((profile) => {
                      const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown';
                      
                      return (
                        <div key={profile.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted">
                          <Avatar>
                            <AvatarImage src={profile.avatar_url || undefined} />
                            <AvatarFallback>{profile.first_name?.charAt(0) || '?'}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{fullName}</p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => addMember.mutate(profile.id)}
                            disabled={addMember.isPending}
                          >
                            <UserPlus className="h-4 w-4 mr-1" />
                            Add
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ChannelMembersDialog;