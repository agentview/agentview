import { apiFetch } from "../lib/apiFetch";
import { type ActionResponse } from "../lib/errors";
import type { ActionFunctionArgs, RouteObject } from "react-router";

async function action({ request, params }: ActionFunctionArgs): Promise<ActionResponse> {
    if (request.method === 'DELETE') {
        
        const response = await apiFetch(`/api/sessions/${params.id}/items/${params.itemId}/comments/${params.commentId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            return { ok: false, error: response.error };
        }

        return { ok: true, data: {} }

    }
    else if (request.method === 'PUT') {
        const { comment, scores } = await request.json();

        const response = await apiFetch(`/api/sessions/${params.id}/items/${params.itemId}/comments/${params.commentId}`, {
            method: 'PUT',
            body: {
                comment,
                scores
            }
        });

        if (!response.ok) {
            return { ok: false, error: response.error };
        }

        return { ok: true, data: {} }
    }

    throw new Error('Method not allowed');
}

export const sessionItemCommentRoute: RouteObject = {
  action,
}