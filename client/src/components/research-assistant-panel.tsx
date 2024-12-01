import { useState } from 'react';
import { Search, BookOpen, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useContentResearch } from '@/lib/crewai';
import { ResizablePanel } from '@/components/ui/resizable';
import { useToast } from '@/hooks/use-toast';

interface ResearchFact {
  fact: string;
  source?: string;
  confidence: 'high' | 'medium' | 'low';
  context?: string;
}

export function ResearchAssistantPanel() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ResearchFact[]>([]);
  const contentResearch = useContentResearch();
  const { toast } = useToast();

  const handleResearch = async () => {
    try {
      setResults([]);
      
      if (!query.trim()) {
        toast({
          title: "Empty Query",
          description: "Please enter a topic to research.",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch('/api/ai/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: query }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Research service error');
      }

      if (!data.facts || data.facts.length === 0) {
        toast({
          title: "No Results",
          description: "No research results available for this query. Try being more specific.",
          variant: "destructive",
        });
        return;
      }

      const processedResults: ResearchFact[] = data.facts.map((fact: any) => ({
        fact: fact.statement || fact.fact,
        source: fact.source,
        confidence: getConfidenceLevel(fact.confidence || data.confidence),
        context: fact.context || data.context
      }));

      setResults(processedResults);
      
      if (processedResults.length > 0) {
        toast({
          title: "Research Complete",
          description: `Found ${processedResults.length} verified facts`,
        });
      }
    } catch (error) {
      console.error('Research failed:', error);
      toast({
        title: "Research Failed",
        description: error instanceof Error ? error.message : "Unable to complete research. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getConfidenceLevel = (score: number): 'high' | 'medium' | 'low' => {
    if (score >= 0.8) return 'high';
    if (score >= 0.5) return 'medium';
    return 'low';
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
                <CardContent className="p-4">
                  <div className="flex items-start gap-2">
                    {result.confidence === 'high' ? (
                      <CheckCircle className="h-4 w-4 text-green-500 mt-1" />
                    ) : result.confidence === 'medium' ? (
                      <AlertCircle className="h-4 w-4 text-yellow-500 mt-1" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500 mt-1" />
                    )}
                    <div className="space-y-2">
                      <p className="font-medium">{result.fact}</p>
                      {result.context && (
                        <p className="text-sm text-muted-foreground">{result.context}</p>
                      )}
                      {result.source && (
                        <div className="flex items-center gap-1 text-sm text-blue-500">
                          <ExternalLink className="h-3 w-3" />
                          <a href={result.source} target="_blank" rel="noopener noreferrer">
                            Source
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </ResizablePanel>
  );
}