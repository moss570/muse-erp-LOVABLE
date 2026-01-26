import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { PolicyComment, PolicyCommentFormData } from '@/types/policies';

// Fetch all comments for a policy (with threading support)
export function usePolicyComments(
  policyId: string,
  options?: { includeResolved?: boolean }
) {
  return useQuery({
    queryKey: ['policy-comments', policyId, options?.includeResolved],
    queryFn: async () => {
      let query = supabase
        .from('policy_comments')
        .select(`
          *,
          created_by_profile:profiles!policy_comments_created_by_fkey(id, first_name, last_name, avatar_url),
          resolved_by_profile:profiles!policy_comments_resolved_by_fkey(id, first_name, last_name, avatar_url),
          parent_comment:policy_comments!policy_comments_parent_comment_id_fkey(id, comment_text)
        `)
        .eq('policy_id', policyId)
        .order('created_at', { ascending: false });

      // Filter by resolved status unless includeResolved is true
      if (!options?.includeResolved) {
        query = query.eq('is_resolved', false);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as PolicyComment[];
    },
    enabled: !!policyId,
  });
}

// Fetch comments by type
export function usePolicyCommentsByType(
  policyId: string,
  commentType: 'General' | 'Suggestion' | 'Issue' | 'Approval_Note'
) {
  return useQuery({
    queryKey: ['policy-comments-by-type', policyId, commentType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('policy_comments')
        .select(`
          *,
          created_by_profile:profiles!policy_comments_created_by_fkey(id, first_name, last_name, avatar_url),
          resolved_by_profile:profiles!policy_comments_resolved_by_fkey(id, first_name, last_name, avatar_url)
        `)
        .eq('policy_id', policyId)
        .eq('comment_type', commentType)
        .eq('is_resolved', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as PolicyComment[];
    },
    enabled: !!policyId,
  });
}

// Fetch threaded comments (replies to a parent comment)
export function useThreadedComments(parentCommentId: string) {
  return useQuery({
    queryKey: ['threaded-comments', parentCommentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('policy_comments')
        .select(`
          *,
          created_by_profile:profiles!policy_comments_created_by_fkey(id, first_name, last_name, avatar_url),
          resolved_by_profile:profiles!policy_comments_resolved_by_fkey(id, first_name, last_name, avatar_url)
        `)
        .eq('parent_comment_id', parentCommentId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as unknown as PolicyComment[];
    },
    enabled: !!parentCommentId,
  });
}

// Fetch single comment
export function usePolicyComment(commentId: string) {
  return useQuery({
    queryKey: ['policy-comment', commentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('policy_comments')
        .select(`
          *,
          created_by_profile:profiles!policy_comments_created_by_fkey(id, first_name, last_name, avatar_url),
          resolved_by_profile:profiles!policy_comments_resolved_by_fkey(id, first_name, last_name, avatar_url),
          parent_comment:policy_comments!policy_comments_parent_comment_id_fkey(id, comment_text),
          policy:policies(id, policy_number, title)
        `)
        .eq('id', commentId)
        .single();

      if (error) throw error;
      return data as unknown as PolicyComment;
    },
    enabled: !!commentId,
  });
}

// Create new comment
export function useCreatePolicyComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (comment: PolicyCommentFormData) => {
      const { data, error } = await supabase
        .from('policy_comments')
        .insert([comment])
        .select(`
          *,
          created_by_profile:profiles!policy_comments_created_by_fkey(id, first_name, last_name, avatar_url)
        `)
        .single();

      if (error) throw error;
      return data as unknown as PolicyComment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['policy-comments', data.policy_id] });
      queryClient.invalidateQueries({ queryKey: ['policy', data.policy_id] });

      // If this is a reply, invalidate the threaded comments query
      if (data.parent_comment_id) {
        queryClient.invalidateQueries({ queryKey: ['threaded-comments', data.parent_comment_id] });
      }

      toast.success('Comment added successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add comment: ${error.message}`);
    },
  });
}

// Update comment
export function useUpdatePolicyComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<PolicyCommentFormData>;
    }) => {
      const { data, error } = await supabase
        .from('policy_comments')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          created_by_profile:profiles!policy_comments_created_by_fkey(id, first_name, last_name, avatar_url),
          resolved_by_profile:profiles!policy_comments_resolved_by_fkey(id, first_name, last_name, avatar_url)
        `)
        .single();

      if (error) throw error;
      return data as unknown as PolicyComment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['policy-comments', data.policy_id] });
      queryClient.invalidateQueries({ queryKey: ['policy-comment', data.id] });
      toast.success('Comment updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update comment: ${error.message}`);
    },
  });
}

