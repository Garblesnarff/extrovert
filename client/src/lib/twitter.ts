import { useMutation, useQuery } from '@tanstack/react-query';
import type { Post, PostFormData } from '../types';

import { queryClient } from './queryClient';

export const useCreatePost = () => {
  return useMutation({
    mutationFn: async (data: PostFormData) => {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          scheduledFor: data.scheduledFor && data.scheduledTime
            ? new Date(
                new Date(data.scheduledFor).toISOString().split('T')[0] + 'T' + data.scheduledTime
              ).toISOString()
            : null,
          isDraft: data.isDraft || false,
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
