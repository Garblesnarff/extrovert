import { PostComposer } from '../components/post-composer';
import { DraftList } from '../components/draft-list';
import { ScheduledPosts } from '../components/scheduled-posts';

export function Dashboard() {
  return (
    <div className="container mx-auto py-8">
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
