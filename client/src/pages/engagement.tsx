import { EngagementOpportunities } from "@/components/engagement-opportunities";

export function Engagement() {
  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Engagement</h1>
        </div>
        <div className="grid gap-4">
          <EngagementOpportunities />
        </div>
      </div>
    </div>
  );
}
