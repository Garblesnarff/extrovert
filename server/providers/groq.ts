import { Groq } from 'groq-sdk';
import { LLMProvider, ProviderResponse } from './types';

export class GroqProvider implements LLMProvider {
  private client!: Groq;
  public name = 'groq';
  public availableModels = [
    {
      name: 'gemma2-9b-it',
      displayName: 'Gemma 2 9B',
      description: 'Gemma 2 9B model optimized for chat',
      maxTokens: 8192,
      defaultTemperature: 0.7
    },
    {
      name: 'gemma-7b-it',
      displayName: 'Gemma 7B',
      description: 'Gemma 7B model optimized for chat',
      maxTokens: 8192,
      defaultTemperature: 0.7
    },
    {
      name: 'llama-3.1-70b-versatile',
      displayName: 'LLaMA 3.1 70B Versatile',
      description: 'Versatile large language model',
      maxTokens: 8192,
      defaultTemperature: 0.7
    },
    {
      name: 'llama-3.1-8b-instant',
      displayName: 'LLaMA 3.1 8B Instant',
      description: 'Fast and efficient language model',
      maxTokens: 8192,
      defaultTemperature: 0.7
    },
    {
      name: 'llama-3.2-1b-preview',
      displayName: 'LLaMA 3.2 1B Preview',
      description: 'Preview version of LLaMA 3.2',
      maxTokens: 4096,
      defaultTemperature: 0.7
    },
    {
      name: 'llama-3.2-3b-preview',
      displayName: 'LLaMA 3.2 3B Preview',
      description: 'Preview version of LLaMA 3.2',
      maxTokens: 4096,
      defaultTemperature: 0.7
    },
    {
      name: 'llama3-70b-8192',
      displayName: 'LLaMA 3 70B',
      description: 'Latest LLaMA 3 large model',
      maxTokens: 8192,
      defaultTemperature: 0.7
    },
    {
      name: 'llama3-8b-8192',
      displayName: 'LLaMA 3 8B',
      description: 'Latest LLaMA 3 efficient model',
      maxTokens: 8192,
      defaultTemperature: 0.7
    },
    {
      name: 'mixtral-8x7b-32768',
      displayName: 'Mixtral 8x7B',
      description: 'High-performance model with 32k context',
      maxTokens: 32768,
      defaultTemperature: 0.7
    }
  ];

  constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    if (apiKey) {
      this.client = new Groq({
        apiKey: apiKey,
      });
    }
  }

  isAvailable(): boolean {
    return !!process.env.GROQ_API_KEY;
  }

  async generateResponse(prompt: string, model = 'mixtral-8x7b-32768'): Promise<ProviderResponse> {
    if (!this.isAvailable()) {
      throw new Error('Groq API key not configured');
    }

    const completion = await this.client.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: model,
    });

    const text = completion.choices[0]?.message?.content || '';

    return {
      suggestedContent: text,
      hashtags: this.extractHashtags(text),
      analysis: "Generated using Groq AI",
      provider: this.name,
      model
    };
  }

  private extractHashtags(text: string): string[] {
    const matches = text.match(/#[a-zA-Z0-9]+/g) || [];
    return matches.map(tag => tag.toLowerCase());
  }
}
