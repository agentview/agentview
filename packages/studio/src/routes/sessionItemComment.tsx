import { agentview, withErrorHandling } from "../lib/agentview";
import { type ActionResponse } from "../lib/errors";
import type { ActionFunctionArgs, RouteObject } from "react-router";
import { actionContext } from "../actionContext";

async function action({ request, params, context }: ActionFunctionArgs): Promise<ActionResponse> {
    if (request.method === 'DELETE') {
        return await withErrorHandling(() =>
            agentview.deleteItemComment(params.id!, params.itemId!, params.commentId!)
        );
    }
    else if (request.method === 'PUT') {
        const { comment } = await request.json();

        return await withErrorHandling(() =>
            agentview.updateItemComment(params.id!, params.itemId!, params.commentId!, { content: comment })
        );
    }

    throw new Error('Method not allowed');
}

export const sessionItemCommentRoute: RouteObject = {
  action,
}
