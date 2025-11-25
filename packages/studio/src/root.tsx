import { isRouteErrorResponse, Outlet, useRouteError, type IndexRouteObject, type NonIndexRouteObject, type RouteObject } from "react-router";
import { Toaster } from "~/components/ui/sonner";

function Component() {
  return <main>
    <Outlet />
    <Toaster position="top-center" />
    </main>
}

function ErrorBoundary() {
  const error = useRouteError();
  let message = "An unexpected error occurred.";
  let details : any = undefined;
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = `${error.status} ${error.data.message}`;
    details = error.data.data;

  } else if (error instanceof Error) {
    message = error.message;
    details = error.cause;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>Error: {message}</h1>
      <br/>
      { details && (<div>Details:
          <br/>
          <pre>{JSON.stringify(details, null, 2)}</pre>
        </div>
      )}
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}

function HydrateFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <img
        src="/logo.svg"
        alt="AgentView Logo"
        className="w-48 h-48"
        style={{ objectFit: "contain" }}
      />
    </div>
  );
}

export const rootRoute : NonIndexRouteObject = {
  Component,
  ErrorBoundary,
  HydrateFallback,
}