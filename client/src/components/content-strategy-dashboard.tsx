import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, TrendingUp, Hash, Calendar } from 'lucide-react';

interface Topic {
  name: string;
  score: number;
  description: string;
}

interface ThemeSuggestion {
  theme: string;
  topics: string[];
  description: string;
}

export function ContentStrategyDashboard() {
  const [loading, setLoading] = useState(false);
  const [trendingTopics, setTrendingTopics] = useState<Topic[]>([]);
  const [themeSuggestions, setThemeSuggestions] = useState<ThemeSuggestion[]>([]);

  const fetchTrendingInsights = async () => {
    setLoading(true);
    try {
      // Fetch trending topics from Google Trends
      const trendsResponse = await fetch('/api/trends');
      if (!trendsResponse.ok) {
        throw new Error('Failed to fetch trending topics');
      }
      const trendsData = await trendsResponse.json();
      console.log('Trends data received:', trendsData);
      setTrendingTopics(trendsData);

      // Fetch content themes and suggestions
      const themesResponse = await fetch('/api/ai/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `Analyze these trending topics and suggest content themes: ${trendsData.map((t: Topic) => t.name).join(', ')}`,
          provider: 'gemini',
        }),
      });
      if (!themesResponse.ok) {
        throw new Error('Failed to fetch theme suggestions');
      }
      
      const themesData = await themesResponse.json();
      
      // Handle the response data safely
      let suggestions: ThemeSuggestion[] = [];
      try {
        const insights = themesData.insights || '';
        suggestions = insights.split('\n')
          .filter((line: string) => line.trim())
          .map((theme: string) => ({
            theme: theme.split(':')[0]?.trim() || theme,
            topics: trendsData.slice(0, 3).map((t: Topic) => t.name),
            description: theme.split(':')[1]?.trim() || 'Emerging trend based on current search patterns',
          }));
      } catch (error) {
        console.warn('Error parsing theme suggestions:', error);
        suggestions = [{
          theme: 'Content Strategy',
          topics: trendsData.slice(0, 3).map((t: Topic) => t.name),
          description: 'Analyzing current trending topics'
        }];
      }

      setThemeSuggestions(suggestions);
    } catch (error) {
      console.error('Failed to fetch insights:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Content Strategy</h2>
        <Button
          variant="outline"
          onClick={fetchTrendingInsights}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <TrendingUp className="mr-2 h-4 w-4" />
          )}
          Refresh Insights
        </Button>
      </div>

      <Tabs defaultValue="topics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="topics">Trending Topics</TabsTrigger>
          <TabsTrigger value="themes">Theme Suggestions</TabsTrigger>
        </TabsList>

        <TabsContent value="topics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {trendingTopics.map((topic, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    <Hash className="mr-2 h-4 w-4 inline" />
                    {topic.name}
                  </CardTitle>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(topic.score)}% trending
                  </span>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {topic.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="themes" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {themeSuggestions.map((suggestion, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    <Calendar className="mr-2 h-5 w-5 inline" />
                    {suggestion.theme}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">
                    {suggestion.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {suggestion.topics.map((topic, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      >
                        #{topic}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
