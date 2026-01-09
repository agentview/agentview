import type { ActionResponse } from "@agentview/studio/lib/errors";

export async function fetchInvitation(invitationId: string) : Promise<ActionResponse> {
  const invitationResponse = await fetch(`${import.meta.env.VITE_AGENTVIEW_API_URL}/api/invitations/${invitationId}`, {
    headers: {
      'Content-Type': 'application/json',
    }
  })

  const invitationResponseData = await invitationResponse.json();

  if (!invitationResponse.ok) {
    return {
      ok: false,
      error: { message: invitationResponseData.message || "Unknown error." }
    }
  }

  const invitation = invitationResponseData;

  return {
    ok: true,
    data: invitation
  }
}