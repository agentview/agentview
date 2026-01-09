import { Link } from "react-router";
import type { Route } from "./+types/landing";
import { Button } from "@agentview/studio/components/ui/button";
import { authClient } from "~/authClient";

export async function clientLoader({ request }: Route.LoaderArgs) {
  const session = await authClient.getSession();
  return { isAuthenticated: !!session.data };
}

export default function LandingPage({ loaderData }: Route.ComponentProps) {
  const { isAuthenticated } = loaderData;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src="/logo_dark.svg" alt="AgentView" className="h-8" />
          </Link>

          <nav className="flex items-center gap-6">
            <Link
              to={import.meta.env.VITE_AGENTVIEW_DOCS_URL}
              target="_blank"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Docs
            </Link>
            <a
              href="#contact"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Contact us
            </a>
            {isAuthenticated ? (
              <Button asChild>
                <Link to={"/dashboard"}>Dashboard</Link>
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" asChild>
                  <Link to={"/login"}>Log in</Link>
                </Button>
                <Button asChild>
                  <Link to={"/signup"}>Get Started</Link>
                </Button>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Build AI Agents with Confidence
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            AgentView helps you monitor, debug, and manage your AI agents in production.
            Get full visibility into agent sessions, track user interactions, and ship reliable AI experiences.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link to="/signup">Get Started</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to={import.meta.env.VITE_AGENTVIEW_DOCS_URL} target="_blank">Read the Docs</Link>
            </Button>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="border-t bg-muted/50">
          <div className="container mx-auto px-4 py-16 text-center">
            <h2 className="text-2xl font-semibold">Contact Us</h2>
            <p className="mt-4 text-muted-foreground">
              Have questions? We'd love to hear from you.
            </p>
            <a
              href="mailto:hello@agentview.com"
              className="mt-4 inline-block text-primary hover:underline"
            >
              hello@agentview.com
            </a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} AgentView. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
