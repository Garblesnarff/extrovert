import { useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { EditDialog } from './edit-dialog';
import { useDrafts, useDeletePost, useUpdatePost } from '../lib/twitter';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Wand2, Calendar, Trash2, Edit2, AlertCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Post } from '../types';

export function DraftList() {
  const { data: drafts, isLoading, error } = useDrafts();
  const deletePost = useDeletePost();
  const updatePost = useUpdatePost();
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const { toast } = useToast();

  // Enhanced loading state with skeleton UI
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-24 w-full" />
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load drafts. Please try again later.
        </AlertDescription>
      </Alert>
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

      // Explicitly preserve draft state during update
      await updatePost.mutateAsync({
        id: draft.id,
        content: data.enhanced.suggestedContent,
        isDraft: true, // Explicitly set isDraft to true
        scheduledFor: draft.scheduledFor // Preserve scheduling if any
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Drafts ({drafts?.length ?? 0})</h2>
      </div>

      <div className="space-y-4">
        {drafts?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No drafts yet. Create your first draft to get started.
          </div>
        ) : (
          drafts?.map((draft) => (
            <div key={draft.id} className="group relative bg-card rounded-lg border shadow-sm hover:shadow-md transition-all p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1 pr-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {new Date(draft.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                  <div className="whitespace-pre-wrap text-base">{draft.content}</div>
                </div>

                <div className="flex items-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Wand2 className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuGroup>
                        <DropdownMenuItem onClick={() => enhanceDraft(draft, 'engagement')}>
                          Boost Engagement
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => enhanceDraft(draft, 'research')}>
                          Add Context & Facts
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => enhanceDraft(draft, 'strategy')}>
                          Optimize Strategy
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
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive/90"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this draft?')) {
                        deletePost.mutate(draft.id);
                      }
                    }}
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
                      isDraft: false, // Only change isDraft when explicitly posting
                      scheduledFor: null
                    });
                  }}
                >
                  Post Now
                </Button>
              </div>
            </div>
          ))
        )}
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