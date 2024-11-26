import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Calendar, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { TimeSelect } from '@/components/ui/time-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { useCreatePost, useUpdatePost } from '../lib/twitter';
import { useAIAssistant } from '../lib/crewai';
import type { PostFormData, Post } from '../types';

interface PostComposerProps {
  initialPost?: Post;
  onSuccess?: () => void;
}

export function PostComposer({ initialPost, onSuccess }: PostComposerProps) {
  const [showSchedule, setShowSchedule] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { toast } = useToast();
  const createPost = useCreatePost();
  const updatePost = useUpdatePost();
  const aiAssistant = useAIAssistant();
  
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
      }),
    ],
    content: '',
    onUpdate: ({ editor }) => {
      form.setValue('content', editor.getText());
    },
  });

  const form = useForm<PostFormData>({
    defaultValues: {
      content: '',
      scheduledFor: undefined,
      scheduledTime: undefined,
      isDraft: false,
      recurringPattern: null,
      recurringEndDate: undefined,
    },
  });

  useEffect(() => {
    if (initialPost && editor) {
      editor.commands.setContent(initialPost.content);
      form.reset({
        content: initialPost.content,
        scheduledFor: initialPost.scheduledFor ? new Date(initialPost.scheduledFor) : undefined,
        scheduledTime: initialPost.scheduledFor ? 
          new Date(initialPost.scheduledFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) 
          : undefined,
        isDraft: initialPost.isDraft,
        recurringPattern: null,
        recurringEndDate: undefined,
      });
    }
  }, [initialPost, editor, form]);

  const handleAIAssist = async () => {
    try {
      const content = form.getValues('content');
      if (!content) {
        setErrorMessage('Please enter some content first');
        setShowError(true);
        return;
      }

      const result = await aiAssistant.mutateAsync(content);
      if (editor) {
        editor.commands.setContent(result.suggestedContent);
      }
      form.setValue('content', result.suggestedContent);

      toast({
        title: 'AI Suggestions Applied',
        description: result.analysis,
      });
    } catch (error) {
      setErrorMessage('Failed to get AI assistance');
      setShowError(true);
    }
  };

  const onSubmit = async (data: PostFormData) => {
    try {
      const scheduledDate = data.scheduledFor && data.scheduledTime
        ? new Date(
            new Date(data.scheduledFor).toISOString().split('T')[0] + 'T' + data.scheduledTime
          )
        : undefined;

      if (initialPost) {
        await updatePost.mutateAsync({ 
          id: initialPost.id, 
          ...data,
          scheduledFor: scheduledDate,
        });
      } else {
        await createPost.mutateAsync({
          ...data,
          scheduledFor: scheduledDate,
        });
      }
      form.reset();
      if (editor) {
        editor.commands.setContent('');
      }
      onSuccess?.();
      toast({
        title: 'Success',
        description: initialPost ? 'Post updated successfully' : 'Post created successfully',
      });
    } catch (error) {
      setErrorMessage(initialPost ? 'Failed to update post' : 'Failed to create post');
      setShowError(true);
    }
  };

  return (
    <Form {...form}>
      <AlertDialog open={showError} onOpenChange={setShowError}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Error</AlertDialogTitle>
            <AlertDialogDescription>{errorMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setShowError(false)}>
              Close
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className="border rounded-md p-4">
                  <EditorContent editor={editor} className="min-h-[100px] prose prose-sm max-w-none" />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-col gap-4 mt-4">
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAIAssist}
                    disabled={aiAssistant.isPending}
                    className="gap-2"
                  >
                    <Wand2 className="h-4 w-4" />
                    AI Assist
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Let AI help improve your post</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Popover open={showSchedule} onOpenChange={setShowSchedule}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  type="button"
                  className={form.getValues('scheduledFor') && form.getValues('scheduledTime') ? 'bg-primary/10' : ''}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {form.watch('scheduledFor') && form.watch('scheduledTime')
                    ? `Scheduled for ${form.watch('scheduledFor')?.toLocaleDateString()} ${form.watch('scheduledTime')}`
                    : 'Schedule'
                  }
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-4" align="start">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <CalendarComponent
                      mode="single"
                      selected={form.watch('scheduledFor')}
                      onSelect={(date: Date | undefined) => {
                        form.setValue('scheduledFor', date);
                      }}
                      disabled={(date) => date < new Date()}
                      className="rounded-md border"
                      initialFocus
                    />
                    <TimeSelect
                      value={form.getValues('scheduledTime')}
                      onChange={(time) => {
                        form.setValue('scheduledTime', time);
                      }}
                    />
                    <Select
                      value={form.getValues('recurringPattern') || ''}
                      onValueChange={(value) => {
                        form.setValue('recurringPattern', value === '' ? null : value as 'daily' | 'weekly' | 'monthly');
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Repeat..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No repeat</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.watch('recurringPattern') && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">End Date</p>
                        <CalendarComponent
                          mode="single"
                          selected={form.watch('recurringEndDate')}
                          onSelect={(date: Date | undefined) => {
                            form.setValue('recurringEndDate', date);
                          }}
                          disabled={(date) => date < (form.watch('scheduledFor') || new Date())}
                          className="rounded-md border"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        form.setValue('scheduledFor', undefined);
                        form.setValue('scheduledTime', undefined);
                        form.setValue('recurringPattern', null);
                        form.setValue('recurringEndDate', undefined);
                        setShowSchedule(false);
                      }}
                    >
                      Clear
                    </Button>
                    <Button
                      onClick={() => {
                        if (!form.getValues('scheduledFor') || !form.getValues('scheduledTime')) {
                          setErrorMessage('Please select both date and time for scheduling');
                          setShowError(true);
                          return;
                        }
                        if (form.getValues('recurringPattern') && !form.getValues('recurringEndDate')) {
                          setErrorMessage('Please select an end date for recurring posts');
                          setShowError(true);
                          return;
                        }
                        setShowSchedule(false);
                      }}
                    >
                      Done
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                form.setValue('isDraft', true);
                form.handleSubmit(onSubmit)();
              }}
              disabled={createPost.isPending || updatePost.isPending}
            >
              Save as Draft
            </Button>
            <Button
              type="submit"
              variant="default"
              onClick={() => {
                const scheduledFor = form.getValues('scheduledFor');
                const scheduledTime = form.getValues('scheduledTime');
                if ((scheduledFor && !scheduledTime) || (!scheduledFor && scheduledTime)) {
                  setErrorMessage('Please select both date and time for scheduling');
                  setShowError(true);
                  return;
                }
                if (form.getValues('recurringPattern') && !form.getValues('recurringEndDate')) {
                  setErrorMessage('Please select an end date for recurring posts');
                  setShowError(true);
                  return;
                }
                form.setValue('isDraft', false);
              }}
              disabled={createPost.isPending || updatePost.isPending}
            >
              {createPost.isPending || updatePost.isPending ? 'Saving...' : (initialPost ? 'Update' : 'Post')}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
