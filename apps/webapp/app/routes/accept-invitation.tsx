import { Card, CardContent, CardHeader, CardTitle } from "@agentview/studio/components/ui/card";
import type { ActionResponse } from "@agentview/studio/lib/errors";
import { AlertCircleIcon, Loader2 } from "lucide-react";
import { data, redirect, useLoaderData } from "react-router";
import { authClient } from "~/authClient";
import type { Route } from "./+types/accept-invitation";
import { Alert, AlertDescription, AlertTitle } from "@agentview/studio/components/ui/alert";
import { fetchInvitation } from "~/fetchInvitation";

export async function clientLoader({ request }: Route.LoaderArgs): Promise<ActionResponse | Response> {
  const url = new URL(request.url);
  const invitationId = url.searchParams.get('invitationId');

  if (!invitationId) {
    return {
      ok: false,
      error: { message: "Invitation ID is required." }
    }
  }

  const invitationResponse = await fetchInvitation(invitationId);

  if (!invitationResponse.ok) {
    return invitationResponse;
  }

  const invitation = invitationResponse.data;

  const session = await authClient.getSession();

  // Logged in users - auto accept
  if (session.data) {
    const acceptResult = await authClient.organization.acceptInvitation({
      invitationId,
    });

    if (acceptResult.error) {
      return {
        ok: false,
        error: { message: acceptResult.error.message || "Failed to accept invitation." }
      }
    }

    // Redirect to the organization they just joined
    return redirect(`/orgs/${invitation.organizationId}`);
  }
  // Not logged in
  else {
    const params = new URLSearchParams({
      invitationId,
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
  const loaderData = useLoaderData<typeof clientLoader>();
  
  return (
    <div className="container mx-auto p-4 max-w-md mt-16">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Accept Invitation</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          { !loaderData.ok && <Alert variant="destructive"> 
            <AlertCircleIcon className="h-4 w-4" /> 
              <AlertDescription>{loaderData.error.message}</AlertDescription>
            </Alert>
          }
        </CardContent>
      </Card>
    </div>
  );
}

// export function ErrorBoundary() {
//   return (
//     <div className="container mx-auto p-4 max-w-md mt-16">
//       <Card>
//         <CardHeader>
//           <CardTitle className="text-center">Accept Invitation</CardTitle>
//         </CardHeader>
//         <CardContent>
//           <Alert variant="destructive">
//             <AlertCircleIcon className="h-4 w-4" />
//             <AlertDescription>
//               This invitation is invalid or has expired.
//             </AlertDescription>
//           </Alert>
//         </CardContent>
//       </Card>
//     </div>
//   );
// }
