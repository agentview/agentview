import { apiFetch } from "~/lib/apiFetch";
import { type ActionResponse } from "~/lib/errors";
import type { ActionFunctionArgs, RouteObject } from "react-router";

async function action({ request, params }: ActionFunctionArgs): Promise<ActionResponse> {
    const { comment, scores } = await request.json();

    if (!comment && Object.keys(scores).length === 0) {
        return { 
            ok: false, 
            error: {
                message: "At least one of comment or score must be provided",
            }
        };
    }

    const response = await apiFetch(`/api/sessions/${params.id}/items/${params.itemId}/comments`, {
        method: 'POST',
        body: {
            comment,
            scores
        }
    });

    if (!response.ok) {
        return { ok: false, error: response.error };
    }

    return { ok: true, data: { } }
}

export const sessionItemCommentsRoute: RouteObject = {
  action,
}