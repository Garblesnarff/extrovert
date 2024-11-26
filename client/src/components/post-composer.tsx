import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Calendar, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { TimeSelect } from '@/components/ui/time-select';
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
  AlertDialogAction,
  AlertDialogCancel,
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
import { useCreatePost } from '../lib/twitter';
import { useAIAssistant } from '../lib/crewai';
import { insertPostSchema } from '@db/schema';
import type { PostFormData } from '../types';

export function PostComposer() {
  const [showSchedule, setShowSchedule] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { toast } = useToast();
  const createPost = useCreatePost();
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
    resolver: zodResolver(insertPostSchema),
    defaultValues: {
      content: '',
      scheduledFor: undefined,
      scheduledTime: undefined,
      isDraft: false,
    },
  });

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
      await createPost.mutateAsync(data);
      form.reset();
      if (editor) {
        editor.commands.setContent('');
      }
      toast({
        title: 'Success',
        description: 'Post created successfully',
      });
    } catch (error) {
      setErrorMessage('Failed to create post');
      setShowError(true);
    }
  };

  const formatScheduleDate = (date: Date | undefined, time: string | undefined): string => {
    if (!date) return 'Schedule';
    const dateStr = date.toLocaleDateString();
    return time ? `Scheduled for ${dateStr} ${time}` : dateStr;
  };

  return (
    <Form {...form}>
      <AlertDialog open={showError} onOpenChange={setShowError}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Error Occurred</AlertDialogTitle>
            <AlertDialogDescription>{errorMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="secondary">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button onClick={() => setShowError(false)}>Close</Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className="rounded-lg border border-input bg-background p-4">
                  <EditorContent editor={editor} className="min-h-[100px] prose prose-sm max-w-none" />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <div className="flex items-center gap-4">
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
                  className={`gap-2 ${form.getValues('scheduledFor') && form.getValues('scheduledTime') ? 'bg-primary/10' : ''}`}
                >
                  <Calendar className="h-4 w-4" />
                  {formatScheduleDate(form.getValues('scheduledFor'), form.getValues('scheduledTime'))}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-4" align="start">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <CalendarComponent
                      mode="single"
                      selected={form.getValues('scheduledFor')}
                      onSelect={(date) => {
                        form.setValue('scheduledFor', date);
                      }}
                      disabled={(date) => date < new Date()}
                      className="rounded-md border shadow"
                      classNames={{
                        day_selected: "bg-primary text-primary-foreground hover:bg-primary/90",
                        day_today: "bg-accent text-accent-foreground",
                      }}
                      initialFocus
                    />
                    <TimeSelect
                      value={form.getValues('scheduledTime')}
                      onChange={(time) => {
                        form.setValue('scheduledTime', time);
                      }}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        form.setValue('scheduledFor', undefined);
                        form.setValue('scheduledTime', undefined);
                        setShowSchedule(false);
                      }}
                    >
                      Clear
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        if (!form.getValues('scheduledFor') || !form.getValues('scheduledTime')) {
                          setErrorMessage('Please select both date and time for scheduling');
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

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                form.setValue('isDraft', true);
                form.handleSubmit(onSubmit)();
              }}
              disabled={createPost.isPending}
              className="min-w-[120px]"
            >
              Save as Draft
            </Button>
            <Button
              type="submit"
              variant="default"
              onClick={() => {
                const scheduledFor = form.getValues('scheduledFor');
                const scheduledTime = form.getValues('scheduledTime');
                if (scheduledFor && !scheduledTime || !scheduledFor && scheduledTime) {
                  setErrorMessage('Please select both date and time for scheduling');
                  setShowError(true);
                  return;
                }
                form.setValue('isDraft', false);
              }}
              disabled={createPost.isPending}
              className="min-w-[120px]"
            >
              {createPost.isPending ? 'Posting...' : 'Post'}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
