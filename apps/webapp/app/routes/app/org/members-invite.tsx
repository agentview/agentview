import { redirect, useFetcher, useNavigate, useParams } from "react-router";
import type { Route } from "./+types/members-invite";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@agentview/studio/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@agentview/studio/components/ui/alert";
import { AlertCircleIcon } from "lucide-react";
import { Label } from "@agentview/studio/components/ui/label";
import { Input } from "@agentview/studio/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@agentview/studio/components/ui/select";
import { Button } from "@agentview/studio/components/ui/button";
import { authClient } from "~/authClient";
import { queryClient } from "~/queryClient";
import { queryKeys } from "~/queryKeys";
import { betterAuthErrorToBaseError, type ActionResponse } from "@agentview/studio/lib/errors";

export async function clientAction({ request, params }: Route.ActionArgs): Promise<ActionResponse | Response> {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const role = formData.get("role") as "admin" | "member" | "owner";

  const result = await authClient.organization.inviteMember({
    email,
    role,
    organizationId: params.orgId,
  });

  if (result.error) {
    return { ok: false, error: betterAuthErrorToBaseError(result.error) };
  }

  // Invalidate organization cache (invitations are part of organization data)
  await queryClient.invalidateQueries({ queryKey: queryKeys.organization(params.orgId) });

  return redirect(`/orgs/${params.orgId}/members`);
}

export default function MembersInvite() {
  const fetcher = useFetcher<ActionResponse>();
  const navigate = useNavigate();
  const { orgId } = useParams();

  return (
    <Dialog open={true} onOpenChange={() => navigate(`/orgs/${orgId}/members`)}>
      <DialogContent>
        <fetcher.Form method="post" className="space-y-4">
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
          </DialogHeader>

          <DialogBody className="space-y-4">
            {fetcher.data?.ok === false && (
              <Alert variant="destructive">
                <AlertCircleIcon className="h-4 w-4" />
                <AlertTitle>Invitation failed</AlertTitle>
                <AlertDescription>{fetcher.data.error.message}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="inviteMemberEmail">Email</Label>
              <Input
                id="inviteMemberEmail"
                name="email"
                type="email"
                placeholder="john@example.com"
                autoComplete="off"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inviteMemberRole">Role</Label>
              <Select defaultValue="member" name="role">
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => navigate(`/orgs/${orgId}/members`)}>
              Cancel
            </Button>
            <Button type="submit" disabled={fetcher.state !== "idle"}>
              {fetcher.state === "submitting" ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogFooter>
        </fetcher.Form>
      </DialogContent>
    </Dialog>
  );
}
