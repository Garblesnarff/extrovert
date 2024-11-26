import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDrafts } from '../lib/twitter';
import type { Post } from '../types';

export function DraftList() {
  const { data: drafts, isLoading } = useDrafts();

  if (isLoading) {
    return <div>Loading drafts...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Drafts</h2>
      {drafts?.map((draft: Post) => (
        <Card key={draft.id}>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              {new Date(draft.createdAt).toLocaleDateString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{draft.content}</p>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="sm">
                Edit
              </Button>
              <Button variant="destructive" size="sm">
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
