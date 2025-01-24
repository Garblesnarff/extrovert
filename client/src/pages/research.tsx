import { ResearchAssistantPanel } from '@/components/research-assistant-panel';

export default function ResearchPage() {
  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col space-y-4">
        <h1 className="text-2xl font-bold">Research Assistant</h1>
        <div className="h-[calc(100vh-8rem)]">
          <ResearchAssistantPanel />
        </div>
      </div>
    </div>
  );
}
