import { ResearchAssistantPanel } from "@/components/research-assistant-panel";

export function ResearchPage() {
  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Research Assistant</h1>
        </div>
        <div className="grid gap-4">
          <ResearchAssistantPanel />
        </div>
      </div>
    </div>
  );
}