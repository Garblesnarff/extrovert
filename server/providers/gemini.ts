import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMProvider, ProviderResponse } from './types';

export class GeminiProvider implements LLMProvider {
  private genAI: any;
  public name = 'gemini';
  public availableModels = [
    {
      name: 'gemini-1.5-flash',
      displayName: 'Gemini 1.5 Flash',
      description: 'Fast and efficient text generation',
      maxTokens: 16384,
      defaultTemperature: 0.7
    },
    {
      name: 'gemini-1.5-flash-8b',
      displayName: 'Gemini 1.5 Flash 8B',
      description: 'Lightweight and fast text generation',
      maxTokens: 16384,
      defaultTemperature: 0.7
    },
    {
      name: 'gemini-1.5-pro',
      displayName: 'Gemini 1.5 Pro',
      description: 'Advanced text generation and analysis',
      maxTokens: 32768,
      defaultTemperature: 0.7
    }
  ];

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  isAvailable(): boolean {
    return !!process.env.GEMINI_API_KEY;
  }

  async generateResponse(prompt: string, model = 'gemini-pro'): Promise<ProviderResponse> {
    if (!this.isAvailable()) {
      throw new Error('Gemini API key not configured');
    }

    const modelInstance = this.genAI.getGenerativeModel({ model });
    const result = await modelInstance.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return {
      suggestedContent: text,
      hashtags: this.extractHashtags(text),
      analysis: "Generated using Gemini AI",
      provider: this.name,
      model
    };
  }

  private extractHashtags(text: string): string[] {
    const matches = text.match(/#[a-zA-Z0-9]+/g) || [];
    return matches.map(tag => tag.toLowerCase());
  }
}
