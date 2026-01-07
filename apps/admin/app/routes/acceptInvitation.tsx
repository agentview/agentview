import { redirect, data, type LoaderFunctionArgs, type RouteObject } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Alert, AlertDescription } from "../components/ui/alert";
import { AlertCircleIcon, Loader2 } from "lucide-react";
import { authClient } from "../lib/auth-client";
import { apiFetch } from "../lib/apiFetch";

async function loader({ request }: LoaderFunctionArgs): Promise<Response> {
  const url = new URL(request.url);
  const invitationId = url.searchParams.get('invitationId');

  if (!invitationId) {
    throw data({ message: "Invitation ID is required." }, { status: 400 });
  }

  const invitationResponse = await apiFetch<any>('/api/invitations/' + invitationId);
  if (!invitationResponse.ok) {
    throw data({ message: invitationResponse.error.message || "Invalid or expired invitation." }, { status: 400 });
  }

  const invitation = invitationResponse.data;
  const session = await authClient.getSession();

  // Logged in users - auto accept.
  if (session.data) {
    const acceptResult = await authClient.organization.acceptInvitation({
      invitationId,
    });

    if (acceptResult.error) {
      throw data({ message: acceptResult.error.message || "Failed to accept invitation." }, { status: 400 });
    }

    return redirect('/');
  }
  // Not logged in
  else {
    if (invitation.userExists) {
      return redirect('/login?invitationId=' + encodeURIComponent(invitationId));
    } else {
      return redirect('/signup?invitationId=' + encodeURIComponent(invitationId));
    }
  }

}

function Component() {
  // This component should never render since loader always redirects
  // But we'll show a loading state just in case
  return (
    <div className="container mx-auto p-4 max-w-md mt-16">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Accept Invitation</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    </div>
  );
}

function ErrorBoundary() {
  return (
    <div className="container mx-auto p-4 max-w-md mt-16">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Accept Invitation</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>
              This invitation is invalid or has expired.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}

export const acceptInvitationRoute: RouteObject = {
  Component,
  loader,
  ErrorBoundary,
}
