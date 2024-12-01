import { PostComposer } from '../components/post-composer';
import { DraftList } from '../components/draft-list';
import { ScheduledPosts } from '../components/scheduled-posts';
import { ContentStrategyDashboard } from '../components/content-strategy-dashboard';
import { EngagementOpportunities } from '../components/engagement-opportunities';
import { Analytics } from '../pages/analytics';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function Dashboard() {
  return (
    <div className="container mx-auto py-8">
      <Tabs defaultValue="compose" className="space-y-8">
        <TabsList>
          <TabsTrigger value="compose">Compose & Schedule</TabsTrigger>
          <TabsTrigger value="strategy">Content Strategy</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="compose">
          <div className="space-y-8">
            <PostComposer />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <DraftList />
              <ScheduledPosts />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="strategy">
          <ContentStrategyDashboard />
        </TabsContent>

        <TabsContent value="engagement">
          <EngagementOpportunities />
        </TabsContent>

        <TabsContent value="analytics">
          <Analytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}
