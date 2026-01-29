import { Link } from "react-router";
import type { Route } from "./+types/landing";
import { authClient } from "~/authClient";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, BookOpen } from "lucide-react";
import { cn } from "@agentview/studio/lib/utils";

export async function clientLoader({ request }: Route.LoaderArgs) {
  const session = await authClient.getSession();
  return { isAuthenticated: !!session.data };
}

type ButtonVariant = "primary" | "accent" | "outline";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: LucideIcon;
  iconPosition?: "left" | "right";
  asChild?: boolean;
  children: React.ReactNode;
}

function HeroButton({
  variant = "primary",
  icon: Icon,
  iconPosition = "left",
  className,
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2";

  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-neutral-900 text-white hover:bg-neutral-900/90 rounded-full h-10 px-5 text-sm focus:ring-neutral-900",
    accent:
      "bg-[#C95B37] text-white hover:bg-[#B34E2D] rounded-full h-10 px-5 text-sm focus:ring-[#C95B37]",
    outline:
      "bg-white text-foreground border border-foreground/20 hover:bg-foreground/5 rounded-full h-10 px-5 text-sm focus:ring-foreground/30",
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], className)}
      {...props}
    >
      {Icon && iconPosition === "left" && <Icon className="size-4" />}
      {children}
      {Icon && iconPosition === "right" && <Icon className="size-4" />}
    </button>
  );
}

export default function LandingPage({ loaderData }: Route.ComponentProps) {
  const { isAuthenticated } = loaderData;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="py-4">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src="/logo_light.svg" alt="AgentView" className="h-7" />
          </Link>

          <nav>
            {isAuthenticated ? (
              <Link to="/dashboard">
                <HeroButton variant="primary">Dashboard</HeroButton>
              </Link>
            ) : (
              <Link to="/signup">
                <HeroButton variant="primary">Sign up</HeroButton>
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="max-w-7xl mx-auto px-6 pt-32 pb-16">
          <h1 className="text-5xl md:text-6xl lg:text-6xl font-semibold tracking-tight">
            The "CMS" for agents
          </h1>
          <p className="mt-6 text-xl opacity-66 max-w-lg">
            Backend + Studio for teams building conversational AI.
            <br />
            Without touching your AI code.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <Link to="/signup">
              <HeroButton variant="accent" icon={ArrowRight} iconPosition="right">
                Start building
              </HeroButton>
            </Link>
            <Link to={import.meta.env.VITE_AGENTVIEW_DOCS_URL} target="_blank">
              <HeroButton variant="outline" icon={BookOpen}>
                Read the docs
              </HeroButton>
            </Link>
          </div>
        </section>

        {/* Product Screenshot */}
        <section className="max-w-7xl mx-auto px-6 pb-16">
          <div className="bg-neutral-900 rounded-2xl p-4 md:px-32 py-12 shadow-2xl">
            <img
              src="/main.png"
              alt="AgentView Studio"
              className="w-full rounded-lg"
            />
          </div>
        </section>
      </main>
    </div>
  );
}
