import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Calendar, Wand2, Twitter } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
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
import { useAIAssistant, useAvailableProviders } from '../lib/crewai';
import type { PostFormData, Post } from '../types';

interface PostComposerProps {
  initial_post?: Post;
  on_success?: () => void;
}

export function PostComposer({ initial_post: initialPost, on_success: onSuccess }: PostComposerProps) {
  const [showSchedule, setShowSchedule] = useState(false);
  const [showError, setShowError] = useState(false);
  const [suggestedTime, setSuggestedTime] = useState<string>();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { toast } = useToast();
  const createPost = useCreatePost();
  const updatePost = useUpdatePost();
  const aiAssistant = useAIAssistant();
  const { data: providers } = useAvailableProviders();
  const [selectedProvider, setSelectedProvider] = useState<string>();
  const [selectedModel, setSelectedModel] = useState<string>();
  const [post_to_twitter, set_post_to_twitter] = useState(false);
  
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
      scheduled_for: undefined,
      scheduled_time: undefined,
      is_draft: false,
      recurring_pattern: null,
      recurring_end_date: undefined,
      post_to_twitter: false,
    },
  });

  useEffect(() => {
    if (initialPost && editor) {
      editor.commands.setContent(initialPost.content);
      form.reset({
        content: initialPost.content,
        scheduled_for: initialPost.scheduled_for ? new Date(initialPost.scheduled_for) : undefined,
        scheduled_time: initialPost.scheduled_for ? 
          new Date(initialPost.scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) 
          : undefined,
        is_draft: initialPost.is_draft,
        recurring_pattern: null,
        recurring_end_date: undefined,
        post_to_twitter: false,
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

      const result = await aiAssistant.mutateAsync({ 
        prompt: content,
        provider: selectedProvider,
        model: selectedModel
      });
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
      const scheduled_date = data.scheduled_for && data.scheduled_time
        ? new Date(
            new Date(data.scheduled_for).toISOString().split('T')[0] + 'T' + data.scheduled_time
          )
        : undefined;

      if (initialPost) {
        await updatePost.mutateAsync({ 
          id: initialPost.id, 
          ...data,
          scheduled_for: scheduled_date,
        });
      } else {
        await createPost.mutateAsync({
          ...data,
          scheduled_for: scheduled_date,
          post_to_twitter: post_to_twitter && !data.is_draft && !scheduled_date,
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
            <div className="flex items-center gap-2">
              <Switch
                checked={post_to_twitter}
                onCheckedChange={set_post_to_twitter}
                id="post-to-twitter"
              />
              <label
                htmlFor="post-to-twitter"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1"
              >
                <Twitter className="h-4 w-4" />
                Post to Twitter
              </label>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    {providers && providers.length > 0 && (
                      <Select
                        value={selectedProvider}
                        onValueChange={(value) => {
                          setSelectedProvider(value);
                          setSelectedModel(undefined);
                        }}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue placeholder="Provider" />
                        </SelectTrigger>
                        <SelectContent>
                          {providers
                            .filter(provider => provider.isAvailable)
                            .map(provider => (
                              <SelectItem key={provider.name} value={provider.name}>
                                {provider.name.charAt(0).toUpperCase() + provider.name.slice(1)}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    )}
                    {selectedProvider && providers && (
                      <Select
                        value={selectedModel}
                        onValueChange={setSelectedModel}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                        <SelectContent>
                          {providers
                            .find(p => p.name === selectedProvider)
                            ?.models.map(model => (
                              <SelectItem key={model.name} value={model.name}>
                                {model.displayName}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    )}
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
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Let AI help improve your post</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Popover open={showSchedule} onOpenChange={setShowSchedule}>
              <PopoverTrigger asChild>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    type="button"
                    className={form.getValues('scheduled_for') && form.getValues('scheduled_time') ? 'bg-primary/10' : ''}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {form.watch('scheduled_for') && form.watch('scheduled_time')
                      ? `Scheduled for ${form.watch('scheduled_for')?.toLocaleDateString()} ${form.watch('scheduled_time')}`
                      : 'Schedule'
                    }
                  </Button>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setAnalyzing(true);
                            try {
                              const response = await fetch('/api/posts/suggest-time', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  content: form.getValues('content'),
                                }),
                              });
                              const data = await response.json();
                              if (data.suggestedTime) {
                                setSuggestedTime(data.suggestedTime);
                                setShowSuggestions(true);
                                toast({
                                  title: "AI Suggestion",
                                  description: `Recommended posting time: ${data.suggestedTime}`,
                                });
                              }
                            } catch (error) {
                              toast({
                                title: "Error",
                                description: "Failed to get posting time suggestions",
                                variant: "destructive",
                              });
                            } finally {
                              setAnalyzing(false);
                            }
                          }}
                          disabled={analyzing}
                        >
                          <Wand2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Get AI-suggested posting time</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-4" align="start">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <CalendarComponent
                      mode="single"
                      selected={form.watch('scheduled_for')}
                      onSelect={(date: Date | undefined) => {
                        form.setValue('scheduled_for', date);
                      }}
                      disabled={(date) => date < new Date()}
                      className="rounded-md border"
                      initialFocus
                    />
                    <TimeSelect
                      value={form.getValues('scheduled_time')}
                      onChange={(time) => {
                        form.setValue('scheduled_time', time);
                      }}
                    />
                    <Select
                      value={form.getValues('recurring_pattern') || ''}
                      onValueChange={(value) => {
                        form.setValue('recurring_pattern', value === 'none' ? null : value as 'daily' | 'weekly' | 'monthly');
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Repeat..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No repeat</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.watch('recurring_pattern') && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">End Date</p>
                        <CalendarComponent
                          mode="single"
                          selected={form.watch('recurring_end_date')}
                          onSelect={(date: Date | undefined) => {
                            form.setValue('recurring_end_date', date);
                          }}
                          disabled={(date) => date < (form.watch('scheduled_for') || new Date())}
                          className="rounded-md border"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        form.setValue('scheduled_for', undefined);
                        form.setValue('scheduled_time', undefined);
                        form.setValue('recurring_pattern', null);
                        form.setValue('recurring_end_date', undefined);
                        setShowSchedule(false);
                      }}
                    >
                      Clear
                    </Button>
                    <Button
                      onClick={() => {
                        if (!form.getValues('scheduled_for') || !form.getValues('scheduled_time')) {
                          setErrorMessage('Please select both date and time for scheduling');
                          setShowError(true);
                          return;
                        }
                        if (form.getValues('recurring_pattern') && !form.getValues('recurring_end_date')) {
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
                form.setValue('is_draft', true);
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
                const scheduled_for = form.getValues('scheduled_for');
                const scheduled_time = form.getValues('scheduled_time');
                if ((scheduled_for && !scheduled_time) || (!scheduled_for && scheduled_time)) {
                  setErrorMessage('Please select both date and time for scheduling');
                  setShowError(true);
                  return;
                }
                if (form.getValues('recurring_pattern') && !form.getValues('recurring_end_date')) {
                  setErrorMessage('Please select an end date for recurring posts');
                  setShowError(true);
                  return;
                }
                form.setValue('is_draft', false);
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
