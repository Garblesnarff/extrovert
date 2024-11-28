import { useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { PostCard } from './post-card';
import { EditDialog } from './edit-dialog';
import { useDrafts, useDeletePost } from '../lib/twitter';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Wand2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import type { Post } from '../types';

export function DraftList() {
  const { data: drafts, isLoading } = useDrafts();
  const deletePost = useDeletePost();
  const [editingPost, setEditingPost] = useState<Post | null>(null);

  const { toast } = useToast();

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
  const enhanceDraft = async (draft: Post, type: string) => {
    try {
      const response = await fetch('/api/drafts/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: draft.content,
          enhancementType: type,
          provider: 'gemini',
          model: 'gemini-pro'
        }),
      });
      
      if (!response.ok) throw new Error('Enhancement failed');
      
      const data = await response.json();
      setEditingPost({
        ...draft,
        content: data.enhanced.suggestedContent,
      });
      
      toast({
        title: "Draft Enhanced",
        description: "AI suggestions have been applied to your draft.",
      });
    } catch (error) {
      toast({
        title: "Enhancement Failed",
        description: "Could not enhance the draft. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Accordion type="single" collapsible defaultValue="drafts">
      <AccordionItem value="drafts">
        <AccordionTrigger>
          <h2 className="text-2xl font-bold">Drafts ({drafts?.length ?? 0})</h2>
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 pt-4">
            {drafts?.map((draft) => (
              <div key={draft.id} className="relative">
                <PostCard
                  post={draft}
                  onEdit={() => setEditingPost(draft)}
                  onDelete={() => deletePost.mutate(draft.id)}
                />
                <div className="absolute top-2 right-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Wand2 className="h-4 w-4 mr-1" />
                        AI Assist
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuGroup>
                        <DropdownMenuItem onClick={() => enhanceDraft(draft, 'engagement')}>
                          Boost Engagement
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => enhanceDraft(draft, 'research')}>
                          Add Context & Facts
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => enhanceDraft(draft, 'optimize')}>
                          Optimize for Reach
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
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
