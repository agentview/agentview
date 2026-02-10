import { useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/landing";
import { authClient } from "~/authClient";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, BookOpen, Menu, X } from "lucide-react";
import { cn } from "@agentview/studio/lib/utils";
import { CodeBlock } from "~/components/CodeBlock";

const EMAIL = "a.r.dabrowski@gmail.com";
const X_URL = "https://x.com/ardabrowski";
const GITHUB_URL = "https://github.com/agentview/agentview";


export async function clientLoader({ request }: Route.LoaderArgs) {
  const session = await authClient.getSession();
  return { isAuthenticated: !!session.data };
}

type ButtonVariant = "primary" | "accent" | "outline";

type ButtonSize = "default" | "sm";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconPosition?: "left" | "right";
  asChild?: boolean;
  children: React.ReactNode;
}

function HeroButton({
  variant = "primary",
  size = "default",
  icon: Icon,
  iconPosition = "left",
  className,
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-full";

  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-neutral-900 text-white hover:bg-neutral-900/90 focus:ring-neutral-900",
    accent:
      "bg-[#C95B37] text-white hover:bg-[#B34E2D] focus:ring-[#C95B37]",
    outline:
      "bg-white text-foreground border border-foreground/20 hover:bg-foreground/5 focus:ring-foreground/30",
  };

  const sizes: Record<ButtonSize, string> = {
    default: "h-10 px-5 text-sm",
    sm: "h-8 px-4 text-sm",
  };

  const iconSize = size === "sm" ? "size-3" : "size-4";

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {Icon && iconPosition === "left" && <Icon className={iconSize} />}
      {children}
      {Icon && iconPosition === "right" && <Icon className={iconSize} />}
    </button>
  );
}

interface FeatureSectionProps {
  title: string;
  description: React.ReactNode;
  imagePosition?: "left" | "right";
  ctaText?: string;
  ctaHref?: string;
  content?: React.ReactNode;
}

