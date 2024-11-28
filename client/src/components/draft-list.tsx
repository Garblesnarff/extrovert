import { useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { PostCard } from './post-card';
import { EditDialog } from './edit-dialog';
import { useDrafts, useDeletePost, useUpdatePost } from '../lib/twitter';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Wand2, Calendar, Trash2, Edit2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import type { Post } from '../types';

export function DraftList() {
  const { data: drafts, isLoading } = useDrafts();
  const deletePost = useDeletePost();
  const updatePost = useUpdatePost();
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [selectedDraft, setSelectedDraft] = useState<Post | null>(null);

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
      const enhancedDraft = {
        ...draft,
        content: data.enhanced.suggestedContent,
      };
      
      // Update the draft with enhanced content
      await updatePost.mutateAsync({
        id: draft.id,
        content: data.enhanced.suggestedContent,
        isDraft: true,
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Drafts ({drafts?.length ?? 0})</h2>
      </div>
      <div className="space-y-4">
        {drafts?.map((draft) => (
          <div key={draft.id} className="relative bg-card rounded-lg border p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="text-sm text-muted-foreground">
                  {new Date(draft.createdAt).toLocaleDateString()}
                </div>
                <div className="whitespace-pre-wrap">{draft.content}</div>
              </div>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Wand2 className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuGroup>
                      <DropdownMenuItem onClick={() => enhanceDraft(draft, 'engagement')}>
                        <span>Boost Engagement</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => enhanceDraft(draft, 'research')}>
                        <span>Add Context & Facts</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => enhanceDraft(draft, 'strategy')}>
                        <span>Optimize Strategy</span>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setEditingPost(draft)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => deletePost.mutate(draft.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setEditingPost(draft)}
              >
                <Calendar className="h-4 w-4" />
                Schedule
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  updatePost.mutate({
                    id: draft.id,
                    content: draft.content,
                    isDraft: false,
                  });
                }}
              >
                Post Now
              </Button>
            </div>
          </div>
        ))}
      </div>
      {editingPost && (
        <EditDialog
          post={editingPost}
          open={true}
          onOpenChange={(open) => {
            if (!open) setEditingPost(null);
          }}
        />
      )}
    </div>
  );
}
