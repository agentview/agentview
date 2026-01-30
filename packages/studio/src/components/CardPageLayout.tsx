import { Link } from "react-router";
import { getWebAppUrl } from "agentview/urls";

type CardPageLayoutVariant = "default" | "poweredBy";

interface CardPageLayoutProps {
  children: React.ReactNode;
  variant?: CardPageLayoutVariant;
}

export function CardPageLayout({ children, variant = "default" }: CardPageLayoutProps) {
  if (variant === "poweredBy") {
    return (
      <div className="container mx-auto p-4 max-w-md mt-16">
        {children}
        <div className="flex justify-center items-center gap-1.5 mt-6 text-muted-foreground text-sm">
          <span>powered by</span>
          <a href={getWebAppUrl()} target="_blank" rel="noopener noreferrer">
            <img src="/logo_light.svg" alt="AgentView" className="h-5" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-md mt-16">
      <div className="flex justify-center mb-4">
        <Link to="/">
          <img src="/logo_light.svg" alt="AgentView" className="h-7" />
        </Link>
      </div>
      {children}
    </div>
  );
}
