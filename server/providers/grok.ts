import { LLMProvider, ProviderResponse } from './types';

export class GrokProvider implements LLMProvider {
  public name = 'grok';

  constructor() {
    // Initialize Grok client when API becomes available
  }

  isAvailable(): boolean {
    return false; // Grok API not publicly available yet
  }

  async generateResponse(prompt: string): Promise<ProviderResponse> {
    throw new Error('Grok API not available yet');
  }

  private extractHashtags(text: string): string[] {
    const matches = text.match(/#[a-zA-Z0-9]+/g) || [];
    return matches.map(tag => tag.toLowerCase());
  }
}
