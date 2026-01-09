import { useState } from "react";
import { useRouteLoaderData, useFetcher, useParams, useLoaderData } from "react-router";
import type { Route } from "./+types/api-keys";
import { Header, HeaderTitle } from "@agentview/studio/components/header";
import { Button } from "@agentview/studio/components/ui/button";
import { Label } from "@agentview/studio/components/ui/label";
import { Input } from "@agentview/studio/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@agentview/studio/components/ui/alert";
import { AlertCircleIcon, CopyIcon, KeyRoundIcon, Loader2Icon } from "lucide-react";
import { betterAuthErrorToBaseError, type ActionResponse } from "@agentview/studio/lib/errors";
import { useFetcherSuccess } from "@agentview/studio/hooks/useFetcherSuccess";
import { authClient } from "~/authClient";
import { queryClient } from "~/queryClient";
import { queryKeys } from "~/queryKeys";
import { toast } from "sonner";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@agentview/studio/components/ui/dialog";
import type { clientLoader as orgLayoutLoader } from "./layout";

export async function clientLoader({ params }: Route.LoaderArgs) {
  const response = await queryClient.fetchQuery({
    queryKey: queryKeys.apiKeys(),
    queryFn: () => authClient.apiKey.list(),
  });

  if (response.error) {
    return { mainApiKey: null };
  }

  const apiKeys = response.data;
  const mainApiKey = apiKeys.find((apiKey) => apiKey.name === "main" && apiKey.metadata?.organizationId === params.orgId);

  return {
    mainApiKey: mainApiKey || null,
  };
}

export async function clientAction({
  request,
  params,
}: Route.ActionArgs): Promise<ActionResponse<{ apiKey?: any }>> {
  const formData = await request.formData();
  const actionType = formData.get("_action") as string;
  const organizationId = params.orgId;

  if (actionType === "generate") {
    const response = await authClient.apiKey.create({
      name: "main",
      metadata: {
        organizationId
      }
    });

    if (response.error) {
      return { ok: false, error: betterAuthErrorToBaseError(response.error) };
    }

    // Invalidate API keys cache
    await queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys() });

    return { ok: true, data: { apiKey: response.data } };

  } else if (actionType === "regenerate") {
    // List existing keys to find the main one for this org
    const listResponse = await authClient.apiKey.list();

    if (listResponse.error) {
      return { ok: false, error: betterAuthErrorToBaseError(listResponse.error) };
    }

    // Clean old "main" keys for this org
    const oldApiKeys = listResponse.data.filter((key) => key.name === "main" && key.metadata?.organizationId === organizationId);

    for (const oldApiKey of oldApiKeys) {
      const deleteResponse = await authClient.apiKey.delete({
        keyId: oldApiKey.id,
      });

      if (deleteResponse.error) {
        return { ok: false, error: betterAuthErrorToBaseError(deleteResponse.error) };
      }
    }

    // Create new API key
    const createResponse = await authClient.apiKey.create({
      name: "main",
      metadata: {
        organizationId
      }
    });

    if (createResponse.error) {
      return { ok: false, error: betterAuthErrorToBaseError(createResponse.error) };
    }

    // Invalidate API keys cache
    await queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys() });

    return { ok: true, data: { apiKey: createResponse.data } };
  }

  return { ok: false, error: { message: "Invalid action" } };
}

export default function ApiKeys() {
  const layoutData = useRouteLoaderData<typeof orgLayoutLoader>("routes/app/org/layout");
  const { mainApiKey } = useLoaderData<typeof clientLoader>();
  const fetcher = useFetcher<ActionResponse<{ apiKey?: any }>>();
  const [newApiKey, setNewApiKey] = useState<string | null>(null);

  const me = layoutData?.me;

  useFetcherSuccess(fetcher, () => {
    if (fetcher.data?.ok && fetcher.data?.data?.apiKey?.key) {
      setNewApiKey(fetcher.data.data.apiKey.key);
    }
  });

  // Only admin/owner can access this page
  if (me && me.role !== 'admin' && me.role !== 'owner') {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircleIcon className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>You don't have permission to manage API keys.</AlertDescription>
        </Alert>
      </div>
    );
  }

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
                  value={mainApiKey ? (`${mainApiKey.start}...`) : "No API key generated"}
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
                  {fetcher.state === "submitting" ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <KeyRoundIcon className="size-4" />
                  )}
                  {mainApiKey ? "Regenerate API Key" : "Generate API Key"}
                </Button>
              </fetcher.Form>
            </div>
          </div>
        </div>
      </div>

      {/* Dialog to show the new API key */}
      <Dialog open={newApiKey !== null} onOpenChange={() => setNewApiKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Generated</DialogTitle>
            <DialogDescription>
              Please save your secret key in a safe place since you won't be able to view it again.
              Keep it secure, as anyone with your API key can make requests on your behalf.
              If you do lose it, you'll need to generate a new one.
            </DialogDescription>
          </DialogHeader>

          <DialogBody>
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
          </DialogBody>

          <DialogFooter>
            <Button onClick={() => setNewApiKey(null)}>
              I've copied the key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
