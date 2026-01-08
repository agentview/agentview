import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import type { ActionFunctionArgs, LoaderFunctionArgs, RouteObject } from "react-router";
import { redirect, useFetcher, useLoaderData, useNavigate } from "react-router";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { AlertCircleIcon } from "lucide-react";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Button } from "../components/ui/button";
import { authClient } from "../lib/auth-client";
import { betterAuthErrorToBaseError, type ActionResponse } from "../lib/errors";


async function loader({ params }: LoaderFunctionArgs) {
  const orgListResponse = await authClient.organization.list();
  if (orgListResponse.error || orgListResponse.data.length === 0) {
    throw new Error("Organization not found");
  }

  const org = await authClient.organization.getFullOrganization({
    query: { organizationSlug: orgListResponse.data[0].slug }
  });

  if (org.error) throw new Error(org.error.message);

  const member = org.data.members.find(m => m.id === params.memberId);
  if (!member) throw new Error("Member not found");

  return { member };
}

async function action({ request }: ActionFunctionArgs): Promise<ActionResponse | Response> {
  const formData = await request.formData();
  const memberId = formData.get("memberId") as string;
  const role = formData.get("role") as string;

  const result = await authClient.organization.updateMemberRole({
    memberId,
    role,
  });

  if (result.error) {
    return { ok: false, error: betterAuthErrorToBaseError(result.error) };
  }

  return redirect("/settings/members");
}

function Component() {
  const fetcher = useFetcher<ActionResponse>();
  const navigate = useNavigate();
  const { member } = useLoaderData<typeof loader>();

  return <div className="bg-red-500">
    <Dialog open={true} onOpenChange={() => { navigate(-1) }}>
    <DialogContent>
    <fetcher.Form method="post" className="space-y-4">


        <DialogHeader>
          <DialogTitle>Edit Member</DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-5">

            <input type="hidden" name="_action" value="updateRole" />
            <input type="hidden" name="memberId" value={member.id} />

            {/* General error alert */}
            {fetcher.data?.ok === false && fetcher.data.error && fetcher.state === 'idle' && (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertTitle>Role update failed.</AlertTitle>
                <AlertDescription>{fetcher.data.error.message}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label>Email</Label>
              <div className="text-sm text-muted-foreground">{member.user.email}</div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
                <Select defaultValue={member.role} name="role">
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={"member"}>Member</SelectItem>
                  <SelectItem value={"admin"}>Admin</SelectItem>
                  <SelectItem value={"owner"}>Owner</SelectItem>

                </SelectContent>
              </Select>
            </div>
          </DialogBody>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button type="submit" disabled={fetcher.state !== "idle"}>Save</Button>
            </DialogFooter>
            </fetcher.Form>
      </DialogContent>
    </Dialog>
  </div>
}

export const membersEditRoute: RouteObject = {
  Component,
  loader,
  action,
}
