import GoalRunner from './components/GoalRunner';
import Timeline from './components/Timeline';
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarDrawerProvider } from "@/components/sidebar-drawer-context";
import { SidebarDrawer } from "@/components/sidebar-drawer";
import { AppStateProvider } from "@/context/app-state-context";
import { ImportModalProvider } from "@/context/import-modal-context";
import { ImportModal } from "@/components/import-modal";
import Home from "@/pages/home";
import Apps from "@/pages/apps";
import PublishedApps from "@/pages/published-apps";
import Integrations from "@/pages/integrations";
import Usage from "@/pages/usage";
import DeveloperFrameworks from "@/pages/developer-frameworks";
import ImportPage from "@/pages/import";
import GitHubImport from "@/pages/github-import";
import FigmaImport from "@/pages/figma-import";
import LovableImport from "@/pages/lovable-import";
import BoltImport from "@/pages/bolt-import";
import VercelImport from "@/pages/vercel-import";
import Base44Import from "@/pages/base44-import";
import CreateProject from "@/pages/create-project";
import Publishing from "@/pages/publishing";
import Console from "@/pages/console";
import Preview from "@/pages/preview";
import Workspace from "@/pages/workspace";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/apps" component={Apps} />
      <Route path="/published" component={PublishedApps} />
      <Route path="/integrations" component={Integrations} />
      <Route path="/usage" component={Usage} />
      <Route path="/frameworks" component={DeveloperFrameworks} />
      <Route path="/import" component={ImportPage} />
      <Route path="/import/github" component={GitHubImport} />
      <Route path="/import/figma" component={FigmaImport} />
      <Route path="/import/lovable" component={LovableImport} />
      <Route path="/import/bolt" component={BoltImport} />
      <Route path="/import/vercel" component={VercelImport} />
      <Route path="/import/base44" component={Base44Import} />
      <Route path="/create" component={CreateProject} />
      <Route path="/publishing" component={Publishing} />
      <Route path="/console" component={Console} />
      <Route path="/preview" component={Preview} />
      <Route path="/workspace" component={Workspace} />
      <Route path="/workspace/:id" component={Workspace} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppShell() {
  const [location] = useLocation();
  const isWorkspace = location === "/workspace" || location.startsWith("/workspace/") || location.startsWith("/workspace?");

  if (isWorkspace) {
    return (
      <div className="flex h-screen w-full overflow-hidden min-h-0">
        <Router />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden min-h-0">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 min-h-0">
        <GoalRunner />
        <Timeline />
        <Router />
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppStateProvider>
        <ImportModalProvider>
          <SidebarDrawerProvider>
            <TooltipProvider>
              <AppShell />
              <SidebarDrawer />
              <ImportModal />
              <Toaster />
            </TooltipProvider>
          </SidebarDrawerProvider>
        </ImportModalProvider>
      </AppStateProvider>
    </QueryClientProvider>
  );
}

export default App;
