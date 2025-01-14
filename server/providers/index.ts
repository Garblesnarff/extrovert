import { LLMProvider, ProviderResponse } from './types';
import { GeminiProvider } from './gemini';
import { GroqProvider } from './groq';
import { GrokProvider } from './grok';
import { CerebrasProvider } from './cerebras';

const providers: LLMProvider[] = [
  new GeminiProvider(),
  new GroqProvider(),
  new GrokProvider(),
  new CerebrasProvider(),
];

export async function getAIResponse(prompt: string, preferredProvider?: string, model?: string, maxRetries = 3): Promise<ProviderResponse> {
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  async function tryProvider(provider: LLMProvider, retries: number): Promise<ProviderResponse> {
    for (let i = 0; i < retries; i++) {
      try {
        return await provider.generateResponse(prompt, model);
      } catch (error) {
        console.error(`Attempt ${i + 1}/${retries} failed for ${provider.name}:`, error);
        if (i < retries - 1) await delay(1000 * Math.pow(2, i)); // Exponential backoff
      }
    }
    throw new Error(`Failed after ${retries} attempts with ${provider.name}`);
  }

  // If preferred provider is specified, try it first
  if (preferredProvider) {
    const provider = providers.find(p => p.name === preferredProvider);
    if (provider) {
      try {
        return await tryProvider(provider, maxRetries);
      } catch (error) {
        console.error(`All retries failed with preferred provider ${preferredProvider}`);
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
