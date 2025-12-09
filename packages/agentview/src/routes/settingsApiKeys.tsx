import React, { useState, useEffect } from "react";
import { useLoaderData, useFetcher, data, useRevalidator } from "react-router";
import type { LoaderFunctionArgs, RouteObject, ActionFunctionArgs } from "react-router";

import { Header, HeaderTitle } from "~/components/header";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { AlertCircleIcon, CopyIcon, KeyRoundIcon, Loader2Icon } from "lucide-react";
import { betterAuthErrorToBaseError, type ActionResponse } from "~/lib/errors";
import { authClient } from "~/lib/auth-client";
import { toast } from "sonner";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { useFetcherSuccess } from "~/hooks/useFetcherSuccess";

async function action({
  request,
}: ActionFunctionArgs): Promise<ActionResponse> {
  const formData = await request.formData();
  const actionType = formData.get("_action") as string;

  if (actionType === "generate") {
    // Create new API key
    const response = await authClient.apiKey.create({
      name: "main"
    });

    if (response.error) {
      return { ok: false, error: betterAuthErrorToBaseError(response.error) };
    }

    return { ok: true, data: { apiKey: response.data } };
  } else if (actionType === "regenerate") {
    // List existing keys to find the main one
    const listResponse = await authClient.apiKey.list();

    if (listResponse.error) {
      return { ok: false, error: betterAuthErrorToBaseError(listResponse.error) };
    }

    const mainApiKey = listResponse.data.find((key) => key.name === "main");

    // Delete old key if it exists
    if (mainApiKey) {
      const deleteResponse = await authClient.apiKey.delete({
        keyId: mainApiKey.id,
      });

      if (deleteResponse.error) {
        return { ok: false, error: betterAuthErrorToBaseError(deleteResponse.error) };
      }
    }

    // Create new API key
    const createResponse = await authClient.apiKey.create({
      name: "main"
    });

    if (createResponse.error) {
      return { ok: false, error: betterAuthErrorToBaseError(createResponse.error) };
    }

    return { ok: true, data: { apiKey: createResponse.data } };
  }

  return { ok: false, error: { message: "Invalid action" } };
}

async function loader({
  request,
}: LoaderFunctionArgs) {
  const response = await authClient.apiKey.list();

  if (response.error) {
    throw data(betterAuthErrorToBaseError(response.error))
  }

  const apiKeys = response.data;
  const mainApiKey = apiKeys.find((apiKey) => apiKey.name === "main");

  return {
    mainApiKey: mainApiKey || null,
  }
}

function Component() {
  const { mainApiKey } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<ActionResponse & { data?: { apiKey?: any } }>();
  const [newApiKey, setNewApiKey] = useState<string | null>(null);

  useFetcherSuccess(fetcher, () => {
    setNewApiKey(fetcher.data?.data?.apiKey.key);
  });

  return (
    <div>
      <Header>
        <HeaderTitle title="API Keys" />
      </Header>

      <div className="p-6 max-w-2xl">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Your API Key</Label>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={mainApiKey ? (`${mainApiKey.start}...` || mainApiKey.prefix || "••••••••") : "Empty"}
                    disabled
                    readOnly
                    className="font-mono"
                  />
                </div>
                <fetcher.Form method="post">
                  <input type="hidden" name="_action" value={mainApiKey ? "regenerate" : "generate"} />
                  <Button
                    type="submit"
                    variant={mainApiKey ? "outline" : "default"}
                    disabled={fetcher.state !== "idle"}

                  >
                    { fetcher.state === "submitting" ? <Loader2Icon className="size-4 animate-spin" /> : <KeyRoundIcon className="size-4" /> }
                    {mainApiKey ? "Regenerate API Key" : "Generate API Key"}
                  </Button>
                </fetcher.Form>
              </div>
            
          </div>
        </div>
      </div>

      {/* Dialog to show the new API key */}
      <Dialog open={newApiKey !== null} onOpenChange={() => setNewApiKey(null)}>
        <DialogContent showCloseButton={false} >
          <DialogHeader className="border-none">
            <DialogTitle>API Key Generated</DialogTitle>
            <DialogDescription>
            Please save your secret key in a safe place since you won't be able to view it again. Keep it secure, as anyone with your API key can make requests on your behalf. If you do lose it, you'll need to generate a new one.


            </DialogDescription>
          </DialogHeader>

          <DialogBody>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Your API Key</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={newApiKey || ""}
                    readOnly
                    className="font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                        navigator.clipboard.writeText(newApiKey!);
                        toast.success("API key copied to clipboard");
                    }}
                  >
                    <CopyIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {/* <Alert>
                <AlertCircleIcon />
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  Make sure to copy this key now. You won't be able to see it again.
                </AlertDescription>
              </Alert> */}
            </div>

          </DialogBody>
          <DialogFooter className="border-none">
            <Button onClick={() => setNewApiKey(null)}>
              I've copied the key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const settingsApiKeysRoute: RouteObject = {
  Component,
  loader,
  action,
}