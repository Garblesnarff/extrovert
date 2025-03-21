import { useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { PostCard } from './post-card';
import { EditDialog } from './edit-dialog';
import { useScheduledPosts, useDeletePost } from '../lib/twitter';
import { Skeleton } from '@/components/ui/skeleton';
import type { Post } from '../types';

export function ScheduledPosts() {
  const { data: scheduled, isLoading } = useScheduledPosts();
  const deletePost = useDeletePost();
  const [editingPost, setEditingPost] = useState<Post | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Scheduled Posts</h2>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[200px] w-full" />
        ))}
      </div>
    );
  }

  return (
    <Accordion type="single" collapsible defaultValue="scheduled">
      <AccordionItem value="scheduled">
        <AccordionTrigger>
          <h2 className="text-2xl font-bold">
            Scheduled Posts ({scheduled?.length ?? 0})
          </h2>
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 pt-4">
            {scheduled?.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onEdit={() => setEditingPost(post)}
                onDelete={() => deletePost.mutate(post.id)}
              />
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
      {editingPost && (
        <EditDialog
          post={editingPost}
          open={true}
          onOpenChange={(open) => {
            if (!open) setEditingPost(null);
          }}
        />
      )}
    </Accordion>
  );
}
