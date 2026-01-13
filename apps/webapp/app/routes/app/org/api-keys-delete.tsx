import { data, redirect, useFetcher, useLoaderData, useNavigate, useParams } from "react-router";
import type { Route } from "./+types/api-keys-delete";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@agentview/studio/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@agentview/studio/components/ui/alert";
import { AlertCircleIcon } from "lucide-react";
import { Button } from "@agentview/studio/components/ui/button";
import { authClient } from "~/authClient";
import { queryClient } from "~/queryClient";
import { queryKeys } from "~/queryKeys";
import { betterAuthErrorToBaseError, type ActionResponse } from "@agentview/studio/lib/errors";

export async function clientLoader({ params }: Route.LoaderArgs) {
  const response = await authClient.apiKey.list();

  if (response.error) {
    throw data(betterAuthErrorToBaseError(response.error));
  }

  const apiKey = response.data.find(
    (key) => key.id === params.keyId && key.metadata?.organizationId === params.orgId
  );

  if (!apiKey) {
    throw data({ message: "API key not found" });
  }

  return { apiKey };
}

export async function clientAction({ params }: Route.ActionArgs): Promise<ActionResponse | Response> {
  const response = await authClient.apiKey.delete({
    keyId: params.keyId!,
  });

  if (response.error) {
    return { ok: false, error: betterAuthErrorToBaseError(response.error) };
  }

  await queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys() });

  return redirect(`/orgs/${params.orgId}/api-keys`);
}

export default function ApiKeysDelete() {
  const fetcher = useFetcher<ActionResponse>();
  const navigate = useNavigate();
  const { orgId } = useParams();
  const { apiKey } = useLoaderData<typeof clientLoader>();

  const handleClose = () => {
    navigate(`/orgs/${orgId}/api-keys`);
  };

  return (
    <Dialog open={true} onOpenChange={handleClose}>
      <DialogContent>
        <fetcher.Form method="post">
          <DialogHeader>
            <DialogTitle>Delete API Key</DialogTitle>
          </DialogHeader>

          <DialogBody>
            {fetcher.data?.ok === false && fetcher.state === "idle" && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircleIcon className="h-4 w-4" />
                <AlertTitle>Failed to delete API key</AlertTitle>
                <AlertDescription>{fetcher.data.error.message}</AlertDescription>
              </Alert>
            )}

            <p className="text-sm">
              Are you sure you want to delete the API key{" "}
              <strong className="font-medium">{apiKey.name || "Unnamed"}</strong>?
              This action cannot be undone and any applications using this key will stop working.
            </p>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={fetcher.state !== "idle"}
            >
              {fetcher.state === "submitting" ? "Deleting..." : "Delete API Key"}
            </Button>
          </DialogFooter>
        </fetcher.Form>
      </DialogContent>
    </Dialog>
  );
}
