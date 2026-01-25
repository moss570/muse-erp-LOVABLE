import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyPress?: (e: KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  channelId?: string;
}

interface MentionUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

const MentionInput = ({ 
  value, 
  onChange, 
  onKeyPress, 
  placeholder, 
  className,
  channelId 
}: MentionInputProps) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStart, setMentionStart] = useState(-1);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fetch users for mentions
  const { data: users } = useQuery({
    queryKey: ['mention-users', channelId],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url')
        .order('first_name');
      return data as MentionUser[];
    },
  });

  // Filter users based on mention query
  const filteredUsers = users?.filter(user => {
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
    return fullName.includes(mentionQuery.toLowerCase());
  }).slice(0, 8) || [];

  // Handle input change and detect @ mentions
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    
    onChange(newValue);
    
    // Find if we're in a mention context
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      // Check if there's no space after @ (still typing mention)
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setMentionQuery(textAfterAt);
        setMentionStart(lastAtIndex);
        setShowSuggestions(true);
        setSelectedIndex(0);
        return;
      }
    }
    
    setShowSuggestions(false);
    setMentionQuery('');
    setMentionStart(-1);
  };

  // Insert mention into input
  const insertMention = (user: MentionUser) => {
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    const beforeMention = value.substring(0, mentionStart);
    const afterMention = value.substring(mentionStart + mentionQuery.length + 1); // +1 for @
    
    // Format: @[Full Name](user_id)
    const mentionText = `@[${fullName}](${user.id}) `;
    const newValue = beforeMention + mentionText + afterMention;
    
    onChange(newValue);
    setShowSuggestions(false);
    setMentionQuery('');
    setMentionStart(-1);
    
    // Focus back on input
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || filteredUsers.length === 0) {
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredUsers.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredUsers.length - 1
        );
        break;
      case 'Enter':
        if (showSuggestions && filteredUsers[selectedIndex]) {
          e.preventDefault();
          insertMention(filteredUsers[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowSuggestions(false);
        break;
      case 'Tab':
        if (showSuggestions && filteredUsers[selectedIndex]) {
          e.preventDefault();
          insertMention(filteredUsers[selectedIndex]);
        }
        break;
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format display value (convert @[Name](id) to just @Name for display)
  const getDisplayValue = () => {
    return value.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1');
  };

  return (
    <div className="relative flex-1">
      <Input
        ref={inputRef}
        value={getDisplayValue()}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onKeyPress={(e) => {
          if (!showSuggestions && onKeyPress) {
            onKeyPress(e);
          }
        }}
        placeholder={placeholder}
        className={className}
      />
      
      {/* Suggestions dropdown */}
      {showSuggestions && filteredUsers.length > 0 && (
        <div 
          ref={suggestionsRef}
          className="absolute bottom-full left-0 right-0 mb-1 bg-popover border rounded-lg shadow-lg z-[200] max-h-64 overflow-y-auto"
        >
          <div className="p-1">
            <p className="px-2 py-1 text-xs text-muted-foreground font-medium">
              People
            </p>
            {filteredUsers.map((user, index) => {
              const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown';
              
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => insertMention(user)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left",
                    "hover:bg-accent",
                    index === selectedIndex && "bg-accent"
                  )}
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {user.first_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{fullName}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MentionInput;