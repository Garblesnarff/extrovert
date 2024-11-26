import { useQuery } from '@tanstack/react-query';

export interface AnalyticsData {
  total: number;
  drafts: number;
  scheduled: number;
  postsByDay: Record<string, number>;
  averageContentLength: number;
  scheduleByHour: Record<number, number>;
}

export const useAnalytics = () => {
  return useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const response = await fetch('/api/analytics');
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      return response.json() as Promise<AnalyticsData>;
    },
  });
};
