import { Groq } from 'groq-sdk';
import { LLMProvider, ProviderResponse } from './types';

export class GroqProvider implements LLMProvider {
  private client!: Groq;
  public name = 'groq';
  public availableModels = [
    {
      name: 'mixtral-8x7b-32768',
      displayName: 'Mixtral 8x7B',
      description: 'High-performance model with 32k context',
      maxTokens: 32768,
      defaultTemperature: 0.7
    },
    {
      name: 'llama2-70b-4096',
      displayName: 'LLaMA 2 70B',
      description: 'Powerful model with 4k context',
      maxTokens: 4096,
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
