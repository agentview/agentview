import { useRouteLoaderData, useFetcher, Outlet, Link, useParams } from "react-router";
import type { Route } from "./+types/members";
import { Header, HeaderTitle } from "@agentview/studio/components/header";
import { Button } from "@agentview/studio/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@agentview/studio/components/ui/alert";
import { AlertCircleIcon, Plus } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@agentview/studio/components/ui/table";
import { Badge } from "@agentview/studio/components/ui/badge";
import type { clientLoader as orgLayoutLoader } from "./layout";

export default function Members() {
  const layoutData = useRouteLoaderData<typeof orgLayoutLoader>("routes/app/org/layout");
  const organization = layoutData?.organization;
  const me = layoutData?.me;
  const { orgId } = useParams();
  const fetcher = useFetcher();

  // Only admin/owner can access this page
  if (me && me.role !== 'admin' && me.role !== 'owner') {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircleIcon className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>You don't have permission to manage members.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!organization) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <Header>
        <HeaderTitle title="Members" />
      </Header>

      <div className="p-6 max-w-6xl">
        <div className="mb-8">
          <div className="flex justify-end mb-3">
            <Button asChild size="sm">
              <Link to={`/orgs/${orgId}/members/invitations/new`}>
                <Plus className="w-4 h-4" />
                Invite Member
              </Link>
            </Button>
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Pending invitations */}
                {organization.invitations
                  .filter((invitation) => invitation.status === 'pending')
                  .map((invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell>
                        <div className="flex flex-col min-h-[50px] justify-center">
                          <div className="font-medium">{invitation.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{invitation.role}</TableCell>
                      <TableCell>
                        {(() => {
                          const isExpired = invitation.expiresAt && new Date(invitation.expiresAt) < new Date();
                          if (isExpired) {
                            return <Badge variant="destructive">Invite expired</Badge>;
                          } else {
                            return <Badge variant="secondary">Invite pending</Badge>;
                          }
                        })()}
                      </TableCell>
                      <TableCell>
                        <fetcher.Form method="delete" action={`/orgs/${orgId}/members/invitations/${invitation.id}/cancel`}>
                          <Button
                            type="submit"
                            variant="outline"
                            size="xs"
                            disabled={fetcher.state !== "idle"}
                          >
                            Cancel invite
                          </Button>
                        </fetcher.Form>
                      </TableCell>
                    </TableRow>
                  ))}

                {/* Active members */}
                {organization.members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex flex-col justify-center min-h-[50px]">
                        <div className="font-medium">{member.user.name}</div>
                        <div className="text-sm text-muted-foreground">{member.user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{member.role}</TableCell>
                    <TableCell><Badge>Active</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button asChild variant="outline" size="xs">
                          <Link to={`/orgs/${orgId}/members/${member.id}/delete`}>
                            Remove
                          </Link>
                        </Button>
                        <Button asChild variant="outline" size="xs">
                          <Link to={`/orgs/${orgId}/members/${member.id}/edit`}>
                            Edit
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <Outlet />
      </div>
    </div>
  );
}
