import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import type { ActionFunctionArgs, LoaderFunctionArgs, RouteObject } from "react-router";
import { redirect, useFetcher, useLoaderData, useNavigate } from "react-router";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { AlertCircleIcon } from "lucide-react";
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

async function action({ request }: ActionFunctionArgs): Promise<Response | ActionResponse> {
  const formData = await request.formData();
  const memberId = formData.get("memberId") as string;

  const result = await authClient.organization.removeMember({
    memberIdOrEmail: memberId,
  });

  if (result.error) {
    return { ok: false, error: betterAuthErrorToBaseError(result.error) };
  }

  return redirect("/settings/members");
}

function Component() {
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const { member } = useLoaderData<typeof loader>();

  return (
    <div>
      <Dialog open={true} onOpenChange={() => { navigate(-1) }}>
        <DialogContent>

        <fetcher.Form method="post">
          <DialogHeader>
            <DialogTitle>Delete Member</DialogTitle>
          </DialogHeader>

          <DialogBody>
            <input type="hidden" name="memberId" value={member.id} />

            {/* General error alert */}
            {fetcher.data?.ok === false && fetcher.data.error && fetcher.state === 'idle' && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircleIcon />
                <AlertTitle>Member deletion failed.</AlertTitle>
                <AlertDescription>{fetcher.data.error.message}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <p className="text-sm">
                Are you sure you want to remove <strong className="font-medium">{member.user.email}</strong> from this organization? This action cannot be undone.
              </p>
            </div>
            </DialogBody>
            <DialogFooter className="border-0">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={fetcher.state !== "idle"}
              >
                Remove Member
              </Button>
            </DialogFooter>
          </fetcher.Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const membersDeleteRoute: RouteObject = {
  Component,
  loader,
  action,
}
