import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useChannels, useChannel, useMessages, useChatRealtime, useSendMessage, useMarkAsRead, ChatMessage } from '@/hooks/useChat';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Hash, Lock, MessageSquare, Send, Plus, Search, 
  Paperclip, MoreHorizontal, Pin,
  Users, Settings
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { cn } from '@/lib/utils';
import CreateChannelDialog from '@/components/chat/CreateChannelDialog';
import NewDMDialog from '@/components/chat/NewDMDialog';
import ChannelMembersDialog from '@/components/chat/ChannelMembersDialog';

const Chat = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeChannelId = searchParams.get('channel');
  
  const { user, profile } = useAuth();
  const [message, setMessage] = useState('');
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showNewDM, setShowNewDM] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { data: channels } = useChannels();
  const { data: activeChannel } = useChannel(activeChannelId || undefined);
  const { data: messages } = useMessages(activeChannelId || undefined);
  const { typingUsers, setTyping } = useChatRealtime(activeChannelId || undefined);
  const sendMessage = useSendMessage();
  const markAsRead = useMarkAsRead();
  
  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Mark as read when opening channel
  useEffect(() => {
    if (activeChannelId) {
      markAsRead.mutate(activeChannelId);
    }
  }, [activeChannelId]);
  
  // Filter channels by search
  const filteredChannels = channels?.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Group channels by type
  const publicChannels = filteredChannels?.filter(c => c.channel_type === 'public') || [];
  const privateChannels = filteredChannels?.filter(c => c.channel_type === 'private') || [];
  const dmChannels = filteredChannels?.filter(c => c.channel_type === 'direct') || [];
  
  const handleSendMessage = async () => {
    if (!message.trim() || !activeChannelId) return;
    
    // Parse mentions (@username)
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(message)) !== null) {
      mentions.push(match[2]); // User ID
    }
    
    const profileName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : '';
    
    await sendMessage.mutateAsync({
      channelId: activeChannelId,
      content: message,
      mentions: mentions.length > 0 ? mentions : undefined,
    });
    
    setMessage('');
    setTyping(false, profileName);
  };
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChannelId) return;
    
    const contentType = file.type.startsWith('image/') ? 'image' : 'file';
    
    await sendMessage.mutateAsync({
      channelId: activeChannelId,
      content: file.name,
      contentType,
      file,
    });
  };
  
  const handleTyping = (value: string) => {
    setMessage(value);
    const profileName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : '';
    setTyping(value.length > 0, profileName);
  };
  
  const formatMessageDate = (date: string) => {
    const d = new Date(date);
    if (isToday(d)) return format(d, 'h:mm a');
    if (isYesterday(d)) return `Yesterday ${format(d, 'h:mm a')}`;
    return format(d, 'MMM d, h:mm a');
  };
  
  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'private': return <Lock className="h-4 w-4" />;
      case 'direct': return <MessageSquare className="h-4 w-4" />;
      default: return <Hash className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r flex flex-col bg-muted/30">
        {/* Search */}
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search channels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8"
            />
          </div>
        </div>
        
        <ScrollArea className="flex-1">
          {/* Public Channels */}
          <div className="p-2">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Channels</span>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setShowCreateChannel(true)}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            {publicChannels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => setSearchParams({ channel: channel.id })}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted",
                  activeChannelId === channel.id && "bg-muted font-medium"
                )}
              >
                {getChannelIcon(channel.channel_type)}
                <span className="truncate flex-1 text-left">{channel.name}</span>
                {(channel.unread_count ?? 0) > 0 && (
                  <Badge variant="destructive" className="h-5 min-w-5 flex items-center justify-center text-xs">
                    {channel.unread_count}
                  </Badge>
                )}
              </button>
            ))}
          </div>
          
          {/* Private Channels */}
          {privateChannels.length > 0 && (
            <div className="p-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase px-2">Private</span>
              {privateChannels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => setSearchParams({ channel: channel.id })}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted",
                    activeChannelId === channel.id && "bg-muted font-medium"
                  )}
                >
                  <Lock className="h-4 w-4" />
                  <span className="truncate flex-1 text-left">{channel.name}</span>
                  {(channel.unread_count ?? 0) > 0 && (
                    <Badge variant="destructive" className="h-5 min-w-5 flex items-center justify-center text-xs">
                      {channel.unread_count}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          )}
          
          {/* Direct Messages */}
          <div className="p-2">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Direct Messages</span>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setShowNewDM(true)}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            {dmChannels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => setSearchParams({ channel: channel.id })}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted",
                  activeChannelId === channel.id && "bg-muted font-medium"
                )}
              >
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-xs">{channel.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="truncate flex-1 text-left">{channel.name}</span>
                {(channel.unread_count ?? 0) > 0 && (
                  <Badge variant="destructive" className="h-5 min-w-5 flex items-center justify-center text-xs">
                    {channel.unread_count}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeChannel ? (
          <>
            {/* Channel Header */}
            <div className="h-14 border-b flex items-center justify-between px-4">
              <div className="flex items-center gap-2">
                {getChannelIcon(activeChannel.channel_type)}
                <span className="font-semibold">{activeChannel.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => setShowMembers(true)}>
                  <Users className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages?.map((msg, index) => {
                  const showAvatar = index === 0 || 
                    messages[index - 1].sender_id !== msg.sender_id ||
                    new Date(msg.created_at).getTime() - new Date(messages[index - 1].created_at).getTime() > 300000;
                  
                  return (
                    <div key={msg.id} className={cn("group", !showAvatar && "pl-12")}>
                      {showAvatar && (
                        <div className="flex gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={msg.sender?.avatar_url || undefined} />
                            <AvatarFallback>{msg.sender?.first_name?.charAt(0) || '?'}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-baseline gap-2">
                              <span className="font-semibold text-sm">
                                {msg.sender ? `${msg.sender.first_name || ''} ${msg.sender.last_name || ''}`.trim() : 'Unknown'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatMessageDate(msg.created_at)}
                              </span>
                              {msg.is_pinned && <Pin className="h-3 w-3 text-primary" />}
                            </div>
                            <MessageContent message={msg} />
                          </div>
                        </div>
                      )}
                      {!showAvatar && <MessageContent message={msg} />}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            
            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <div className="px-4 py-1 text-sm text-muted-foreground">
                {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
              </div>
            )}
            
            {/* Message Input */}
            <div className="p-4 border-t">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()}>
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                  placeholder={`Message #${activeChannel.name}`}
                  value={message}
                  onChange={(e) => handleTyping(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  className="flex-1"
                />
                <Button onClick={handleSendMessage} disabled={!message.trim() || sendMessage.isPending}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Select a channel to start chatting</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Dialogs */}
      <CreateChannelDialog open={showCreateChannel} onOpenChange={setShowCreateChannel} />
      <NewDMDialog open={showNewDM} onOpenChange={setShowNewDM} />
      {activeChannelId && (
        <ChannelMembersDialog channelId={activeChannelId} open={showMembers} onOpenChange={setShowMembers} />
      )}
    </div>
  );
};

// Message Content Component
const MessageContent = ({ message }: { message: ChatMessage }) => {
  if (message.content_type === 'image' && message.file_path) {
    return (
      <div className="mt-1">
        <img 
          src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/chat-files/${message.file_path}`}
          alt={message.file_name || 'Image'}
          className="max-w-md rounded-lg"
        />
      </div>
    );
  }
  
  if (message.content_type === 'file' && message.file_path) {
    return (
      <a 
        href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/chat-files/${message.file_path}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-primary hover:underline mt-1"
      >
        <Paperclip className="h-4 w-4" />
        {message.file_name}
      </a>
    );
  }
  
  return <p className="text-sm">{message.content}</p>;
};

export default Chat;
