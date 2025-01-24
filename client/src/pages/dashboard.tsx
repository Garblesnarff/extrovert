import { PostComposer } from '../components/post-composer';
import { DraftList } from '../components/draft-list';
import { ScheduledPosts } from '../components/scheduled-posts';
//import { ContentStrategyDashboard } from '../components/content-strategy-dashboard';
//import { EngagementOpportunities } from '../components/engagement-opportunities';
//import { Analytics } from '../pages/analytics';

//import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function Dashboard() {
  return (
    <div className="container mx-auto py-8">
      <div className="space-y-8">
        <PostComposer />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <DraftList />
          <ScheduledPosts />
        </div>
      </div>
    </div>
  );
}