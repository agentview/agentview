import { agentview, withErrorHandling } from "../lib/agentview";
import { type ActionResponse } from "../lib/errors";
import type { ActionFunctionArgs, RouteObject } from "react-router";
import { actionContext } from "../actionContext";


async function action({ request, params, context}: ActionFunctionArgs): Promise<ActionResponse> {
    console.log('[action] set action context')
    context.set(actionContext, { isAction: true });

    const { comment } = await request.json();

    if (!comment) {
        return {
            ok: false,
            error: {
                message: "Comment content is required",
            }
        };
    }

    return await withErrorHandling(() =>
        agentview.createItemComment(params.id!, params.itemId!, { content: comment })
    );
}

export const sessionItemCommentsRoute: RouteObject = {
  action,
}
