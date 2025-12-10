import type { Run } from "agentview/apiTypes"
import { apiFetch } from "./apiFetch";
import { toast } from "sonner";

export async function debugRun(run: Run) {
    const result = await apiFetch(`/api/sessions/${run.sessionId}/runs/${run.id}/details`, {
        method: 'GET',
    });

    toast.info("Check console for error details.")

    if (!result.ok) {
        console.error("Failed to get run details");
        console.error(result.error);
        return;
    }

    console.log({
        ...run,
        request: result.data?.request,
        response: result.data?.response,
    })
}