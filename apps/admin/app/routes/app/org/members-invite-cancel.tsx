import type { Route } from "./+types/members-invite-cancel";
import { authClient } from "~/authClient";
import { betterAuthErrorToBaseError, type ActionResponse } from "@agentview/studio/lib/errors";

export async function clientAction({ params }: Route.ActionArgs): Promise<ActionResponse> {
  const result = await authClient.organization.cancelInvitation({
    invitationId: params.invitationId!,
  });

  if (result.error) {
    return { ok: false, error: betterAuthErrorToBaseError(result.error) };
  }

  return { ok: true, data: null };
}

// export default function MembersInviteCancel() {
//   // This route is action-only, it should be triggered via form submission
//   // and doesn't render anything
//   const { orgId } = useParams();
//   const navigate = useNavigate();

//   useEffect(() => {
//     // If somehow navigated to directly, redirect back to members
//     navigate(`/orgs/${orgId}/members`);
//   }, [orgId, navigate]);

//   return null;
// }
