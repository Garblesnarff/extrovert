import { useMutation, useQuery } from '@tanstack/react-query';
import type { Post, PostFormData } from '../types';

import { queryClient } from './queryClient';

export const useCreatePost = () => {
  return useMutation({
    mutationFn: async (data: PostFormData & { postToTwitter?: boolean }) => {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          scheduled_for: data.scheduled_for && data.scheduled_time
            ? new Date(
                new Date(data.scheduled_for).toISOString().split('T')[0] + 'T' + data.scheduled_time
              ).toISOString()
            : null,
          is_draft: data.is_draft || false,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create post');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate both queries to trigger a refresh
      queryClient.invalidateQueries({ queryKey: ['drafts'] });
      queryClient.invalidateQueries({ queryKey: ['scheduled'] });
    },
  });
};

export const useDrafts = () => {
  return useQuery({
    queryKey: ['drafts'],
    queryFn: async () => {
      const response = await fetch('/api/posts/drafts');
      if (!response.ok) {
        throw new Error('Failed to fetch drafts');
      }
      return response.json() as Promise<Post[]>;
    },
  });
};

export const useScheduledPosts = () => {
  return useQuery({
    queryKey: ['scheduled'],
    queryFn: async () => {
      const response = await fetch('/api/posts/scheduled');
      if (!response.ok) {
        throw new Error('Failed to fetch scheduled posts');
      }
      return response.json() as Promise<Post[]>;
    },
  });
};

export const useDeletePost = () => {
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/posts/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete post');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drafts'] });
      queryClient.invalidateQueries({ queryKey: ['scheduled'] });
    },
  });
};

export const useUpdatePost = () => {
  return useMutation({
    mutationFn: async ({ id, ...data }: PostFormData & { id: number }) => {
      const response = await fetch(`/api/posts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update post');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drafts'] });
      queryClient.invalidateQueries({ queryKey: ['scheduled'] });
    },
  });
};
