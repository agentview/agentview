import { useFetcher } from "react-router";
import type { Route } from "./+types/password";
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

export async function clientAction({
  request,
}: Route.ActionArgs): Promise<ActionResponse> {
  const formData = await request.formData();
  const currentPassword = formData.get('currentPassword') as string;
  const newPassword = formData.get('newPassword') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (newPassword !== confirmPassword) {
    return {
      ok: false,
      error: {
        message: "Passwords do not match"
      }
    };
  }

  const { data, error } = await authClient.changePassword({
    currentPassword,
    newPassword,
    revokeOtherSessions: false,
  });

  if (error) {
    return { ok: false, error: betterAuthErrorToBaseError(error) };
  }

  return { ok: true, data };
}

export default function Password() {
  const changePasswordFetcher = useFetcher<ActionResponse>();
  const actionData = changePasswordFetcher.data;

  useFetcherSuccess(changePasswordFetcher, () => {
    toast.success("Password has been updated")
  });

  return (
    <div>
      <Header>
        <HeaderTitle title="Change Password" />
      </Header>

      <div className="p-6 max-w-2xl">
        <changePasswordFetcher.Form
          method="post"
          className="space-y-4"
        >
          {changePasswordFetcher.state === 'idle' && actionData?.ok === false && (
            <Alert variant="destructive">
              <AlertCircleIcon className="h-4 w-4" />
              <AlertTitle>Password change failed</AlertTitle>
              <AlertDescription>{actionData.error.message}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password</Label>
            <Input
              id="current-password"
              type="password"
              name="currentPassword"
              autoComplete="current-password"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              name="newPassword"
              autoComplete="new-password"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input
              id="confirm-password"
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
              required
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={changePasswordFetcher.state !== 'idle'}>
              {changePasswordFetcher.state === 'submitting' ? 'Changing...' : 'Change Password'}
            </Button>
          </div>
        </changePasswordFetcher.Form>
      </div>
    </div>
  );
}
