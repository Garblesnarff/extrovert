export interface Post {
  id: number;
  content: string;
  scheduledFor?: Date;
  isDraft: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostFormData {
  content: string;
  scheduledFor?: Date;
  scheduledTime?: string;
  isDraft?: boolean;
}

export interface AIAssistResponse {
  suggestedContent: string;
  hashtags: string[];
  analysis: string;
}
