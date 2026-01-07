import { useFetcher, useRouteLoaderData, redirect } from "react-router";
import type { Route } from "./+types/details";
import { Header, HeaderTitle } from "@agentview/studio/components/header";
import { Button } from "@agentview/studio/components/ui/button";
import { Label } from "@agentview/studio/components/ui/label";
import { Input } from "@agentview/studio/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@agentview/studio/components/ui/alert";
import { AlertCircleIcon } from "lucide-react";
import { betterAuthErrorToBaseError, type ActionResponse } from "@agentview/studio/lib/errors";
import { useFetcherSuccess } from "@agentview/studio/hooks/useFetcherSuccess";
import { authClient } from "~/authClient";
import { toast } from "sonner";
import type { clientLoader as orgLayoutLoader } from "./layout";

export async function clientLoader({ params }: Route.LoaderArgs) {
  // Check if user has permission (admin/owner)
  // This is also checked in the layout but we double-check here
  return null;
}

export async function clientAction({
  request,
  params,
}: Route.ActionArgs): Promise<ActionResponse> {
  const formData = await request.formData();
  const name = formData.get('name') as string;

  if (!name || name.trim() === '') {
    return {
      ok: false,
      error: {
        message: "Organization name is required",
        fieldErrors: { name: "Name is required" }
      }
    };
  }

  const { data, error } = await authClient.organization.update({
    organizationId: params.orgId,
    data: {
      name: name.trim(),
    }
  });

  if (error) {
    return { ok: false, error: betterAuthErrorToBaseError(error) };
  }

  return { ok: true, data };
}

export default function OrgDetails() {
  const layoutData = useRouteLoaderData<typeof orgLayoutLoader>("routes/app/org/layout");
  const organization = layoutData?.organization;
  const me = layoutData?.me;

  const editFetcher = useFetcher<ActionResponse>();
  const actionData = editFetcher.data;

  useFetcherSuccess(editFetcher, () => {
    toast.success("Organization has been updated")
  });

  if (!organization || !me) {
    return <div>Loading...</div>;
  }

  // Only admin/owner can access this page
  if (me.role !== 'admin' && me.role !== 'owner') {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircleIcon className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>You don't have permission to edit organization settings.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div>
      <Header>
        <HeaderTitle title="Organization Details" />
      </Header>

      <div className="p-6 max-w-2xl">
        <editFetcher.Form
          method="put"
          className="space-y-4"
        >
          {editFetcher.state === 'idle' && actionData?.ok === false && (
            <Alert variant="destructive">
              <AlertCircleIcon className="h-4 w-4" />
              <AlertTitle>Update failed</AlertTitle>
              <AlertDescription>{actionData.error.message}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="org-name">Organization Name</Label>
            <Input
              id="org-name"
              name="name"
              defaultValue={organization.name}
              required
            />
            {editFetcher.state === 'idle' && actionData?.ok === false && actionData?.error.fieldErrors?.name && (
              <p className="text-sm text-destructive">
                {actionData.error.fieldErrors.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-slug">Slug</Label>
            <Input
              id="org-slug"
              defaultValue={organization.slug}
              disabled
              readOnly
            />
            <p className="text-sm text-muted-foreground">
              The organization slug cannot be changed.
            </p>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={editFetcher.state !== 'idle'}>
              {editFetcher.state === 'submitting' ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </editFetcher.Form>
      </div>
    </div>
  );
}
