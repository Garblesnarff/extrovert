export interface Post {
  id: number;
  content: string;
  scheduled_for?: Date;
  is_draft: boolean;
  created_at: Date;
  updated_at: Date;
  recurring_pattern?: string;
  recurring_end_date?: Date;
}

export interface PostFormData {
  content: string;
  scheduled_for?: Date;
  scheduled_time?: string;
  is_draft?: boolean;
  recurring_pattern?: 'daily' | 'weekly' | 'monthly' | null;
  recurring_end_date?: Date;
}

export interface AIAssistResponse {
  suggestedContent: string;
  hashtags: string[];
  analysis: string;
}
