import { PostComposer } from '../components/post-composer';
import { DraftList } from '../components/draft-list';
import { ScheduledPosts } from '../components/scheduled-posts';

import { Link } from "wouter";
import { BarChart } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Dashboard() {
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-end mb-8">
        <Button asChild variant="outline">
          <Link href="/analytics" className="flex items-center gap-2">
            <BarChart className="h-4 w-4" />
            Analytics
          </Link>
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-8">
          <PostComposer />
          <DraftList />
        </div>
        <div>
          <ScheduledPosts />
        </div>
      </div>
    </div>
  );
}
