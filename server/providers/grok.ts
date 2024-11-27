import OpenAI from 'openai';
import { LLMProvider, ProviderResponse } from './types';

export class GrokProvider implements LLMProvider {
  private client: OpenAI;
  public name = 'grok';

  constructor() {
    const apiKey = process.env.X_AI_API_KEY;
    if (apiKey) {
      this.client = new OpenAI({
        apiKey: apiKey,
        baseURL: 'https://api.x.ai/v1',
        defaultHeaders: {
          'User-Agent': 'grok-client/1.0.0',
        },
      });
    } else {
      // Initialize with a dummy client to satisfy TypeScript
      this.client = new OpenAI({
        apiKey: 'dummy',
        baseURL: 'https://api.x.ai/v1',
      });
    }
  }

  isAvailable(): boolean {
    return !!process.env.X_AI_API_KEY;
  }

  async generateResponse(prompt: string): Promise<ProviderResponse> {
    if (!this.isAvailable()) {
      throw new Error('X AI API key not configured');
    }

    try {
      const completion = await this.client.chat.completions.create({
        model: 'grok-v2',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const text = completion.choices[0]?.message?.content || '';

      return {
        suggestedContent: text,
        hashtags: this.extractHashtags(text),
        analysis: 'Generated using Grok AI',
        provider: this.name,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Grok AI Error: ${error.message}`);
      }
      throw error;
    }
  }

  private extractHashtags(text: string): string[] {
    const matches = text.match(/#[a-zA-Z0-9]+/g) || [];
    return matches.map(tag => tag.toLowerCase());
  }
}
