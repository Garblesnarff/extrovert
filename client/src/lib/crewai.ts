import { useMutation, useQuery } from '@tanstack/react-query';

interface AIRequest {
  prompt: string;
  provider?: string;
  model?: string;
}

export const useAvailableProviders = () => {
  return useQuery({
    queryKey: ['ai', 'providers'],
    queryFn: async () => {
      const response = await fetch('/api/ai/providers');
      if (!response.ok) {
        throw new Error('Failed to fetch AI providers');
      }
      return response.json() as Promise<Array<{
        name: string;
        models: Array<{
          name: string;
          displayName: string;
          description: string;
          maxTokens: number;
          defaultTemperature: number;
        }>;
        isAvailable: boolean;
      }>>;
    },
  });
};

export const useAIAssistant = () => {
  return useMutation({
    mutationFn: async ({ prompt, provider, model }: AIRequest) => {
      try {
        const response = await fetch('/api/ai/assist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt, provider, model }),
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to get AI assistance');
        }
        
        return response.json();
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`AI Assistant Error: ${error.message}`);
        }
        throw error;
      }
    },
  });
};

export const useContentResearch = () => {
  return useMutation({
    mutationFn: async ({ prompt, provider, model }: AIRequest) => {
      try {
        const response = await fetch('/api/ai/research', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt, provider, model }),
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to research content');
        }
        
        return response.json();
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Content Research Error: ${error.message}`);
        }
        throw error;
      }
    },
  });
};
