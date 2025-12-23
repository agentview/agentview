import { authClient } from "../lib/auth-client";
import { betterAuthErrorToBaseError } from "../lib/errors";
import type { ActionFunctionArgs, RouteObject } from "react-router";

async function action({ params }: ActionFunctionArgs) {
  
  const result = await authClient.organization.cancelInvitation({
    invitationId: params.invitationId!,
  });

  if (result.error) {
    return { ok: false, error: betterAuthErrorToBaseError(result.error) };
  }

  return { ok: true, data: null };
}

export const membersInviteCancelRoute: RouteObject = {
  action,
}
