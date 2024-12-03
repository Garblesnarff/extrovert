import { useState } from 'react';
import { Search, BookOpen, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useContentResearch } from '@/lib/crewai';
import { ResizablePanel } from '@/components/ui/resizable';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

  const handleResearch = async () => {
    if (!query.trim()) {
      toast({
        title: "Empty Query",
        description: "Please enter a topic to research.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/ai/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: query,
        }),
      });

      if (!response.ok) {
        throw new Error('Research request failed');
      }

      const data = await response.json();
      if (!data.insights && !data.suggestedContent) {
        throw new Error('No research results available');
      }

      const contentToProcess = data.suggestedContent || data.insights;
      const parsedResults = parseResearchResponse(contentToProcess);
      
      if (parsedResults.length === 0) {
        // If no structured results, create a single result from raw insights
        setResults([{
          fact: 'Research Results',
          confidence: 'high',
          context: contentToProcess
        }]);
      } else {
        setResults(parsedResults);
      }
      toast({
        title: "Research Complete",
        description: `Found ${parsedResults.length} relevant facts`,
      });
    } catch (error) {
      console.error('Research failed:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred';
      
      setResults([{
        fact: 'Research query failed',
        confidence: 'low',
        context: `Error details: ${errorMessage}. Please try again or contact support if the issue persists.`,
      }]);
      
      toast({
        title: "Research Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const parseResearchResponse = (content: string): ResearchResult[] => {
    try {
      // Split content into sections, handling both structured and unstructured responses
      const sections = content.split(/(?:\r?\n){2,}/)
        .filter(section => section.trim())
        .map(section => section.trim());

      if (sections.length === 0) {
        return [{
          fact: 'No research results available',
          confidence: 'low',
          context: 'The AI service did not return any usable results'
        }];
      }

      return sections.map(section => {
        const lines = section.split('\n').map(line => line.trim());
        
        // Extract fact - first non-empty line that's not a label
        const fact = lines.find(line => 
          line.trim().length > 0 && 
          !line.toLowerCase().startsWith('source:') &&
          !line.toLowerCase().startsWith('context:') &&
          !line.toLowerCase().startsWith('confidence:')
        )?.replace(/^(?:\d+\.|\*|\-)\s*/, '').trim() || 'No fact found';

        // Extract source, context, and confidence from labeled lines
        const source = lines.find(line => 
          line.toLowerCase().includes('source:') || 
          line.toLowerCase().includes('reference:')
        )?.replace(/^(?:source:|reference:)/i, '').trim();

        const context = lines.find(line => 
          line.toLowerCase().includes('context:')
        )?.replace(/^context:/i, '').trim();

        let confidence: 'high' | 'medium' | 'low' = 'medium';
        
        // Determine confidence level
        const confidenceLine = lines.find(line => 
          line.toLowerCase().includes('confidence:')
        )?.toLowerCase() || '';

        if (confidenceLine.includes('high') || 
            section.toLowerCase().includes('verified') || 
            section.toLowerCase().includes('confirmed')) {
          confidence = 'high';
        } else if (confidenceLine.includes('low') || 
                   section.toLowerCase().includes('uncertain') || 
                   section.toLowerCase().includes('unverified')) {
          confidence = 'low';
        }

        return {
          fact,
          source,
          confidence,
          context: context || extractContext(fact)
        };
      });
    } catch (error) {
      console.error('Failed to parse research response:', error);
      return [{
        fact: 'Failed to parse research results',
        confidence: 'low',
        context: 'There was an error processing the AI response'
      }];
    }
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
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !contentResearch.isPending) {
                  handleResearch();
                }
              }}
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
