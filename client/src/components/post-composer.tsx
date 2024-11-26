import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { useCreatePost } from '../lib/twitter';
import { useAIAssistant } from '../lib/crewai';
import type { PostFormData } from '../types';
import { insertPostSchema } from '@db/schema';

export function PostComposer() {
  const [showSchedule, setShowSchedule] = useState(false);
  const { toast } = useToast();
  const createPost = useCreatePost();
  const aiAssistant = useAIAssistant();

  const form = useForm<PostFormData>({
    resolver: zodResolver(insertPostSchema),
    defaultValues: {
      content: '',
    },
  });

  const onSubmit = async (data: PostFormData) => {
    try {
      await createPost.mutateAsync(data);
      toast({
        title: 'Success',
        description: 'Post created successfully',
      });
      form.reset();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create post',
        variant: 'destructive',
      });
    }
  };

  const handleAIAssist = async () => {
    const content = form.getValues('content');
    try {
      const suggestion = await aiAssistant.mutateAsync(content);
      form.setValue('content', suggestion.suggestedContent);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to get AI assistance',
        variant: 'destructive',
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea
                  placeholder="What's happening?"
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleAIAssist}
              disabled={aiAssistant.isPending}
            >
              AI Assist
            </Button>
            <Popover open={showSchedule} onOpenChange={setShowSchedule}>
              <PopoverTrigger asChild>
                <Button variant="outline" type="button">
                  <Calendar className="mr-2 h-4 w-4" />
                  Schedule
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={form.getValues('scheduledFor')}
                  onSelect={(date) => {
                    form.setValue('scheduledFor', date);
                    setShowSchedule(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
          <Button type="submit" disabled={createPost.isPending}>
            {createPost.isPending ? 'Posting...' : 'Post'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
