import React from "react";
import { useLoaderData, useFetcher, data } from "react-router";
import type { RouteObject } from "react-router";

import { Header, HeaderTitle } from "../components/header";
import { apiFetch } from "../lib/apiFetch";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { AlertCircleIcon } from "lucide-react";
import { betterAuthErrorToBaseError, type ActionResponse } from "../lib/errors";
import { useFetcherSuccess } from "../hooks/useFetcherSuccess";
import { useSessionContext } from "../lib/SessionContext";
import { authClient } from "../lib/auth-client";
import { toast } from "sonner";

async function action({
  request,
}: { request: Request }): Promise<ActionResponse> {

  const fieldErrors: Record<string, string> = {};

  // Parse form data
  const formData = await request.formData();
  const name = formData.get('name') as string;

  const { data, error } = await authClient.updateUser({
    name: name.trim(),
  });
  if (error) {
    return { ok: false, error: betterAuthErrorToBaseError(error) };
  }

  return { ok: true, data };
}

function Component() {
  // const { user } = useLoaderData<typeof loader>();
  const { me } = useSessionContext();

  const editFetcher = useFetcher<ActionResponse>();
  const actionData = editFetcher.data;

  console.log(actionData);

  useFetcherSuccess(editFetcher, () => {
    toast.success("Profile has been updated")
    // Optional: show success toast or message
  });

  return <div>
    <Header>
      <HeaderTitle title="Profile" />
    </Header>

    <div className="p-6 max-w-2xl">
      <editFetcher.Form
        method="put"
        className="space-y-4"
      >
        {/* General error alert */}
        {editFetcher.state === 'idle' && actionData?.ok === false && (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertTitle>Update failed.</AlertTitle>
            <AlertDescription>{actionData.error.message}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="edit-email">Email</Label>
          <Input
            id="edit-email"
            type="email"
            name="email"
            defaultValue={me.user.email}
            disabled={true}
            readOnly
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-name">Name</Label>
          <Input
            id="edit-name"
            name="name"
            defaultValue={me.user.name}
            required
          />
          {editFetcher.state === 'idle' && actionData?.ok === false && actionData?.error.fieldErrors?.name && (
            <p id="name-error" className="text-sm text-destructive">
              {actionData.error.fieldErrors.name}
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={editFetcher.state !== 'idle'}>
            {editFetcher.state === 'submitting' ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </editFetcher.Form>
    </div>
  </div>
}

export const settingsProfileRoute: RouteObject = {
  Component,
  action
}