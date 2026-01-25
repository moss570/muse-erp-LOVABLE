import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ChatChannel {
  id: string;
  name: string;
  description?: string;
  channel_type: 'public' | 'private' | 'department' | 'direct';
  department_id?: string;
  participant_ids?: string[];
  is_archived: boolean;
  created_by?: string;
  created_at: string;
  unread_count?: number;
  last_message?: ChatMessage;
}

export interface ChatMessage {
  id: string;
  channel_id: string;
  content: string;
  content_type: 'text' | 'file' | 'image' | 'system';
  file_name?: string;
  file_path?: string;
  file_type?: string;
  file_size?: number;
  reply_to_id?: string;
  reply_to?: ChatMessage;
  mentions?: string[];
  is_pinned: boolean;
  is_edited: boolean;
  is_deleted: boolean;
  sender_id: string;
  sender?: { id: string; first_name: string | null; last_name: string | null; avatar_url?: string | null };
  created_at: string;
}

// ============================================================================
// CHANNELS
// ============================================================================
export function useChannels() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['chat-channels', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Get public channels
      const { data: publicChannels } = await supabase
        .from('chat_channels')
        .select('*')
        .eq('channel_type', 'public')
        .eq('is_archived', false);
      
      // Get channels user is a member of
      const { data: memberChannels } = await supabase
        .from('chat_channel_members')
        .select(`
          channel:chat_channels(*)
        `)
        .eq('user_id', user.id);
      
      // Get DMs where user is a participant
      const { data: dmChannels } = await supabase
        .from('chat_channels')
        .select('*')
        .eq('channel_type', 'direct')
        .contains('participant_ids', [user.id]);
      
      // Combine and deduplicate
      const allChannels = [
        ...(publicChannels || []),
        ...(memberChannels?.map(m => m.channel).filter(Boolean) || []),
        ...(dmChannels || []),
      ];
      
      const uniqueChannels = Array.from(
        new Map(allChannels.filter(Boolean).map(c => [c!.id, c])).values()
      );
      
      // Get unread counts
      const channelsWithUnread = await Promise.all(
        uniqueChannels.map(async (channel) => {
          if (!channel) return null;
          
          const { data: receipt } = await supabase
            .from('chat_read_receipts')
            .select('last_read_at')
            .eq('channel_id', channel.id)
            .eq('user_id', user.id)
            .single();
          
          const lastReadAt = receipt?.last_read_at || '1970-01-01';
          
          const { count } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('channel_id', channel.id)
            .gt('created_at', lastReadAt)
            .neq('sender_id', user.id);
          
          return { ...channel, unread_count: count || 0 };
        })
      );
      
      return channelsWithUnread.filter(Boolean) as ChatChannel[];
    },
    enabled: !!user?.id,
  });
}

export function useChannel(channelId: string | undefined) {
  return useQuery({
    queryKey: ['chat-channel', channelId],
    queryFn: async () => {
      if (!channelId) return null;
      
      const { data, error } = await supabase
        .from('chat_channels')
        .select('*')
        .eq('id', channelId)
        .single();
      
      if (error) throw error;
      return data as ChatChannel;
    },
    enabled: !!channelId,
  });
}

