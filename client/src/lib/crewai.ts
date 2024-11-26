import { useMutation } from '@tanstack/react-query';

export const useAIAssistant = () => {
  return useMutation({
    mutationFn: async (prompt: string) => {
      const response = await fetch('/api/ai/assist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get AI assistance');
      }
      
      return response.json();
    },
  });
};

export const useContentResearch = () => {
  return useMutation({
    mutationFn: async (topic: string) => {
      const response = await fetch('/api/ai/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to research content');
      }
      
      return response.json();
    },
  });
};
