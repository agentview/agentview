import { useRouteLoaderData } from "react-router";
import { Header, HeaderTitle } from "@agentview/studio/components/header";
import { Button } from "@agentview/studio/components/ui/button";
import { BookOpen, ExternalLink } from "lucide-react";
import type { clientLoader as orgLayoutLoader } from "./layout";

export default function OrgHome() {
  const layoutData = useRouteLoaderData<typeof orgLayoutLoader>("routes/app/org/layout");
  const me = layoutData?.me;

  const welcomeTitle = me?.name ? `Welcome, ${me.name.split(' ')[0]}` : 'Welcome';

  return (
    <div>
      <Header>
        <HeaderTitle title={welcomeTitle} />
      </Header>

      <div className="p-6 max-w-2xl">
        <div className="space-y-4">
          <p className="text-muted-foreground">
            This is your <span className="text-foreground font-medium">Admin Panel</span> for
            managing organization settings, team members, and API keys.
          </p>

          <p className="text-muted-foreground">
            The actual work with your agents happens in <span className="text-foreground font-medium">Studio</span> —
            a self-hosted app you run alongside your agent code. Studio connects to AgentView
            using an API key you create here.
          </p>

          <div className="pt-2">
            <Button variant="outline" asChild>
              <a
                href={import.meta.env.VITE_AGENTVIEW_DOCS_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <BookOpen className="h-4 w-4" />
                Read the docs
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
