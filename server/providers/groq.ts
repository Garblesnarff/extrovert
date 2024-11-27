import { Groq } from 'groq-sdk';
import { LLMProvider, ProviderResponse } from './types';

export class GroqProvider implements LLMProvider {
  private client!: Groq;
  public name = 'groq';

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

  async generateResponse(prompt: string): Promise<ProviderResponse> {
    if (!this.isAvailable()) {
      throw new Error('Groq API key not configured');
    }

    const completion = await this.client.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "mixtral-8x7b-32768",
    });

    const text = completion.choices[0]?.message?.content || '';

    return {
      suggestedContent: text,
      hashtags: this.extractHashtags(text),
      analysis: "Generated using Groq AI",
      provider: this.name
    };
  }

  private extractHashtags(text: string): string[] {
    const matches = text.match(/#[a-zA-Z0-9]+/g) || [];
    return matches.map(tag => tag.toLowerCase());
  }
}
