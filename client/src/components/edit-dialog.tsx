import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PostComposer } from './post-composer';
import type { Post } from '../types';

interface EditDialogProps {
  post: Post;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditDialog({ post, open, onOpenChange }: EditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit Post</DialogTitle>
          <DialogDescription>
            Make changes to your post. {post.isDraft ? 'This is currently saved as a draft.' : ''}
          </DialogDescription>
        </DialogHeader>
        <PostComposer 
          initialPost={post} 
          onSuccess={() => onOpenChange(false)}
          preserveDraftState={true} // New prop to ensure draft state is preserved
        />
      </DialogContent>
    </Dialog>
  );
}