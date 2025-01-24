import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Switch, Route, Link } from "wouter";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { CommandMenu } from "./components/command-menu";
import { Dashboard } from "./pages/dashboard";
import { Analytics } from "./pages/analytics";
import { ResearchPage } from "./pages/research";
import { ContentStrategy } from "./pages/content-strategy";
import { Engagement } from "./pages/engagement";

function Navigation() {
  return (
    <nav className="border-b">
      <div className="flex h-14 items-center px-4">
        <div className="flex gap-6 text-sm">
          <Link href="/">
            <span className="transition-colors hover:text-primary cursor-pointer">Compose & Schedule</span>
          </Link>
          <Link href="/content-strategy">
            <span className="transition-colors hover:text-primary cursor-pointer">Content Strategy</span>
          </Link>
          <Link href="/engagement">
            <span className="transition-colors hover:text-primary cursor-pointer">Engagement</span>
          </Link>
          <Link href="/analytics">
            <span className="transition-colors hover:text-primary cursor-pointer">Analytics</span>
          </Link>
          <Link href="/research">
            <span className="transition-colors hover:text-primary cursor-pointer">Research Assistant</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Router() {
  return (
    <>
      <Navigation />
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/content-strategy" component={ContentStrategy} />
        <Route path="/engagement" component={Engagement} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/research" component={ResearchPage} />
        <Route>404 Page Not Found</Route>
      </Switch>
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Router />
      <CommandMenu />
      <Toaster />
    </QueryClientProvider>
  </StrictMode>,
);