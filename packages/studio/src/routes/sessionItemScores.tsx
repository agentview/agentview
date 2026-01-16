import { agentview, withErrorHandling } from "../lib/agentview";
import { type ActionResponse } from "../lib/errors";
import type { ActionFunctionArgs, RouteObject } from "react-router";

async function action({ request, params }: ActionFunctionArgs): Promise<ActionResponse> {
    if (request.method !== 'PATCH') {
        throw new Error('Method not allowed');
    }

    const scores = await request.json();

    return await withErrorHandling(() =>
        agentview.updateItemScores(params.id!, params.itemId!, scores)
    );
}

export const sessionItemScoresRoute: RouteObject = {
    action,
}
