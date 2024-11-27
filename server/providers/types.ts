export interface ProviderResponse {
  suggestedContent: string;
  hashtags: string[];
  analysis: string;
  provider: string;
}

export interface LLMProvider {
  name: string;
  generateResponse(prompt: string): Promise<ProviderResponse>;
  isAvailable(): boolean;
}
