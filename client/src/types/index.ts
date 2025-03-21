export interface Post {
  id: number;
  content: string;
  scheduledFor?: Date;
  isDraft: boolean;
  createdAt: Date;
  updatedAt: Date;
  postedAt?: Date;
  status: 'draft' | 'scheduled' | 'posted' | 'failed';
  tweetId?: string;
  error?: string;
}

export interface PostFormData {
  content: string;
  scheduledFor?: Date;
  scheduledTime?: string;
  isDraft?: boolean;
  recurringPattern?: 'daily' | 'weekly' | 'monthly' | null;
  recurringEndDate?: Date;
}

export interface AIAssistResponse {
  suggestedContent: string;
  hashtags: string[];
  analysis: string;
}