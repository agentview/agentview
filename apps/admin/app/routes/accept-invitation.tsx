import { redirect, data } from "react-router";
import type { Route } from "./+types/accept-invitation";
import { Card, CardContent, CardHeader, CardTitle } from "@agentview/studio/components/ui/card";
import { Alert, AlertDescription } from "@agentview/studio/components/ui/alert";
import { AlertCircleIcon, Loader2 } from "lucide-react";
import { authClient } from "~/authClient";

const API_BASE_URL = "http://localhost:1990";

async function fetchInvitation(invitationId: string, organizationId: string) {
  const response = await fetch(`${API_BASE_URL}/api/invitations/${invitationId}`, {
    headers: {
      'Content-Type': 'application/json',
      'X-Organization-Id': organizationId
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Invalid or expired invitation." }));
    return { ok: false as const, error };
  }

  const data = await response.json();
  return { ok: true as const, data };
}

export async function clientLoader({ request }: Route.LoaderArgs): Promise<Response> {
  const url = new URL(request.url);
  const invitationId = url.searchParams.get('invitationId');
  const organizationId = url.searchParams.get('organizationId');

  if (!invitationId) {
    throw data({ message: "Invitation ID is required." }, { status: 400 });
  }

  if (!organizationId) {
    throw data({ message: "Organization ID is required." }, { status: 400 });
  }

  const invitationResponse = await fetchInvitation(invitationId, organizationId);
  if (!invitationResponse.ok) {
    throw data({ message: invitationResponse.error.message || "Invalid or expired invitation." }, { status: 400 });
  }

  const invitation = invitationResponse.data;
  const session = await authClient.getSession();

  // Logged in users - auto accept
  if (session.data) {
    const acceptResult = await authClient.organization.acceptInvitation({
      invitationId,
    });

    if (acceptResult.error) {
      throw data({ message: acceptResult.error.message || "Failed to accept invitation." }, { status: 400 });
    }

    // Redirect to the organization they just joined
    return redirect(`/orgs/${organizationId}`);
  }
  // Not logged in
  else {
    const params = new URLSearchParams({
      invitationId,
      organizationId
    });

    if (invitation.userExists) {
      return redirect('/login?' + params.toString());
    } else {
      return redirect('/signup?' + params.toString());
    }
  }
}

export default function AcceptInvitation() {
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

export function ErrorBoundary() {
  return (
    <div className="container mx-auto p-4 max-w-md mt-16">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Accept Invitation</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircleIcon className="h-4 w-4" />
            <AlertDescription>
              This invitation is invalid or has expired.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
