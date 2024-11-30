import { PostComposer } from '../components/post-composer';
import { DraftList } from '../components/draft-list';
import { ScheduledPosts } from '../components/scheduled-posts';
import { ContentStrategyDashboard } from '../components/content-strategy-dashboard';

import { Link } from "wouter";
import { BarChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
      
      <Tabs defaultValue="compose" className="space-y-8">
        <TabsList>
          <TabsTrigger value="compose">Compose & Schedule</TabsTrigger>
          <TabsTrigger value="strategy">Content Strategy</TabsTrigger>
        </TabsList>

        <TabsContent value="compose">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-8">
              <PostComposer />
              <DraftList />
            </div>
            <div>
              <ScheduledPosts />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="strategy">
          <ContentStrategyDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
