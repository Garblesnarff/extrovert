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
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
    } else {
      console.warn('X AI API key not configured, Grok provider will be unavailable');
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
      console.error('Attempted to use Grok AI without API key');
      throw new Error('X AI API key not configured');
    }

    try {
      console.log('Generating response using Grok AI...');
      const completion = await this.client.chat.completions.create({
        model: 'grok-beta',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1000,
        stream: false,
      });

      if (!completion.choices || completion.choices.length === 0) {
        console.error('Grok AI returned empty response');
        throw new Error('No response generated');
      }

      const text = completion.choices[0]?.message?.content;
      if (!text) {
        console.error('Grok AI response missing content');
        throw new Error('Response content missing');
      }

      console.log('Successfully generated response from Grok AI');
      return {
        suggestedContent: text,
        hashtags: this.extractHashtags(text),
        analysis: 'Generated using Grok AI',
        provider: this.name,
      };
    } catch (error) {
      console.error('Error generating response from Grok AI:', error);
      if (error instanceof Error) {
        throw new Error(`Grok AI Error: ${error.message}`);
      }
      throw new Error('Unknown error occurred while generating response');
    }
  }

  private extractHashtags(text: string): string[] {
    try {
      const matches = text.match(/#[a-zA-Z0-9]+/g) || [];
      return matches.map(tag => tag.toLowerCase());
    } catch (error) {
      console.warn('Error extracting hashtags:', error);
      return [];
    }
  }
}
