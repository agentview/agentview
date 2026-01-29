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

interface FeatureSectionProps {
  title: string;
  description: React.ReactNode;
  imagePosition?: "left" | "right";
  ctaText?: string;
  ctaHref?: string;
}

function FeatureSection({
  title,
  description,
  imagePosition = "right",
  ctaText = "Get Started",
  ctaHref = "/signup",
}: FeatureSectionProps) {
  return (
    <section className="max-w-7xl mx-auto px-4 md:px-6 my-12 md:my-16">
      <div className="">
        <div
          className={cn(
            "flex flex-col md:flex-row gap-8 md:gap-12 items-start",
            imagePosition === "left" && "md:flex-row-reverse"
          )}
        >
          {/* Content */}
          <div className="flex-1 space-y-2">
            <h2 className="text-2xl md:text-xl font-medium tracking-tight">
              {title}
            </h2>
            <p className="text-foreground/70">{description}</p>
            {/* <Link to={ctaHref}>
              <HeroButton variant="accent" className="mt-2">
                {ctaText}
              </HeroButton>
            </Link> */}
          </div>

          {/* Image placeholder */}
          <div className="flex-2 w-full">
            <div className="bg-neutral-900 rounded-lg aspect-[4/3] w-full" />
          </div>
        </div>
      </div>
    </section>
  );
}

export default function LandingPage({ loaderData }: Route.ComponentProps) {
  const { isAuthenticated } = loaderData;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="py-4">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src="/logo_light.svg" alt="AgentView" className="h-7" />
          </Link>

          <nav>
            {isAuthenticated ? (
              <Link to="/dashboard">
                <HeroButton variant="primary">Dashboard</HeroButton>
              </Link>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login">
                  <HeroButton variant="outline">Log in</HeroButton>
                </Link>
                <Link to="/signup">
                  <HeroButton variant="primary">Sign up</HeroButton>
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="max-w-7xl mx-auto px-4 md:px-6 pt-20 md:pt-32 pb-12 md:pb-16">
          <span className="inline-block mb-4 px-3 py-1 text-sm font-medium bg-[#C95B37]/10 text-[#C95B37] rounded-full">
            Beta Preview
          </span>
          <h1 className="text-2xl md:text-4xl lg:text-5xl font-medium tracking-tight max-w-3xl">
          AgentView is a framework-agnostic UI Studio and backend for teams who build conversational agents in code.
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
        <section className="max-w-7xl mx-auto px-4 md:px-6 pb-12 md:pb-16">
          <div className="bg-neutral-900 rounded-xl p-4 md:px-32 py-12 shadow-2xl">
            <img
              src="/main.png"
              alt="AgentView Studio"
              className="w-full rounded-lg"
            />
          </div>
        </section>

        {/* Feature Sections */}
        <FeatureSection
          title="Framework-agnostic backend"
          description="AgentView provides a simple SDK for persisting your sessions state. It stays out of your AI logic, so that you can use any framework you want or go vanilla."
          imagePosition="right"
        />

        <FeatureSection
          title="Extremely customizable Studio"
          description={<span>Studio is session browser and playground for your agent focused on non-technical users like stakeholders or domain experts.<br/><br/>It's an open-source and self-hosted React app, so that you can customize by simply providing custom components.</span>}
          imagePosition="right"
        />

        <FeatureSection
          title="Collaboration as a first-class citizen"
          description="It's like Google Docs for your agent data. Share, comment, score, mention, get notified with ease."
          imagePosition="right"
        />

        {/* Pricing / Open Source */}
        <section className="max-w-7xl mx-auto px-4 md:px-6 mt-20 md:mt-32 mb-12 md:mb-16">
          <div className="bg-white border border-foreground/20 rounded-xl p-6 md:p-12 text-center">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
              Open-source Studio, hosted backend
            </h2>
            <p className="mt-4 text-foreground/70 max-w-xl mx-auto">
              Studio is MIT licensed. You can fork it, customize it, make it yours.
            </p>
            <p className="mt-3 text-foreground/70 max-w-xl mx-auto">
              Backend is in <span className="font-semibold text-foreground">Beta Preview</span> — free to use with 500 sessions and 5 team members. No credit card required.
              Need more?{" "}
              <a
                href="mailto:hello@agentview.dev"
                className="text-[#C95B37] hover:underline"
              >
                Just reach out
              </a>
              .
            </p>
            <div className="mt-8">
              <Link to="/signup">
                <HeroButton variant="accent" icon={ArrowRight} iconPosition="right">
                  Start building
                </HeroButton>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="pb-4">
        <div className="max-w-7xl mx-auto px-4 md:px-6 text-base md:text-xl text-foreground/60 text-center">
          <p>
            Questions or feedback? Reach the founder on{" "}
            <a
              href="https://x.com/ardabrowski"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground/80 hover:text-foreground underline"
            >
              X
            </a>{" "}
            or{" "}
            <a
              href="mailto:hello@agentview.dev"
              className="text-foreground/80 hover:text-foreground underline"
            >
              email
            </a>
            .
          </p>
          <p className="mt-16 md:mt-32 text-sm text-foreground/40">
            © {new Date().getFullYear()} AgentView
          </p>
        </div>
      </footer>
    </div>
  );
}