// Resolve comment
export function useResolvePolicyComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentId,
      resolvedBy,
    }: {
      commentId: string;
      resolvedBy: string;
    }) => {
      const { data, error } = await supabase
        .from('policy_comments')
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: resolvedBy,
        })
        .eq('id', commentId)
        .select(`
          *,
          created_by_profile:profiles!policy_comments_created_by_fkey(id, first_name, last_name, avatar_url),
          resolved_by_profile:profiles!policy_comments_resolved_by_fkey(id, first_name, last_name, avatar_url)
        `)
        .single();

      if (error) throw error;
      return data as unknown as PolicyComment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['policy-comments', data.policy_id] });
      queryClient.invalidateQueries({ queryKey: ['policy-comment', data.id] });
      queryClient.invalidateQueries({ queryKey: ['policy', data.policy_id] });
      toast.success('Comment resolved');
    },
    onError: (error: Error) => {
      toast.error(`Failed to resolve comment: ${error.message}`);
    },
  });
}

// Unresolve comment
export function useUnresolvePolicyComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: string) => {
      const { data, error } = await supabase
        .from('policy_comments')
        .update({
          is_resolved: false,
          resolved_at: null,
          resolved_by: null,
        })
        .eq('id', commentId)
        .select(`
          *,
          created_by_profile:profiles!policy_comments_created_by_fkey(id, first_name, last_name, avatar_url)
        `)
        .single();

      if (error) throw error;
      return data as unknown as PolicyComment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['policy-comments', data.policy_id] });
      queryClient.invalidateQueries({ queryKey: ['policy-comment', data.id] });
      queryClient.invalidateQueries({ queryKey: ['policy', data.policy_id] });
      toast.success('Comment reopened');
    },
    onError: (error: Error) => {
      toast.error(`Failed to reopen comment: ${error.message}`);
    },
  });
}

// Delete comment
export function useDeletePolicyComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Check if this comment has replies
      const { data: replies, error: repliesError } = await supabase
        .from('policy_comments')
        .select('id')
        .eq('parent_comment_id', id);

      if (repliesError) throw repliesError;

      if (replies && replies.length > 0) {
        throw new Error('Cannot delete comment with replies. Please delete replies first.');
      }

      // Get policy_id before deletion
      const { data: comment, error: fetchError } = await supabase
        .from('policy_comments')
        .select('policy_id')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Delete the comment
      const { error } = await supabase
        .from('policy_comments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return { id, policy_id: comment.policy_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['policy-comments', data.policy_id] });
      queryClient.invalidateQueries({ queryKey: ['policy-comment', data.id] });
      queryClient.invalidateQueries({ queryKey: ['policy', data.policy_id] });
      toast.success('Comment deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete comment: ${error.message}`);
    },
  });
}

// Get comment statistics for a policy
export function usePolicyCommentStats(policyId: string) {
  return useQuery({
    queryKey: ['policy-comment-stats', policyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('policy_comments')
        .select('id, comment_type, is_resolved, parent_comment_id')
        .eq('policy_id', policyId);

      if (error) throw error;

      const stats = {
        total_comments: data.length,
        open_comments: data.filter(c => !c.is_resolved).length,
        resolved_comments: data.filter(c => c.is_resolved).length,
        general_comments: data.filter(c => c.comment_type === 'General').length,
        suggestions: data.filter(c => c.comment_type === 'Suggestion').length,
        issues: data.filter(c => c.comment_type === 'Issue').length,
        approval_notes: data.filter(c => c.comment_type === 'Approval_Note').length,
        threaded_replies: data.filter(c => c.parent_comment_id !== null).length,
        top_level_comments: data.filter(c => c.parent_comment_id === null).length,
      };

      return stats;
    },
    enabled: !!policyId,
  });
}

// Build threaded comment structure
export function buildCommentTree(comments: PolicyComment[]): PolicyComment[] {
  const commentMap = new Map<string, PolicyComment & { replies?: PolicyComment[] }>();
  const rootComments: (PolicyComment & { replies?: PolicyComment[] })[] = [];

  // First pass: Create map of all comments
  comments.forEach(comment => {
    commentMap.set(comment.id, { ...comment, replies: [] });
  });

  // Second pass: Build tree structure
  comments.forEach(comment => {
    const commentWithReplies = commentMap.get(comment.id)!;

    if (comment.parent_comment_id) {
      const parent = commentMap.get(comment.parent_comment_id);
      if (parent) {
        parent.replies = parent.replies || [];
        parent.replies.push(commentWithReplies);
      }
    } else {
      rootComments.push(commentWithReplies);
    }
  });

  return rootComments;
}
