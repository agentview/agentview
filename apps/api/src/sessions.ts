import { and, eq, not } from "drizzle-orm";
import { db } from "./db"
import { sessionItems, sessions } from "./schemas/schema"
import type { Transaction } from "./types";
import { isUUID } from "./isUUID";
import type { SessionWithCollaboration } from "./shared/apiTypes";

export async function fetchSessions(session_id?: string, tx?: Transaction): Promise<SessionWithCollaboration[]> {
  const where = (() => {
    if (!session_id) {
      return undefined;
    }
    else if (isUUID(session_id)) { // id
      return eq(sessions.id, session_id);
    }
    else { // handle
      const match = session_id.match(/^(\d+)(.*)$/);
      if (match) {
        const handleNumber = parseInt(match[1], 10);
        const handleSuffix = match[2] || "";
        return and(
          eq(sessions.handleNumber, handleNumber),
          eq(sessions.handleSuffix, handleSuffix)
        );
      }
    }

  })();

  if (session_id && where === undefined) {
    return [];
  }

  const sessionRows = await (tx || db).query.sessions.findMany({
    where,
    with: {
      endUser: true,
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
          items: {
            orderBy: (sessionItem, { asc }) => [asc(sessionItem.createdAt)],
            where: (sessionItem, { ne }) => ne(sessionItem.isState, true),
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

  return await Promise.all(sessionRows.map(async (row) => ({
    id: row.id,
    handle: row.handleNumber.toString() + (row.handleSuffix ?? ""),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    metadata: row.metadata,
    agent: row.agent,
    endUser: row.endUser,
    endUserId: row.endUser.id,
    runs: row.runs,
    state: await fetchSessionState(row.id, tx),
  }))) as SessionWithCollaboration[];
}

export async function fetchSession(session_id: string, tx?: Transaction): Promise<SessionWithCollaboration | undefined> {
  const sessions = await fetchSessions(session_id, tx)

  if (sessions.length === 0) {
    return undefined;
  }

  return sessions[0]
}

export async function fetchSessionState(session_id: string, tx?: Transaction) {
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
