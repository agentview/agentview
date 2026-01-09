import { Link } from "react-router";

export function CardPageLayout({ children }: { children: React.ReactNode }) {
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