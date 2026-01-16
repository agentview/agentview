import { agentview, withErrorHandling } from "../lib/agentview";
import { type ActionResponse } from "../lib/errors";
import type { ActionFunctionArgs, RouteObject } from "react-router";

async function action({ request, params }: ActionFunctionArgs): Promise<ActionResponse> {
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
