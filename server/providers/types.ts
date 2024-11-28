export interface ModelConfig {
  name: string;
  displayName: string;
  description: string;
  maxTokens: number;
  defaultTemperature: number;
}

export interface ProviderResponse {
  suggestedContent: string;
  hashtags: string[];
  analysis: string;
  provider: string;
  model: string;
}

export interface LLMProvider {
  name: string;
  availableModels: ModelConfig[];
  generateResponse(prompt: string, model?: string): Promise<ProviderResponse>;
  isAvailable(): boolean;
}