// ============================================================================
// MESSAGES
// ============================================================================
export function useMessages(channelId: string | undefined) {
  return useQuery({
    queryKey: ['chat-messages', channelId],
    queryFn: async () => {
      if (!channelId) return [];
      
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          sender:profiles!chat_messages_sender_id_fkey(id, first_name, last_name, avatar_url)
        `)
        .eq('channel_id', channelId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
        .limit(100);
      
      if (error) throw error;
      return data as ChatMessage[];
    },
    enabled: !!channelId,
  });
}

// ============================================================================
// REAL-TIME SUBSCRIPTION
// ============================================================================
export function useChatRealtime(channelId: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  
  useEffect(() => {
    if (!channelId) return;
    
    // Subscribe to new messages
    const messagesSubscription = supabase
      .channel(`messages:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          // Fetch the complete message with sender info
          const { data } = await supabase
            .from('chat_messages')
            .select(`
              *,
              sender:profiles!chat_messages_sender_id_fkey(id, first_name, last_name, avatar_url)
            `)
            .eq('id', payload.new.id)
            .single();
          
          if (data) {
            queryClient.setQueryData(
              ['chat-messages', channelId],
              (old: ChatMessage[] | undefined) => [...(old || []), data]
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          queryClient.setQueryData(
            ['chat-messages', channelId],
            (old: ChatMessage[] | undefined) =>
              old?.map(msg => msg.id === payload.new.id ? { ...msg, ...payload.new } : msg)
          );
        }
      )
      .subscribe();
    
    // Subscribe to presence (typing indicators)
    const presenceSubscription = supabase
      .channel(`presence:${channelId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = presenceSubscription.presenceState();
        const typing = Object.values(state)
          .flat()
          .filter((p: any) => p.typing && p.user_id !== user?.id)
          .map((p: any) => p.user_name);
        setTypingUsers(typing);
      })
      .subscribe();
    
    return () => {
      messagesSubscription.unsubscribe();
      presenceSubscription.unsubscribe();
    };
  }, [channelId, queryClient, user?.id]);
  
  // Broadcast typing status
  const setTyping = useCallback((isTyping: boolean, userName: string) => {
    if (!channelId) return;
    
    const channel = supabase.channel(`presence:${channelId}`);
    channel.track({
      user_id: user?.id,
      user_name: userName,
      typing: isTyping,
    });
  }, [channelId, user?.id]);
  
  return { typingUsers, setTyping };
}

// ============================================================================
// SEND MESSAGE
// ============================================================================
export function useSendMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({
      channelId,
      content,
      contentType = 'text',
      replyToId,
      mentions,
      file,
    }: {
      channelId: string;
      content: string;
      contentType?: 'text' | 'file' | 'image';
      replyToId?: string;
      mentions?: string[];
      file?: File;
    }) => {
      let filePath: string | undefined = undefined;
      let fileName: string | undefined = undefined;
      let fileType: string | undefined = undefined;
      let fileSize: number | undefined = undefined;
      
      // Upload file if provided
      if (file) {
        const ext = file.name.split('.').pop();
        filePath = `${channelId}/${Date.now()}.${ext}`;
        
        const { error: uploadError } = await supabase.storage
          .from('chat-files')
          .upload(filePath, file);
        
        if (uploadError) throw uploadError;
        
        fileName = file.name;
        fileType = file.type;
        fileSize = file.size;
      }
      
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          channel_id: channelId,
          content,
          content_type: contentType,
          file_name: fileName,
          file_path: filePath,
          file_type: fileType,
          file_size: fileSize,
          reply_to_id: replyToId,
          mentions,
          sender_id: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return data;
    },
    onSuccess: async (data, variables) => {
      // Update last read
      await supabase
        .from('chat_read_receipts')
        .upsert({
          channel_id: data.channel_id,
          user_id: user?.id,
          last_read_message_id: data.id,
          last_read_at: new Date().toISOString(),
        });
      
      // Create notifications for recipients
      try {
        // Get channel details
        const { data: channel } = await supabase
          .from('chat_channels')
          .select('channel_type, participant_ids, name')
          .eq('id', data.channel_id)
          .single();
        
        if (!channel) return;
        
        // Get sender name
        const { data: senderProfile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', user?.id)
          .single();
        
        const senderName = senderProfile 
          ? `${senderProfile.first_name || ''} ${senderProfile.last_name || ''}`.trim() || 'Someone'
          : 'Someone';
        
        let recipientIds: string[] = [];
        
        if (channel.channel_type === 'direct') {
          // DM: notify the other participant
          recipientIds = (channel.participant_ids || []).filter((id: string) => id !== user?.id);
        } else {
          // Group/Public: get all members except sender
          const { data: members } = await supabase
            .from('chat_channel_members')
            .select('user_id')
            .eq('channel_id', data.channel_id)
            .neq('user_id', user?.id);
          recipientIds = members?.map(m => m.user_id) || [];
        }
        
        // Filter recipients who haven't viewed recently (prevent spam)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const notifiableRecipients: string[] = [];
        
        for (const recipientId of recipientIds) {
          const { data: recentReceipt } = await supabase
            .from('chat_read_receipts')
            .select('last_read_at')
            .eq('channel_id', data.channel_id)
            .eq('user_id', recipientId)
            .single();
          
          // Only notify if they haven't read recently
          if (!recentReceipt?.last_read_at || recentReceipt.last_read_at < fiveMinutesAgo) {
            notifiableRecipients.push(recipientId);
          }
        }
        
        // Create notifications
        if (notifiableRecipients.length > 0) {
          const truncatedContent = data.content.length > 100 
            ? data.content.substring(0, 100) + '...' 
            : data.content;
          
          await supabase.from('notifications').insert(
            notifiableRecipients.map(recipientId => ({
              user_id: recipientId,
              title: channel.channel_type === 'direct' 
                ? `New message from ${senderName}`
                : `New message in ${channel.name}`,
              message: truncatedContent,
              notification_type: 'chat_message',
              link_type: 'chat',
              link_id: data.channel_id,
            }))
          );
        }
        
        // Handle @mentions separately (always notify)
        if (variables.mentions?.length) {
          const mentionNotifications = variables.mentions
            .filter(id => id !== user?.id) // Don't notify self
            .map(mentionedUserId => ({
              user_id: mentionedUserId,
              title: `${senderName} mentioned you`,
              message: data.content.substring(0, 100),
              notification_type: 'chat_mention',
              link_type: 'chat',
              link_id: data.channel_id,
            }));
          
          if (mentionNotifications.length > 0) {
            await supabase.from('notifications').insert(mentionNotifications);
          }
        }
      } catch (error) {
        console.error('Error creating chat notifications:', error);
      }
    },
  });
}

// ============================================================================
// CREATE CHANNEL
// ============================================================================
export function useCreateChannel() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({
      name,
      description,
      channelType,
      participantIds,
    }: {
      name: string;
      description?: string;
      channelType: 'public' | 'private' | 'direct';
      participantIds?: string[];
    }) => {
      const { data, error } = await supabase
        .from('chat_channels')
        .insert({
          name,
          description,
          channel_type: channelType,
          participant_ids: channelType === 'direct' ? participantIds : undefined,
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Add creator as member for private channels
      if (channelType === 'private' && user?.id) {
        await supabase.from('chat_channel_members').insert({
          channel_id: data.id,
          user_id: user.id,
          role: 'owner',
        });
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-channels'] });
      toast.success('Channel created');
    },
  });
}

// ============================================================================
// CREATE DM
// ============================================================================
export function useCreateDM() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (participantId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      // Check if DM already exists
      const { data: existing } = await supabase
        .from('chat_channels')
        .select('*')
        .eq('channel_type', 'direct')
        .contains('participant_ids', [user.id, participantId]);
      
      if (existing && existing.length > 0) {
        return existing[0];
      }
      
      // Get participant name for channel name
      const { data: participant } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', participantId)
        .single();
      
      const participantName = participant 
        ? `${participant.first_name || ''} ${participant.last_name || ''}`.trim() 
        : 'Direct Message';
      
      const { data, error } = await supabase
        .from('chat_channels')
        .insert({
          name: participantName || 'Direct Message',
          channel_type: 'direct',
          participant_ids: [user.id, participantId],
          created_by: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-channels'] });
    },
  });
}

// ============================================================================
// MARK AS READ
// ============================================================================
export function useMarkAsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (channelId: string) => {
      if (!user?.id) return;
      
      await supabase
        .from('chat_read_receipts')
        .upsert({
          channel_id: channelId,
          user_id: user.id,
          last_read_at: new Date().toISOString(),
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-channels'] });
    },
  });
}

// ============================================================================
// PIN MESSAGE
// ============================================================================
export function usePinMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ messageId, pinned }: { messageId: string; pinned: boolean }) => {
      const { error } = await supabase
        .from('chat_messages')
        .update({
          is_pinned: pinned,
          pinned_by: pinned ? user?.id : null,
          pinned_at: pinned ? new Date().toISOString() : null,
        })
        .eq('id', messageId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
    },
  });
}

// ============================================================================
// DELETE MESSAGE
// ============================================================================
export function useDeleteMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from('chat_messages')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
        })
        .eq('id', messageId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
    },
  });
}

// ============================================================================
// EDIT MESSAGE
// ============================================================================
export function useEditMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ messageId, content }: { messageId: string; content: string }) => {
      const { error } = await supabase
        .from('chat_messages')
        .update({
          content,
          is_edited: true,
          edited_at: new Date().toISOString(),
        })
        .eq('id', messageId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
    },
  });
}

// ============================================================================
// ADD REACTION
// ============================================================================
export function useAddReaction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('chat_message_reactions')
        .upsert({
          message_id: messageId,
          user_id: user.id,
          emoji,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
    },
  });
}
