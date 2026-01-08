import { redirect, useFetcher, useLoaderData, useNavigate, useParams, useRouteLoaderData } from "react-router";
import type { Route } from "./+types/members-delete";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@agentview/studio/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@agentview/studio/components/ui/alert";
import { AlertCircleIcon } from "lucide-react";
import { Button } from "@agentview/studio/components/ui/button";
import { authClient } from "~/authClient";
import { betterAuthErrorToBaseError, type ActionResponse } from "@agentview/studio/lib/errors";
import type { clientLoader as orgLayoutLoader } from "./layout";
import { requireMember } from "~/requireMember";
import { requireOrganization } from "~/requireOrganization";

export async function clientLoader({ params }: Route.LoaderArgs) {
  const organization = await requireOrganization(params.orgId);
  const member = await requireMember(organization, params.memberId);
  return { organization, member };
}

export async function clientAction({ request, params }: Route.ActionArgs): Promise<ActionResponse | Response> {
  const formData = await request.formData();
  const memberId = formData.get("memberId") as string;

  const result = await authClient.organization.removeMember({
    memberIdOrEmail: memberId,
    organizationId: params.orgId,
  });

  if (result.error) {
    return { ok: false, error: betterAuthErrorToBaseError(result.error) };
  }

  return redirect(`/orgs/${params.orgId}/members`);
}

export default function MembersDelete() {
  const fetcher = useFetcher<ActionResponse>();
  const navigate = useNavigate();
  const { organization, member } = useLoaderData<typeof clientLoader>();

  return (
    <Dialog open={true} onOpenChange={() => navigate(`/orgs/${organization.id}/members`)}>
      <DialogContent>
        <fetcher.Form method="post">
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
          </DialogHeader>

          <DialogBody>
            <input type="hidden" name="memberId" value={member.id} />

            {fetcher.data?.ok === false && fetcher.state === 'idle' && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircleIcon className="h-4 w-4" />
                <AlertTitle>Member removal failed</AlertTitle>
                <AlertDescription>{fetcher.data.error.message}</AlertDescription>
              </Alert>
            )}

            <p className="text-sm">
              Are you sure you want to remove <strong className="font-medium">{member.user.email}</strong> from this organization?
              This action cannot be undone.
            </p>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => navigate(`/orgs/${organization.id}/members`)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={fetcher.state !== "idle"}
            >
              {fetcher.state === "submitting" ? "Removing..." : "Remove Member"}
            </Button>
          </DialogFooter>
        </fetcher.Form>
      </DialogContent>
    </Dialog>
  );
}
