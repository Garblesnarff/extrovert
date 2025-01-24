import { ContentStrategyDashboard } from "@/components/content-strategy-dashboard";

export function ContentStrategy() {
  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Content Strategy</h1>
        </div>
        <div className="grid gap-4">
          <ContentStrategyDashboard />
        </div>
      </div>
    </div>
  );
}
