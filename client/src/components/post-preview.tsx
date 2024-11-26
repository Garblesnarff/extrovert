import { Card, CardContent } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';

interface PostPreviewProps {
  content: string;
}

export function PostPreview({ content }: PostPreviewProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex gap-4">
          <Avatar />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold">You</span>
              <span className="text-muted-foreground">@you</span>
            </div>
            <p className="mt-2">{content}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
