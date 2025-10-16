import { apiFetch } from "~/lib/apiFetch";
import { type ActionResponse } from "~/lib/errors";
import type { ActionFunctionArgs, RouteObject } from "react-router";

async function action({ request, params }: ActionFunctionArgs): Promise<ActionResponse> {
    if (request.method !== 'PUT') {
        throw new Error('Method not allowed');
    }

    const scores = await request.json();

    console.log('scores', scores);

    const response = await apiFetch(`/api/sessions/${params.id}/items/${params.itemId}/scores`, {
        method: 'PUT',
        body: scores
    });

    if (!response.ok) {
        return { ok: false, error: response.error };
    }

    return { ok: true, data: {} }
}

export const sessionItemScoresRoute: RouteObject = {
    action,
}