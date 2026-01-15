import { redirect, type LoaderFunctionArgs, type RouteObject } from "react-router";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { authClient } from "../lib/auth-client";
import { getWebAppUrl } from "agentview/urls";

function getRedirectUrl(stringUrl: string) {
  const url = new URL(stringUrl);

  // Otherwise use the redirect param or default to /
  const redirectTo = url.searchParams.get('redirect');
  if (redirectTo && redirectTo.startsWith('/')) {
    return redirectTo;
  }
  return '/';
}

async function loader({ request }: LoaderFunctionArgs) {
  const sessionResponse = await authClient.getSession()

  // if logged in just redirect
  if (sessionResponse.data) {
    return redirect(getRedirectUrl(request.url));
  }

  // Check for token in query params
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (token) {
    window.localStorage.setItem('agentview_token', token);
    url.searchParams.delete('token');
    return redirect(getRedirectUrl(url.toString()));
  }
}

function Component() {
  const authUrl = new URL(getWebAppUrl() + "/auth");
  authUrl.searchParams.set("origin", window.location.href);

  return (
    <div className="container mx-auto p-4 max-w-md mt-16">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Login</CardTitle>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <a href={authUrl.toString()}>Login</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export const loginRoute : RouteObject = {
  Component,
  loader,
}