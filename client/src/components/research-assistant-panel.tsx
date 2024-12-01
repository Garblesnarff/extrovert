import { useState } from 'react';
import { Search, BookOpen, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useContentResearch } from '@/lib/crewai';
import { ResizablePanel } from '@/components/ui/resizable';

interface ResearchResult {
  fact: string;
  source?: string;
  confidence: 'high' | 'medium' | 'low';
  context?: string;
}

export function ResearchAssistantPanel() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ResearchResult[]>([]);
  const contentResearch = useContentResearch();

  const handleResearch = async () => {
    if (!query.trim()) return;

    try {
      if (!query.trim()) {
        console.warn('Empty query provided');
        return;
      }

      const response = await contentResearch.mutateAsync({
        prompt: `Research and fact-check the following topic: ${query}
                For each fact, please provide:
                1. The verified fact
                2. Source: Reference or citation if available
                3. Context: Additional background information
                4. Confidence level indicators (use phrases like "Verified by multiple sources", "Likely based on evidence", or "Requires further verification")
                
                Format each fact as a separate section with clear labels.`,
        provider: 'gemini',
        model: 'gemini-pro'
      });

      if (!response?.suggestedContent) {
        throw new Error('Invalid response format from AI service');
      }

      const parsedResults = parseResearchResponse(response.suggestedContent);
      setResults(parsedResults);
    } catch (error) {
      console.error('Research failed:', error);
      // Add user feedback for the error
      setResults([{
        fact: 'Research query failed',
        confidence: 'low',
        context: error instanceof Error ? error.message : 'An unexpected error occurred',
      }]);
    }
  };

  const parseResearchResponse = (content: string): ResearchResult[] => {
    try {
      // First try to split by double newline for structured content
      let sections = content.split('\n\n').filter(section => section.trim());
      
      // If we don't get any valid sections, try single newline
      if (sections.length === 0) {
        sections = [content]; // Treat entire content as one section
      }

      return sections.map(section => {
        const lines = section.split('\n');
        
        // Extract fact - first non-empty line without numbering
        const fact = lines
          .find(line => line.trim().length > 0)
          ?.replace(/^[\d\.\s-]*/, '')
          .trim() || 'No fact found';

        // Look for source and context in any line
        const source = lines
          .find(line => 
            line.toLowerCase().includes('source:') || 
            line.toLowerCase().includes('reference:'))
          ?.replace(/^(source:|reference:)/i, '')
          .trim();

        const contextLine = lines
          .find(line => line.toLowerCase().includes('context:'))
          ?.replace(/^context:/i, '')
          .trim();

        return {
          fact,
          source,
          confidence: determineConfidence(section),
          context: contextLine || extractContext(fact)
        };
      });
    } catch (error) {
      console.error('Failed to parse research response:', error);
      return [{
        fact: 'Failed to parse research results',
        confidence: 'low',
        context: 'There was an error processing the AI response',
      }];
    }
  };

  const determineConfidence = (fact: string): 'high' | 'medium' | 'low' => {
    if (fact.toLowerCase().includes('verified') || fact.toLowerCase().includes('confirmed')) {
      return 'high';
    }
    if (fact.toLowerCase().includes('likely') || fact.toLowerCase().includes('probably')) {
      return 'medium';
    }
    return 'low';
  };

  const extractContext = (fact: string): string => {
    const contextMatch = fact.match(/\((.*?)\)/);
    return contextMatch ? contextMatch[1] : '';
  };

  return (
    <ResizablePanel defaultSize={30}>
      <div className="h-full border-l">
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            <h3 className="font-semibold">Research Assistant</h3>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Enter a topic to research..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={handleResearch}
              disabled={contentResearch.isPending}
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4">
            {contentResearch.isPending && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin">
                      <Search className="h-4 w-4" />
                    </div>
                    <p>Researching...</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {results.map((result, index) => (
              <Card key={index}>
                <CardHeader className="p-4">
                  <div className="flex items-start gap-2">
                    {result.confidence === 'high' ? (
                      <CheckCircle className="h-4 w-4 text-green-500 mt-1" />
                    ) : result.confidence === 'medium' ? (
                      <AlertCircle className="h-4 w-4 text-yellow-500 mt-1" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500 mt-1" />
                    )}
                    <div>
                      <p className="font-medium">{result.fact}</p>
                      <p className="text-sm text-muted-foreground">
                        Confidence: {result.confidence}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  {result.context && (
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium">Context:</p>
                      <p>{result.context}</p>
                    </div>
                  )}
                  {result.source && (
                    <div className="flex items-center gap-1 text-sm text-blue-500 mt-2">
                      <ExternalLink className="h-3 w-3" />
                      <a href={result.source} target="_blank" rel="noopener noreferrer">
                        Source
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </ResizablePanel>
  );
}