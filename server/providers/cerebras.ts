import OpenAI from 'openai';
import { LLMProvider, ProviderResponse } from './types';

export class CerebrasProvider implements LLMProvider {
  private client!: OpenAI;
  public name = 'cerebras';
  public availableModels = [
    {
      name: 'llama3.1-8b',
      displayName: 'LLaMA 3.1 8B',
      description: 'Efficient language model for general tasks',
      maxTokens: 8192,
      defaultTemperature: 0.7
    },
    {
      name: 'llama3.1-70b',
      displayName: 'LLaMA 3.1 70B',
      description: 'Large-scale language model for complex tasks',
      maxTokens: 8192,
      defaultTemperature: 0.7
    }
  ];

  constructor() {
    const apiKey = process.env.CEREBRAS_API_KEY;
    if (apiKey) {
      this.client = new OpenAI({
        apiKey: apiKey,
        baseURL: 'https://api.cerebras.ai/v1',
        defaultHeaders: {
          'User-Agent': 'cerebras-client/1.0.0',
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
    }
  }

  isAvailable(): boolean {
    return !!process.env.CEREBRAS_API_KEY;
  }

  async generateResponse(prompt: string, model = 'llama3.1-70b'): Promise<ProviderResponse> {
    if (!this.isAvailable()) {
      throw new Error('Cerebras API key not configured');
    }

    try {
      const completion = await this.client.chat.completions.create({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 8192,
        stream: false,
      });

      const text = completion.choices[0]?.message?.content;
      if (!text) {
        throw new Error('Response content missing');
      }

      return {
        suggestedContent: text,
        hashtags: this.extractHashtags(text),
        analysis: 'Generated using Cerebras AI',
        provider: this.name,
        model
      };
    } catch (error) {
      console.error('Error generating response from Cerebras AI:', error);
      if (error instanceof Error) {
        throw new Error(`Cerebras AI Error: ${error.message}`);
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
