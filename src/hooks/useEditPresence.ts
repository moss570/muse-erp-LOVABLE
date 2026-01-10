import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ActiveEditor {
  id: string;
  user_id: string;
  resource_type: string;
  resource_id: string;
  started_at: string;
  last_heartbeat: string;
  profile?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
}

interface UseEditPresenceOptions {
  resourceType: string;
  resourceId: string | undefined;
  enabled?: boolean;
  heartbeatInterval?: number; // in milliseconds
}

export function useEditPresence({
  resourceType,
  resourceId,
  enabled = true,
  heartbeatInterval = 30000, // 30 seconds
}: UseEditPresenceOptions) {
  const { user } = useAuth();
  const [activeEditors, setActiveEditors] = useState<ActiveEditor[]>([]);
  const [isRegistered, setIsRegistered] = useState(false);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // Fetch active editors for this resource
  const fetchActiveEditors = useCallback(async () => {
    if (!resourceId) return;

    const { data, error } = await supabase
      .from('active_editors')
      .select(`
        *,
        profile:profiles(first_name, last_name, email)
      `)
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId)
      .gt('last_heartbeat', new Date(Date.now() - 2 * 60 * 1000).toISOString());

    if (!error && data) {
      // Transform the data to match our interface
      const editors = data.map((editor: any) => ({
        ...editor,
        profile: editor.profile || null,
      }));
      setActiveEditors(editors);
    }
  }, [resourceType, resourceId]);

  // Register as an active editor
  const registerAsEditor = useCallback(async () => {
    if (!user?.id || !resourceId || !enabled) return;

    const { data, error } = await supabase
      .from('active_editors')
      .upsert({
        user_id: user.id,
        resource_type: resourceType,
        resource_id: resourceId,
        started_at: new Date().toISOString(),
        last_heartbeat: new Date().toISOString(),
      }, {
        onConflict: 'user_id,resource_type,resource_id',
      })
      .select()
      .single();

    if (!error && data) {
      sessionIdRef.current = data.id;
      setIsRegistered(true);
    }
  }, [user?.id, resourceType, resourceId, enabled]);

  // Send heartbeat to keep session alive
  const sendHeartbeat = useCallback(async () => {
    if (!user?.id || !resourceId || !sessionIdRef.current) return;

    await supabase
      .from('active_editors')
      .update({ last_heartbeat: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId);
  }, [user?.id, resourceType, resourceId]);

  // Unregister as an editor
  const unregisterAsEditor = useCallback(async () => {
    if (!user?.id || !resourceId) return;

    await supabase
      .from('active_editors')
      .delete()
      .eq('user_id', user.id)
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId);

    sessionIdRef.current = null;
    setIsRegistered(false);
  }, [user?.id, resourceType, resourceId]);

  // Set up real-time subscription
  useEffect(() => {
    if (!resourceId || !enabled) return;

    fetchActiveEditors();

    const channel = supabase
      .channel(`editors-${resourceType}-${resourceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'active_editors',
          filter: `resource_type=eq.${resourceType}`,
        },
        (payload) => {
          // Refetch on any change
          fetchActiveEditors();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [resourceType, resourceId, enabled, fetchActiveEditors]);

  // Register and set up heartbeat when component mounts
  useEffect(() => {
    if (!enabled || !resourceId) return;

    registerAsEditor();

    // Set up heartbeat interval
    heartbeatRef.current = setInterval(sendHeartbeat, heartbeatInterval);

    // Cleanup on unmount
    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      unregisterAsEditor();
    };
  }, [enabled, resourceId, registerAsEditor, sendHeartbeat, unregisterAsEditor, heartbeatInterval]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, stop heartbeat
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current);
        }
      } else {
        // Page is visible again, send heartbeat and restart interval
        sendHeartbeat();
        heartbeatRef.current = setInterval(sendHeartbeat, heartbeatInterval);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [sendHeartbeat, heartbeatInterval]);

  // Get other editors (excluding current user)
  const otherEditors = activeEditors.filter(editor => editor.user_id !== user?.id);

  return {
    activeEditors,
    otherEditors,
    isRegistered,
    registerAsEditor,
    unregisterAsEditor,
    refetch: fetchActiveEditors,
  };
}
