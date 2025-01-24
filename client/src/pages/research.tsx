import { ResearchAssistantPanel } from '@/components/research-assistant-panel';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

export default function ResearchPage() {
  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col space-y-4">
        <h1 className="text-2xl font-bold">Research Assistant</h1>
        <div className="h-[calc(100vh-8rem)]">
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={70} minSize={30}>
              <ResearchAssistantPanel />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={30} minSize={20}>
              <div className="h-full p-6">
                <h3 className="text-lg font-semibold mb-4">Research History</h3>
                <div className="text-sm text-muted-foreground">
                  Your research history will appear here
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </div>
  );
}