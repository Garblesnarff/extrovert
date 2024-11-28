import { LLMProvider, ProviderResponse } from './types';
import { GeminiProvider } from './gemini';
import { GroqProvider } from './groq';
import { GrokProvider } from './grok';

const providers: LLMProvider[] = [
  new GeminiProvider(),
  new GroqProvider(),
  new GrokProvider(),
];

export async function getAIResponse(prompt: string, preferredProvider?: string, model?: string): Promise<ProviderResponse> {
  // If preferred provider is specified, try it first
  if (preferredProvider) {
    const provider = providers.find(p => p.name === preferredProvider);
    if (provider) {
      try {
        return await provider.generateResponse(prompt, model);
      } catch (error) {
        console.error(`Error with preferred provider ${preferredProvider}:`, error);
        // Fall through to try other providers
      }
    }
  }

  // Try each provider in order until one succeeds
  for (const provider of providers) {
    if (provider.name !== preferredProvider) {
      try {
        return await provider.generateResponse(prompt);
      } catch (error) {
        console.error(`Error with provider ${provider.name}:`, error);
        continue;
      }
    }
  }

  throw new Error('All providers failed to generate response');
}

export { providers };
