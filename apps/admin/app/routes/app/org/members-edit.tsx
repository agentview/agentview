import { redirect, useFetcher, useLoaderData, useNavigate, useParams, useRouteLoaderData } from "react-router";
import type { Route } from "./+types/members-edit";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogBody } from "@agentview/studio/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@agentview/studio/components/ui/alert";
import { AlertCircleIcon } from "lucide-react";
import { Label } from "@agentview/studio/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@agentview/studio/components/ui/select";
import { Button } from "@agentview/studio/components/ui/button";
import { authClient } from "~/authClient";
import { betterAuthErrorToBaseError, type ActionResponse } from "@agentview/studio/lib/errors";
import type { clientLoader as orgLayoutLoader } from "./layout";
import { requireOrganization } from "~/requireOrganization";
import { requireMember } from "~/requireMember";

export async function clientLoader({ params }: Route.LoaderArgs) {
  const organization = await requireOrganization(params.orgId);
  const member = await requireMember(organization, params.memberId);
  return { organization, member };
}

export async function clientAction({ request, params }: Route.ActionArgs): Promise<ActionResponse | Response> {
  const formData = await request.formData();
  const memberId = formData.get("memberId") as string;
  const role = formData.get("role") as string;

  const result = await authClient.organization.updateMemberRole({
    memberId,
    role,
    organizationId: params.orgId,
  });

  if (result.error) {
    return { ok: false, error: betterAuthErrorToBaseError(result.error) };
  }

  return redirect(`/orgs/${params.orgId}/members`);
}

export default function MembersEdit() {
  const fetcher = useFetcher<ActionResponse>();
  const navigate = useNavigate();
  const { organization, member } = useLoaderData<typeof clientLoader>();

  return (
    <Dialog open={true} onOpenChange={() => navigate(`/orgs/${organization.id}/members`)}>
      <DialogContent>
        <fetcher.Form method="post" className="space-y-4">
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <input type="hidden" name="memberId" value={member.id} />

            {fetcher.data?.ok === false && fetcher.state === 'idle' && (
              <Alert variant="destructive">
                <AlertCircleIcon className="h-4 w-4" />
                <AlertTitle>Role update failed</AlertTitle>
                <AlertDescription>{fetcher.data.error.message}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label>Email</Label>
              <div className="text-sm text-muted-foreground">{member.user.email}</div>
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <div className="text-sm text-muted-foreground">{member.user.name}</div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select defaultValue={member.role} name="role">
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => navigate(`/orgs/${organization.id}/members`)}>
              Cancel
            </Button>
            <Button type="submit" disabled={fetcher.state !== "idle"}>
              {fetcher.state === "submitting" ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </fetcher.Form>
      </DialogContent>
    </Dialog>
  );
}