function FeatureSection({
  title,
  description,
  imagePosition = "right",
  ctaText = "Get Started",
  ctaHref = "/signup",
  content,
}: FeatureSectionProps) {
  return (
    <section className="max-w-7xl mx-auto px-4 md:px-6 my-12 md:my-16">
      <div className="">
        <div
          className={cn(
            "flex flex-col lg:flex-row gap-8 md:gap-12 items-start",
            imagePosition === "left" && "md:flex-row-reverse"
          )}
        >
          {/* Content */}
          <div className="flex-1 space-y-2">
            <h2 className="text-xl font-medium tracking-tight">
              {title}
            </h2>
            <p className="text-foreground/70 max-w-md">{description}</p>
            {/* <Link to={ctaHref}>
              <HeroButton variant="accent" className="mt-2">
                {ctaText}
              </HeroButton>
            </Link> */}
          </div>

          {/* Image */}
          <div className="flex-2 w-full">
            {content ? (
              <div className="bg-neutral-900 rounded-sm p-4 md:p-8 flex justify-center items-center">
                {content}
              </div>
            ) : (
              <div className="bg-neutral-900 rounded-sm aspect-[4/3] w-full" />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function LandingPage({ loaderData }: Route.ComponentProps) {
  const { isAuthenticated } = loaderData;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: "Docs", href: import.meta.env.VITE_AGENTVIEW_DOCS_URL, external: true },
    { label: "Pricing", href: "#pricing" },
    { label: "Contact", href: "#contact" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="py-4 relative z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between">
          <div className="flex items-center gap-12">
          <Link to="/" className="flex items-center">
            <img src="/logo_light.svg" alt="AgentView" className="h-7" />
          </Link>

          {/* Center nav links - hidden on mobile */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                {...(link.external && !link.href.startsWith("mailto:")
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className="text-sm text-foreground/70 hover:text-foreground transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          </div>

          {/* Right side - GitHub + auth buttons (hidden on mobile) */}
          <div className="hidden md:flex items-center gap-4">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-foreground/70 hover:text-foreground transition-colors"
            >
              <img src="/GitHub_Invertocat_Black.svg" alt="GitHub" className="size-5" />
              <span className="text-sm">GitHub</span>
            </a>
            {isAuthenticated ? (
              <Link to="/dashboard">
                <HeroButton variant="primary" size="sm">Dashboard</HeroButton>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <HeroButton variant="outline" size="sm">Log in</HeroButton>
                </Link>
                <Link to="/signup">
                  <HeroButton variant="accent" size="sm">Sign up</HeroButton>
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-foreground/70 hover:text-foreground transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>

        {/* Mobile dropdown - absolute, from very top, with spacer for header */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute left-0 right-0 top-0 bg-white shadow-lg z-[-1]">
            <div className="h-[60px]" />
            <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  {...(link.external && !link.href.startsWith("mailto:")
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  className="text-sm text-foreground/70 hover:text-foreground transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-foreground/70 hover:text-foreground transition-colors flex items-center gap-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                <img src="/GitHub_Invertocat_Black.svg" alt="GitHub" className="size-4" />
                GitHub
              </a>
              <div className="border-t border-foreground/10 pt-4 mt-2 flex flex-col gap-3">
                {isAuthenticated ? (
                  <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                    <HeroButton variant="primary" className="w-full">Dashboard</HeroButton>
                  </Link>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                      <HeroButton variant="outline" className="w-full">Log in</HeroButton>
                    </Link>
                    <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>
                      <HeroButton variant="primary" className="w-full">Sign up</HeroButton>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="max-w-7xl mx-auto px-4 md:px-6 pt-20 md:pt-48 pb-12 md:pb-16">
          {/* <span className="inline-block mb-4 px-3 py-1 text-sm font-medium bg-[#C95B37]/10 text-[#C95B37] rounded-full">
            Early Preview
          </span> */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight ">
          The “CMS” for agents
          </h1>
          <p className="mt-6 text-xl opacity-66 max-w-xl">
          A session viewer and backend for conversational agents.<br/>Framework-agnostic, collaborative, and fully extensible.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <Link to="/signup">
              <HeroButton variant="accent" icon={ArrowRight} iconPosition="right">
                Start building
              </HeroButton>
            </Link>
            <Link to={import.meta.env.VITE_AGENTVIEW_DOCS_URL}>
              <HeroButton variant="outline" icon={BookOpen}>
                Read the docs
              </HeroButton>
            </Link>
          </div>
        </section>

        {/* Product Screenshot */}
        <section className="max-w-7xl mx-auto px-4 md:px-6 pb-12 md:pb-16">
          <div className="bg-neutral-900 rounded-sm shadow-2xl">
            {/* <img
              src="/main.png"
              alt="AgentView Studio"
              className="w-full rounded-sm"
            /> */}
            {/* <video src="/studio-demo.mp4" autoPlay muted loop className="w-full rounded-sm" /> */}
            <iframe src="https://www.youtube.com/embed/MQBzAv04ePY?autoplay=1&mute=1&loop=1&playlist=MQBzAv04ePY&rel=0&modestbranding=1" frameBorder="0" allow="autoplay" allowFullScreen className="w-full aspect-[3216/2160] rounded-sm"></iframe>
          </div>
        </section>
        

        {/* Feature Sections */}
        <FeatureSection
          title="Framework-agnostic backend"
          description={<span>
            Use the <span className="font-semibold">AgentView SDK</span> to persist session state without maintaining a complex backend of your own. AgentView <span className="font-semibold">stays out of your AI logic</span>, you can use any framework you want, or go vanilla.
            </span>}
            
            
          imagePosition="right"
          content={
            <CodeBlock
              language="typescript"
              code={`const session = id
  ? await av.getSession({ id })
  : await av.createSession({ agent: "my_agent" });

const history = session.items;

const run = await av.createRun({
  sessionId: session.id,
  items: [input],
  version: "0.0.1",
});

/* Your custom AI logic goes here */
const output = await generateResponse([...history, input]);

await av.updateRun({
  id: run.id,
  status: "completed",
  items: output,
});`}
            />
          }
        />

        <FeatureSection
          title="Collaborate in Studio"
          description={
            <span>Studio is a session browser and playground for your agent. It's <span className="font-semibold">built for collaboration and simple enough for non-technical users</span> like stakeholders and domain experts. More feedback, better agents.</span>
          }
          imagePosition="right"
          content={<img src="/studio-collaboration.png" alt="Collaborative Studio" className="max-w-[500px] min-w-0" />}
        />



        <FeatureSection
          title="Customize in code"
          description={<span>
            Studio is an open-source, self-hosted React app built for <span className="font-semibold">deep customization</span>. Every domain needs a different view—just drop in your own components and keep all configuration in code.
          </span>}
          imagePosition="right"
          content={
            <CodeBlock
              language="tsx"
              code={`{
  schema: z.looseObject({
    type: z.literal("message"),
    role: z.literal("assistant"),
    content: z.array(z.object({
      type: z.literal("output_text"),
      text: z.string(),
    })),
  }),
  displayComponent: ({ item }) => 
    <AssistantMessage>
      {item.content.map((part) => part.text.join("\\n\\n"))}
    </AssistantMessage>,
  scores: [
    multiSelect({
      name: "style",
      title: "Style",
      options: [
        "too-long",
        "too-brief",
        "confusing",
        "overly-technical"
      ]
    })
  ]
}`}
            />
          }
        />


        {/* Pricing */}
        <section id="pricing" className="max-w-7xl mx-auto px-4 md:px-6 mt-20 md:mt-32">
          <h2 className="text-xl md:text-2xl font-semibold tracking-tight ">
            Pricing
          </h2>
          {/* <p className="mt-4 text-foreground/70 text-center max-w-lg mx-auto">
            Get started for free. Scale when you're ready.
          </p> */}

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free */}
            <div className="border border-foreground/20 rounded-sm p-6 flex flex-col bg-white">
              <h3 className="text-lg font-semibold">Free</h3>
              <div className="mt-3">
                <span className="text-3xl font-semibold">$0</span>
              </div>
              <p className="mt-1 text-sm text-foreground/60">Get Started with AgentView quickly</p>
              <ul className="mt-6 space-y-3 text-sm text-foreground/80 flex-1">

                <li className="flex items-start gap-2">
                  <span className="text-foreground/40 mt-0.5">—</span>
                  3 team members
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-foreground/40 mt-0.5">—</span>
                  1 GB session history storage
                </li>
              </ul>
              <Link to="/signup" className="mt-8">
                <HeroButton variant="accent" className="w-full" icon={ArrowRight} iconPosition="right">
                  Get started
                </HeroButton>
              </Link>
            </div>

            {/* Self-hosted */}
            <div className="border border-foreground/20 rounded-sm p-6 flex flex-col">
              <h3 className="text-lg font-semibold">Self-hosted</h3>
              <div className="mt-3">
                <span className="text-3xl font-semibold">$0</span>
              </div>
              <p className="mt-1 text-sm text-foreground/60">Open source, your infrastructure</p>
              <ul className="mt-6 space-y-3 text-sm text-foreground/80 flex-1">
              <li className="flex items-start gap-2">
                  <span className="text-foreground/40 mt-0.5">—</span>
                  Unlimited team members
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-foreground/40 mt-0.5">—</span>
                  Unlimited storage
                </li>
              </ul>
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="mt-8">
                <HeroButton variant="outline" className="w-full">
                  View on GitHub
                </HeroButton>
              </a>
            </div>

            {/* Need more? */}
            <div className="border border-foreground/20 rounded-sm p-6 flex flex-col">
              <h3 className="text-lg font-semibold">Need more?</h3>
              <div className="mt-3">
                <span className="text-3xl font-semibold">Let's talk</span>
              </div>
              <p className="mt-1 text-sm text-foreground/60">We'll figure it out together</p>
              <ul className="mt-6 space-y-3 text-sm text-foreground/80 flex-1">
                <li className="flex items-start gap-2">
                  <span className="text-foreground/40 mt-0.5">—</span>
                  Unlimited team members
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-foreground/40 mt-0.5">—</span>
                  Unlimited storage
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-foreground/40 mt-0.5">—</span>
                  Direct founder support
                </li>
              </ul>
              <a href={`mailto:${EMAIL}`} className="mt-8">
                <HeroButton variant="outline" className="w-full">
                  Talk to founder
                </HeroButton>
              </a>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer id="contact" className="mt-20 md:mt-32 pb-4">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <h2 className="text-xl md:text-2xl font-semibold tracking-tight">
            Reach out
          </h2>
          <p className="mt-4 text-foreground/60">
            Curious about AgentView, have ideas, or just want to talk agents?<br/>Hit up the founder on{" "}
            <a
              href={X_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground/80 hover:text-foreground underline"
            >
              X
            </a>{" "}
            or{" "}
            <a
              href={`mailto:${EMAIL}`}
              className="text-foreground/80 hover:text-foreground underline"
            >
              email
            </a>
            —always happy to chat.
          </p>
          <p className="mt-24 md:mt-40 text-sm text-foreground/40">
            © {new Date().getFullYear()} AgentView
          </p>
        </div>
      </footer>
    </div>
  );
}
