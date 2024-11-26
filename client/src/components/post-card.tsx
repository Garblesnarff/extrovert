import { useState } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import type { Post } from '../types';

interface PostCardProps {
  post: Post;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function PostCard({ post, onEdit, onDelete }: PostCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger asChild>
        <Card 
          className="transition-shadow duration-200 hover:shadow-md"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              {post.scheduledFor ? (
                <>
                  <Calendar className="h-4 w-4" />
                  {new Date(post.scheduledFor).toLocaleString()}
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4" />
                  {new Date(post.createdAt).toLocaleDateString()}
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{post.content}</p>
            <div className="mt-4 flex gap-2">
              {onEdit && (
                <Button variant="outline" size="sm" onClick={onEdit}>
                  Edit
                </Button>
              )}
              {onDelete && (
                <Button variant="destructive" size="sm" onClick={onDelete}>
                  {post.scheduledFor ? 'Cancel' : 'Delete'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Created: {new Date(post.createdAt).toLocaleString()}
          </p>
          <p className="text-sm text-muted-foreground">
            Last modified: {new Date(post.updatedAt).toLocaleString()}
          </p>
          {post.scheduledFor && (
            <p className="text-sm font-semibold">
              Scheduled for: {new Date(post.scheduledFor).toLocaleString()}
            </p>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
