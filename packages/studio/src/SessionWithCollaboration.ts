import { z } from "zod";
import { CommentMessageSchema, RunSchema, ScoreSchema, SessionItemSchema, SessionSchema, type CommentMessage, type Score, type Session } from "agentview/apiTypes";

export const SessionItemWithCollaborationSchema = SessionItemSchema.extend({
    commentMessages: z.array(CommentMessageSchema),
    scores: z.array(ScoreSchema),
})

export type SessionItemWithCollaboration = z.infer<typeof SessionItemWithCollaborationSchema>

export const RunWithCollaborationSchema = RunSchema.extend({
    sessionItems: z.array(SessionItemWithCollaborationSchema),
})

export type RunWithCollaboration = z.infer<typeof RunWithCollaborationSchema>

export const SessionWithCollaborationSchema = SessionSchema.omit({ runs: true }).extend({
    runs: z.array(RunWithCollaborationSchema),
})

export type SessionWithCollaboration = z.infer<typeof SessionWithCollaborationSchema>

export function makeSessionWithCollaboration(
    session: Session,
    comments: CommentMessage[],
    scores: Score[]
): SessionWithCollaboration {
    const commentsByItemId = new Map<string, CommentMessage[]>();
    for (const comment of comments) {
        const existing = commentsByItemId.get(comment.sessionItemId) ?? [];
        existing.push(comment);
        commentsByItemId.set(comment.sessionItemId, existing);
    }

    const scoresByItemId = new Map<string, Score[]>();
    for (const score of scores) {
        const existing = scoresByItemId.get(score.sessionItemId) ?? [];
        existing.push(score);
        scoresByItemId.set(score.sessionItemId, existing);
    }

    return {
        ...session,
        runs: session.runs.map(run => ({
            ...run,
            sessionItems: run.sessionItems.map(item => ({
                ...item,
                commentMessages: commentsByItemId.get(item.id) ?? [],
                scores: scoresByItemId.get(item.id) ?? [],
            }))
        }))
    };
}