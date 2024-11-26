import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useScheduledPosts } from '../lib/twitter';
import type { Post } from '../types';

export function ScheduledPosts() {
  const { data: scheduled, isLoading } = useScheduledPosts();

  if (isLoading) {
    return <div>Loading scheduled posts...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Scheduled Posts</h2>
      {scheduled?.map((post: Post) => (
        <Card key={post.id}>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Scheduled for: {new Date(post.scheduledFor!).toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{post.content}</p>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="sm">
                Edit
              </Button>
              <Button variant="destructive" size="sm">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
