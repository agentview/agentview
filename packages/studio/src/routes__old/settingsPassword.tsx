import React from "react";
import { useFetcher } from "react-router";
import type { RouteObject } from "react-router";

import { Header, HeaderTitle } from "../components/header";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { AlertCircleIcon } from "lucide-react";
import { betterAuthErrorToBaseError, type ActionResponse } from "../lib/errors";
import { useFetcherSuccess } from "../hooks/useFetcherSuccess";
import { authClient } from "../lib/auth-client";
import { toast } from "sonner";

async function action({
  request,
}: { request: Request }): Promise<ActionResponse> {

  // Parse form data
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

function Component() {
  const changePasswordFetcher = useFetcher<ActionResponse>();
  const actionData = changePasswordFetcher.data;

  useFetcherSuccess(changePasswordFetcher, () => {
    toast.success("Password has been updated")
  });

  return <div>
    <Header>
      <HeaderTitle title="Change Password" />
    </Header>

    <div className="p-6 max-w-2xl">
      <changePasswordFetcher.Form
        method="post"
        className="space-y-4"
      >
        {/* General error alert */}
        {changePasswordFetcher.state === 'idle' && actionData?.ok === false && (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertTitle>Password change failed.</AlertTitle>
            <AlertDescription>{actionData.error.message}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="current-password">Current Password</Label>
          <Input
            id="current-password"
            type="password"
            name="currentPassword"
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="new-password">New Password</Label>
          <Input
            id="new-password"
            type="password"
            name="newPassword"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm New Password</Label>
          <Input
            id="confirm-password"
            type="password"
            name="confirmPassword"
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
}

export const settingsPasswordRoute: RouteObject = {
  Component,
  action
}