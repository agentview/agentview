import { and, eq, not } from "drizzle-orm";
import { db } from "./db"
import { sessionItems, sessions } from "./schemas/schema"
import type { Transaction } from "./types";
import { isUUID } from "./isUUID";
import type { SessionWithCollaboration } from "./shared/apiTypes";


export async function fetchSession(session_id: string, tx?: Transaction): Promise<SessionWithCollaboration | undefined> {
  let where : ReturnType<typeof eq> | undefined;

  if (isUUID(session_id)) { // id
    where = eq(sessions.id, session_id);
  }
  else { // handle
    const match = session_id.match(/^(\d+)(.*)$/);
    if (match) {
      const handleNumber = parseInt(match[1], 10);
      const handleSuffix = match[2] || "";

      where = and(eq(sessions.handleNumber, handleNumber), eq(sessions.handleSuffix, handleSuffix));
    }
    else {
      return undefined;
    }
  }

  const row = await (tx || db).query.sessions.findFirst({
    where,
    with: {
      user: true,
      runs: {
        columns: {
          id: true,
          createdAt: true,
          finishedAt: true,
          status: true,
          failReason: true,
          metadata: true,
          sessionId: true,
          versionId: true,
        },
        orderBy: (run, { asc }) => [asc(run.createdAt)],
        with: {
          version: true,
          sessionItems: {
            orderBy: (sessionItem, { asc }) => [asc(sessionItem.sortOrder)],
            where: (sessionItem, { eq }) => eq(sessionItem.isState, false),
            with: {
              commentMessages: {
                orderBy: (commentMessages, { asc }) => [asc(commentMessages.createdAt)],
                with: {
                  score: true
                }
              },
              scores: true
            }
          }
        }
      }
    }
  });
  
  if (!row) {
    return undefined;
  }

  const state = await fetchSessionState(row.id, tx);

  return {
    id: row.id,
    handle: row.handleNumber.toString() + (row.handleSuffix ?? ""),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    metadata: row.metadata,
    agent: row.agent,
    user: row.user,
    userId: row.user.id,
    env: row.user.env,
    runs: row.runs.filter((run, index) => run.status === "in_progress" || run.status === "completed" || index === row.runs.length - 1),
    state
  } as SessionWithCollaboration;
}

async function fetchSessionState(session_id: string, tx?: Transaction) {
  // Fetch the latest __state__ session item by createdAt descending
  const stateItem = await (tx || db).query.sessionItems.findFirst({
    where: and(eq(sessionItems.sessionId, session_id), eq(sessionItems.isState, true)),
    orderBy: (sessionItem, { desc }) => [desc(sessionItem.createdAt)],
  });

  if (!stateItem) {
    return null
  }

  return stateItem.content as any
}
