import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { PostCard } from './post-card';
import { useDrafts, useDeletePost, useUpdatePost } from '../lib/twitter';
import { Skeleton } from '@/components/ui/skeleton';

export function DraftList() {
  const { data: drafts, isLoading } = useDrafts();
  const deletePost = useDeletePost();
  const updatePost = useUpdatePost();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Drafts</h2>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[200px] w-full" />
        ))}
      </div>
    );
  }

  return (
    <Accordion type="single" collapsible defaultValue="drafts">
      <AccordionItem value="drafts">
        <AccordionTrigger>
          <h2 className="text-2xl font-bold">Drafts ({drafts?.length ?? 0})</h2>
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 pt-4">
            {drafts?.map((draft) => (
              <PostCard
                key={draft.id}
                post={draft}
                onEdit={() => {/* TODO: Implement edit dialog */}}
                onDelete={() => deletePost.mutate(draft.id)}
              />
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
