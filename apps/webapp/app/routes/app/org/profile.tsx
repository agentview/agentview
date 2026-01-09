import { useFetcher, useRouteLoaderData } from "react-router";
import type { Route } from "./+types/profile";
import { Header, HeaderTitle } from "@agentview/studio/components/header";
import { Button } from "@agentview/studio/components/ui/button";
import { Label } from "@agentview/studio/components/ui/label";
import { Input } from "@agentview/studio/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@agentview/studio/components/ui/alert";
import { AlertCircleIcon } from "lucide-react";
import { betterAuthErrorToBaseError, type ActionResponse } from "@agentview/studio/lib/errors";
import { useFetcherSuccess } from "@agentview/studio/hooks/useFetcherSuccess";
import { authClient } from "~/authClient";
import { queryClient } from "~/queryClient";
import { queryKeys } from "~/queryKeys";
import { toast } from "sonner";
import type { clientLoader as orgLayoutLoader } from "./layout";

export async function clientAction({
  request,
}: Route.ActionArgs): Promise<ActionResponse> {
  const formData = await request.formData();
  const name = formData.get('name') as string;

  const { data, error } = await authClient.updateUser({
    name: name.trim(),
  });

  if (error) {
    return { ok: false, error: betterAuthErrorToBaseError(error) };
  }

  // Invalidate session cache (user profile is part of session)
  await queryClient.invalidateQueries({ queryKey: queryKeys.session });

  return { ok: true, data };
}

export default function Profile() {
  const layoutData = useRouteLoaderData<typeof orgLayoutLoader>("routes/app/org/layout");
  const me = layoutData?.me;

  const editFetcher = useFetcher<ActionResponse>();
  const actionData = editFetcher.data;

  useFetcherSuccess(editFetcher, () => {
    toast.success("Profile has been updated")
  });

  if (!me) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <Header>
        <HeaderTitle title="Profile" />
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
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              type="email"
              name="email"
              defaultValue={me.email}
              disabled={true}
              readOnly
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              name="name"
              defaultValue={me.name}
              required
            />
            {editFetcher.state === 'idle' && actionData?.ok === false && actionData?.error.fieldErrors?.name && (
              <p className="text-sm text-destructive">
                {actionData.error.fieldErrors.name}
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={editFetcher.state !== 'idle'}>
              Save
            </Button>
          </div>
        </editFetcher.Form>
      </div>
    </div>
  );
}
