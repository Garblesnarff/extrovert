import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMProvider, ProviderResponse } from './types';

export class GeminiProvider implements LLMProvider {
  private model: any;
  public name = 'gemini';

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      const genAI = new GoogleGenerativeAI(apiKey);
      this.model = genAI.getGenerativeModel({ model: "gemini-pro" });
    }
  }

  isAvailable(): boolean {
    return !!process.env.GEMINI_API_KEY;
  }

  async generateResponse(prompt: string): Promise<ProviderResponse> {
    if (!this.isAvailable()) {
      throw new Error('Gemini API key not configured');
    }

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return {
      suggestedContent: text,
      hashtags: this.extractHashtags(text),
      analysis: "Generated using Gemini AI",
      provider: this.name
    };
  }

  private extractHashtags(text: string): string[] {
    const matches = text.match(/#[a-zA-Z0-9]+/g) || [];
    return matches.map(tag => tag.toLowerCase());
  }
}
