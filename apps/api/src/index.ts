import 'dotenv/config'
import { serve } from '@hono/node-server'
import { HTTPException } from 'hono/http-exception'

import { cors } from 'hono/cors'
import { streamSSE } from 'hono/streaming'
import { APIError as BetterAuthAPIError } from "better-auth/api";
import type { User as BetterAuthUser, ZodError } from "better-auth";

import { z, createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { swaggerUI } from '@hono/swagger-ui'
import { db } from './db'
import { endUsers, sessions, sessionItems, runs, emails, commentMessages, commentMessageEdits, commentMentions, versions, scores, configs, events, inboxItems } from './schemas/schema'
import { eq, desc, and, inArray, ne, gt, isNull, isNotNull, or, gte, sql, countDistinct, DrizzleQueryError, type InferSelectModel, type InferModel } from 'drizzle-orm'
import { response_data, response_error, body } from './hono_utils'
import { isUUID } from './isUUID'
import { extractMentions } from './utils'
import { auth } from './auth'
import { createInvitation, cancelInvitation, getPendingInvitations, getValidInvitation } from './invitations'
import { fetchSession, fetchSessionState } from './sessions'
import { callAgentAPI, AgentAPIError } from './agentApi'
import { getStudioURL } from './getStudioURL'
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { getActiveRuns, getAllSessionItems, getLastRun } from './shared/sessionUtils'
import { EndUserSchema, EndUserCreateSchema, SessionSchema, SessionCreateSchema, RunSchema, SessionItemSchema, type Session, type SessionItem, ConfigSchema, ConfigCreateSchema, UserSchema, UserUpdateSchema, allowedSessionLists, InvitationSchema, InvitationCreateSchema, SessionBaseSchema, SessionsPaginatedResponseSchema, type CommentMessage, type SessionItemWithCollaboration, type SessionWithCollaboration, type RunBody, SessionWithCollaborationSchema, RunCreateSchema, RunUpdateSchema, type EndUser } from './shared/apiTypes'
import { getConfig } from './getConfig'
import type { BaseAgentViewConfig, BaseAgentConfig, BaseSessionItemConfig, BaseScoreConfig } from './shared/configTypes'
import { users } from './schemas/auth-schema'
import { getUsersCount } from './users'
import { updateInboxes } from './updateInboxes'
import { isInboxItemUnread } from './inboxItems'
import { createEndUser, createEndUserAuthSession, getEndUserAuthSession, verifyJWT, findEndUserByExternalId } from './endUsersAuth'
import packageJson from '../package.json'
import type { Transaction } from './types'
import { normalizeItemSchema } from './shared/configUtils'
import { findItemConfig } from './shared/configUtils'

console.log("Migrating database...");
await migrate(db, { migrationsFolder: './drizzle' });
console.log("✅ Database migrated successfully");


export const app = new OpenAPIHono({
  // custom error handler for zod validation errors
  defaultHook: (result, c) => {
    if (!result.success) {
      return c.json({
        message: 'Validation error',
        issues: result.error.issues
      }, 422)
    }
  }
})

/** --------- ERROR HANDLING --------- */

app.onError((error, c) => {
  console.error(error)
  if (error instanceof BetterAuthAPIError) {
    return c.json(error.body, error.statusCode as any); // "as any" because error.statusCode is "number" and hono expects some numeric literal union 
  }
  else if (error instanceof DrizzleQueryError) {
    return c.json({ ...error, message: "DB error" }, 400);
  }
  else if (error instanceof HTTPException) {
    return c.json({
      message: error.message,
    }, error.status);
  }
  else if (error instanceof Error) {
    return c.json({ message: error.message }, 400);
  }
  else {
    return c.json({ message: "Unexpected error" }, 400);
  }
});

/** --------- CORS --------- */

app.use('*', cors({
  origin: [getStudioURL()],
  credentials: true,
}))

/* --------- AUTH --------- */

app.on(["POST", "GET"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

/** --------- UTILS --------- */


async function getBetterAuthSession(headers: Headers) { // this function exists just for type inference below
  const userSession = await auth.api.getSession({ headers })
  if (userSession) {
    return userSession
  }
  return;
}

async function getApiKey(id: string) { // this function exists just for type inference below
  return await auth.api.getApiKey({
    query: {
      id,
    },
  })
}

type UserPrincipal = {
  type: 'user',
  session: NonNullable<Awaited<ReturnType<(typeof getBetterAuthSession)>>>,
}

type ApiKeyPrincipal = {
  type: 'apiKey',
  apiKey: NonNullable<Awaited<ReturnType<typeof getApiKey>>>,
}

type EndUserPrincipal = {
  type: 'endUser',
  session: NonNullable<Awaited<ReturnType<typeof getEndUserAuthSession>>>
}

type Principal = UserPrincipal | ApiKeyPrincipal | EndUserPrincipal;

function extractBearerToken(headers: Headers) {
  const authorization = headers.get('authorization')
  if (!authorization) return null

  const [scheme, ...rest] = authorization.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || rest.length === 0) return null

  return rest.join(' ').trim()
}

function getApiKeyFromHeaders(headers: Headers) {
  return extractBearerToken(headers) ?? headers.get('x-api-key')?.trim() ?? null
}

async function authn(headers: Headers): Promise<Principal> {
  // users
  const userSession = await auth.api.getSession({ headers })
  if (userSession) {
    return { type: 'user', session: userSession }
  }

  const bearer = extractBearerToken(headers)

  if (bearer) {

    // API Keys
    const maybeApiKey = await auth.api.verifyApiKey({
      body: {
        key: bearer,
      },
    })

    if (maybeApiKey?.valid === true && !maybeApiKey.error && maybeApiKey.key) {
      const apiKey = await auth.api.getApiKey({
        query: {
          id: maybeApiKey.key.id,
        },
      })

      return { type: 'apiKey', apiKey }
    }

    // End Users
    const endUserAuthSession = await getEndUserAuthSession({ headers })
    if (endUserAuthSession) {
      return { type: 'endUser', session: endUserAuthSession }
    }

  }

  throw new HTTPException(401, { message: "Unauthorized" });
}

function requireUserPrincipal(principal: Principal) {
  if (principal.type === 'user') {
    return principal;
  }
  throw new HTTPException(401, { message: "Unauthorized" });
}

// AUTHORIZATION

type EndUserAction = {
  type: "end-user:read",
  endUser: EndUser,
} | {
  type: "end-user:edit",
  endUser: EndUser
} | {
  type: "end-user:create"
}

async function authorizeEndUserAction(principal: Principal, action: EndUserAction) {
  if (principal.type === 'endUser') { // only session:read for end users for now
    if (action.type === "end-user:read") {
      if (action.endUser.id === principal.session.endUserId) {
        return true;
      }
    }
  }
  else if (principal.type === 'user') {
    const userId = principal.session.user.id

    if (action.type === "end-user:read" && (!action.endUser.simulatedBy || action.endUser.isShared)) { // sessions without owner or shared -> read access
      return true;
    }

    if (action.type === "end-user:create") {
      return true;
    }

    if (action.type === "end-user:edit" && action.endUser.simulatedBy === userId) { // all access for your sessions
      return true;
    }
  }
  else if (principal.type === 'apiKey') { // god mode access to api keys for now
    return true;
  }

  throw new HTTPException(401, { message: "Unauthorized" });
}

type SessionAction = {
  type: "session:read",
  session: Session,
} | {
  type: "session:edit",
  session: Session
} | {
  type: "session:create"
}

async function authorizeSessionAction(principal: Principal, action: SessionAction) {
  if (action.type === "session:read") {
    return authorizeEndUserAction(principal, { type: "end-user:read", endUser: action.session.endUser });
  }
  else if (action.type === "session:edit") {
    return authorizeEndUserAction(principal, { type: "end-user:edit", endUser: action.session.endUser });
  }
  else if (action.type === "session:create") {
    return authorizeEndUserAction(principal, { type: "end-user:create" });
  }
  throw new HTTPException(401, { message: "Unauthorized" });
}


// // async function authorizeSessionWrite(principal: Principal, session: Session) {
// //   if (principal.type === 'user') {
// //     const userId = principal.session.user.id

// //     if (!session.endUser.simulatedBy || session.endUser.isShared) { // sessions without owner or shared
// //       return true;
// //     }

// //     if (session.endUser.simulatedBy === userId) {
// //       return true;
// //     }
// //   }
// //   else if (principal.type === 'apiKey') { // powerful access to api keys for now
// //     return true;
// //   }

// //   return false
// // }





// async function requireAuthSession(headers: Headers, options?: { admin?: boolean }) {
//   const userSession = await auth.api.getSession({ headers })
//   if (!userSession) {
//     throw new HTTPException(401, { message: "Unauthorized" });
//   }
//   if (options?.admin && userSession.user.role !== "admin") {
//     throw new HTTPException(401, { message: "Unauthorized" });
//   }
//   return userSession
// }

// async function requireEndUserAuthSession(headers: Headers) {
//   const endUserAuthSession = await getEndUserAuthSession({ headers })
//   if (!endUserAuthSession) {
//     throw new HTTPException(401, { message: "Unauthorized" });
//   }
//   return endUserAuthSession
// }


// async function requireUserOrApiKey(headers: Headers, options?: { admin?: boolean }): Promise<UserAuthSession> {
//   const userSession = await auth.api.getSession({ headers })
//   if (userSession) {
//     if (options?.admin && userSession.user.role !== "admin") {
//       throw new HTTPException(401, { message: "Unauthorized" });
//     }
//     return { type: 'user', session: userSession, user: userSession.user }
//   }

//   const maybeApiKey = getApiKeyFromHeaders(headers)
//   if (maybeApiKey) {
//     const verification = await auth.api.verifyApiKey({
//       body: {
//         key: maybeApiKey,
//       },
//     })

//     if (!verification.valid || !verification.key) {
//       throw new HTTPException(401, { message: verification.error?.message ?? "Unauthorized" });
//     }

//     const apiKeyUser = await db.query.users.findFirst({
//       where: eq(users.id, verification.key.userId),
//     })

//     if (!apiKeyUser) {
//       throw new HTTPException(401, { message: "Unauthorized" });
//     }

//     const authUser = { ...apiKeyUser, role: apiKeyUser.role ?? "user" } as BetterAuthUser

//     if (options?.admin && authUser.role !== "admin") {
//       throw new HTTPException(401, { message: "Unauthorized" });
//     }

//     return { type: 'apiKey', apiKey: verification.key, user: authUser }
//   }

//   throw new HTTPException(401, { message: "Unauthorized" });
// }

// async function requireAuthSessionForUserOrEndUser(headers: Headers) {
//   const endUserAuthSession = await getEndUserAuthSession({ headers })
//   const userAuthSession = await auth.api.getSession({ headers })

//   if (endUserAuthSession) {
//     return { type: ('endUser' as const), session: endUserAuthSession }
//   }
//   if (userAuthSession) {
//     return { type: ('user' as const), session: userAuthSession }
//   }
//   throw new HTTPException(401, { message: "Unauthorized" });
// }

async function requireConfig() {
  const config = await getConfig()
  if (!config) {
    throw new HTTPException(404, { message: "Config not found" });
  }
  return config
}

function requireAgentConfig(config: BaseAgentViewConfig, name: string) {
  const agentConfig = config.agents?.find((agent) => agent.name === name)
  if (!agentConfig) {
    throw new HTTPException(404, { message: `Agent '${name}' not found in schema.` });
  }
  return agentConfig
}

function requireItemConfig(agentConfig: ReturnType<typeof requireAgentConfig>, session: Session, contentOrId: object | string, itemType?: "input" | "output" | "step") {
  let itemConfig = findItemConfig(agentConfig, session, contentOrId, itemType);

  if (!itemConfig) {
    throw new HTTPException(400, { message: `Item not found in configuration for agent '${agentConfig.name}'. ${itemType ? `For run item type: ${itemType}` : ''}` });
  }

  return itemConfig
}

function requireScoreConfig(itemConfig: ReturnType<typeof requireItemConfig>, scoreName: string) {
  const scoreConfig = itemConfig.scores?.find((scoreConfig) => scoreConfig.name === scoreName)
  if (!scoreConfig) {
    throw new HTTPException(400, { message: `Score name '${scoreName}' not found in configuration.'` });
  }
  return scoreConfig
}


// async function requireSession(sessionId: string, auth: UniversalAuthSession) {
//   const session = await fetchSession(sessionId)
//   if (!session) {
//     throw new HTTPException(404, { message: "Session not found" });
//   }

//   if (auth.type === 'endUser') {
//     if (session.endUserId !== auth.session.endUserId) {
//       throw new HTTPException(401, { message: "Unauthorized" });
//     }
//   }
//   else {
//     const authUserId = auth.type === 'user' ? auth.session.user.id : auth.user.id

//     if (session.endUser.simulatedBy && !session.endUser.isShared && session.endUser.simulatedBy !== authUserId) {
//       throw new HTTPException(401, { message: "Unauthorized" });
//     }
//   }

//   return session
// }

async function requireSession(sessionId: string) {
  const session = await fetchSession(sessionId)
  if (!session) {
    throw new HTTPException(404, { message: "Session not found" });
  }

  // if (auth.type === 'endUser') {
  //   if (session.endUserId !== auth.session.endUserId) {
  //     throw new HTTPException(401, { message: "Unauthorized" });
  //   }
  // }
  // else {
  //   const authUserId = auth.type === 'user' ? auth.session.user.id : auth.user.id

  //   if (session.endUser.simulatedBy && !session.endUser.isShared && session.endUser.simulatedBy !== authUserId) {
  //     throw new HTTPException(401, { message: "Unauthorized" });
  //   }
  // }

  return session
}

async function requireRun(runId: string) {
  const run = await db.query.runs.findFirst({
    where: eq(runs.id, runId),
  });
  if (!run) {
    throw new HTTPException(404, { message: "Run not found" });
  }
  return run
}

async function requireSessionItem(session: Awaited<ReturnType<typeof requireSession>>, itemId: string): Promise<SessionItemWithCollaboration> {
  const item = getAllSessionItems(session).find((a) => a.id === itemId)
  if (!item) {
    throw new HTTPException(404, { message: "Session item not found" });
  }
  return item as SessionItemWithCollaboration
}

async function requireEndUser(endUserId?: string) {
  if (!endUserId) {
    throw new HTTPException(400, { message: `End user id is required` });
  }

  if (!isUUID(endUserId)) {
    throw new HTTPException(400, { message: `Invalid end user id: ${endUserId}` });
  }

  const endUser = await db.query.endUsers.findFirst({
    where: eq(endUsers.id, endUserId),
  });

  if (!endUser) {
    throw new HTTPException(404, { message: "End user not found" });
  }
  return endUser
}

async function requireCommentMessageFromUser(item: SessionItemWithCollaboration, commentId: string, user: BetterAuthUser) {
  const comment = item.commentMessages?.find((m) => m.id === commentId && m.deletedAt === null)
  if (!comment) {
    throw new HTTPException(404, { message: "Comment not found" });
  }

  if (comment.userId !== user.id) {
    throw new HTTPException(401, { message: "You can only edit your own comments." });
  }

  return comment
}

/* --------- COMMENT OPERATIONS --------- */

type CommentOperationResult = {
  commentId: string;
  userMentions: string[];
}

async function createComment(
  tx: Transaction,
  session: Session,
  item: SessionItem,
  user: BetterAuthUser,
  content: string | null,
) {

  // Add comment
  const [newMessage] = await tx.insert(commentMessages).values({
    sessionItemId: item.id,
    userId: user.id,
    content,
  }).returning();

  let userMentions: string[] = [];

  // Add comment mentions
  if (content) {
    const mentions = extractMentions(content);

    userMentions = mentions.user_id || [];

    if (userMentions.length > 0) {
      await tx.insert(commentMentions).values(
        userMentions.map((mentionedUserId: string) => ({
          commentMessageId: newMessage.id,
          mentionedUserId,
        }))
      );
    }
  }

  // Emit event (default true, can be disabled for batch operations)
  const [event] = await tx.insert(events).values({
    type: 'comment_created',
    authorId: user.id,
    payload: {
      comment_id: newMessage.id,
      has_comment: content ? true : false,
      user_mentions: userMentions,
    }
  }).returning();

  await updateInboxes(tx, event, session, item);

  return newMessage;
}

async function updateComment(
  tx: Transaction,
  session: Session,
  item: SessionItem,
  commentMessage: any,
  newContent: string | null
) {
  // Extract mentions from new content
  let newMentions, previousMentions;
  let newUserMentions: string[] = [], previousUserMentions: string[] = [];

  newMentions = extractMentions(newContent ?? "");
  previousMentions = extractMentions(commentMessage.content ?? "");
  newUserMentions = newMentions.user_id || [];
  previousUserMentions = previousMentions.user_id || [];

  // Store previous content in edit history
  await tx.insert(commentMessageEdits).values({
    commentMessageId: commentMessage.id,
    previousContent: commentMessage.content,
  });

  // Update the comment message
  await tx.update(commentMessages)
    .set({ content: newContent, updatedAt: new Date().toISOString() })
    .where(eq(commentMessages.id, commentMessage.id));

  // Handle mentions for edits
  if (newUserMentions.length > 0 || previousUserMentions.length > 0) {
    // Get existing mentions for this message
    const existingMentions = await tx
      .select()
      .from(commentMentions)
      .where(eq(commentMentions.commentMessageId, commentMessage.id));

    const existingMentionedUserIds = existingMentions.map((m: any) => m.mentionedUserId);

    // Find new mentions to add
    const newMentionsToAdd = newUserMentions.filter((mention: string) =>
      !existingMentionedUserIds.includes(mention)
    );

    // Find mentions to remove (existed before but not in new content)
    const mentionsToRemove = existingMentionedUserIds.filter((mention: string) =>
      !newUserMentions.includes(mention)
    );

    // Remove mentions that are no longer present
    if (mentionsToRemove.length > 0) {
      await tx.delete(commentMentions)
        .where(and(
          eq(commentMentions.commentMessageId, commentMessage.id),
          inArray(commentMentions.mentionedUserId, mentionsToRemove)
        ));
    }

    // Add new mentions
    if (newMentionsToAdd.length > 0) {
      await tx.insert(commentMentions).values(
        newMentionsToAdd.map((mentionedUserId: string) => ({
          commentMessageId: commentMessage.id,
          mentionedUserId,
        }))
      );
    }
  }

  // Emit event
  const [event] = await tx.insert(events).values({
    type: 'comment_edited',
    authorId: commentMessage.userId,
    payload: {
      comment_id: commentMessage.id,
      has_comment: newContent ? true : false,
      user_mentions: newUserMentions,
    }
  }).returning();

  await updateInboxes(tx, event, session, item);

  return commentMessage;
}

async function deleteComment(
  tx: Transaction,
  session: Session,
  item: SessionItem,
  commentId: any,
  user: BetterAuthUser,
): Promise<void> {
  await tx.delete(commentMentions).where(eq(commentMentions.commentMessageId, commentId));
  await tx.delete(scores).where(eq(scores.commentId, commentId));
  await tx.update(commentMessages).set({
    deletedAt: new Date().toISOString(),
    deletedBy: user.id
  }).where(eq(commentMessages.id, commentId));

  // Emit event (default true, can be disabled for batch operations)
  const [event] = await tx.insert(events).values({
    type: 'comment_deleted',
    authorId: user.id,
    payload: {
      comment_id: commentId
    }
  }).returning();

  await updateInboxes(tx, event, session, item);
}


/* --------- END USERS --------- */

// // End user authentication endpoint (disabled for now)
// const clientAuthRoute = createRoute({
//   method: 'post',
//   path: '/api/end-users/auth',
//   request: {
//     body: body(z.object({
//       id_token: z.string().optional(),
//     })),
//   },
//   responses: {
//     200: response_data(z.object({
//       token: z.string(),
//       endUserId: z.string(),
//       expiresAt: z.iso.date(),
//     })),
//     401: response_error(),
//     404: response_error(),
//   },
// })

// app.openapi(clientAuthRoute, async (c) => {
//   const endUserSession = await getEndUserAuthSession({ headers: c.req.raw.headers })

//   if (endUserSession) {
//     return c.json({
//       endUserId: endUserSession.endUserId,
//       token: endUserSession.token,
//       expiresAt: endUserSession.expiresAt,
//     }, 200)
//   }

//   const endUser = await (async () => {
//     const body = await c.req.valid('json')

//     if (body.id_token) {
//       const jwtPayload = verifyJWT(body.id_token)

//       if (!jwtPayload) {
//         throw new HTTPException(401, { message: "Can't verify this ID token." });
//       }

//       const existingClient = await  (jwtPayload.external_id)

//       if (existingClient) {
//         return existingClient
//       } else {
//         return await createEndUser(jwtPayload.external_id)
//       }
//     }

//     return await createEndUser()
//   })()

//   const newendUsersession = await createEndUserAuthSession(endUser.id, {
//     ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
//     userAgent: c.req.header('user-agent'),
//   })

//   return c.json({
//     endUserId: client.id,
//     token: newendUsersession.token,
//     expiresAt: newendUsersession.expiresAt,
//   }, 200)
// })


const endUsersPOSTRoute = createRoute({
  method: 'post',
  path: '/api/end-users',
  request: {
    body: body(EndUserCreateSchema)
  },
  responses: {
    201: response_data(EndUserSchema)
  },
})

app.openapi(endUsersPOSTRoute, async (c) => {
  const principal = await authn(c.req.raw.headers)
  await authorizeEndUserAction(principal, { type: "end-user:create" })

  let userId: string | undefined;
  if (principal.type === 'user') {
    userId = principal.session.user.id;
  }
  else if (principal.type === 'apiKey') {
    userId = principal.apiKey.userId; // this should be dependent on the settings. 
  }
  else {
    throw new HTTPException(401, { message: "Unauthorized" }); // this is unreachable actually
  }

  const body = await c.req.valid('json')

  const [newEndUser] = await db.insert(endUsers).values({
    simulatedBy: userId,
    isShared: body.isShared,
    externalId: body.externalId,
  }).returning();

  return c.json(newEndUser, 201);
})

const endUserGETRoute = createRoute({
  method: 'get',
  path: '/api/end-users/{id}',
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: response_data(EndUserSchema),
    404: response_error()
  },
})

app.openapi(endUserGETRoute, async (c) => {
  const principal = await authn(c.req.raw.headers)

  const { id } = c.req.param()
  const endUser = await requireEndUser(id)

  await authorizeEndUserAction(principal, { type: "end-user:read", endUser })
  
  return c.json(endUser, 200);
})

const apiEndUsersPUTRoute = createRoute({
  method: 'put',
  path: '/api/end-users/{endUserId}',
  request: {
    body: body(EndUserCreateSchema)
  },
  responses: {
    200: response_data(EndUserSchema)
  },
})

app.openapi(apiEndUsersPUTRoute, async (c) => {
  const principal = await authn(c.req.raw.headers)

  const { endUserId } = c.req.param()
  const endUser = await requireEndUser(endUserId)
  const body = await c.req.valid('json')

  await authorizeEndUserAction(principal, { type: "end-user:edit", endUser })

  const [updatedEndUser] = await db.update(endUsers).set(body).where(eq(endUsers.id, endUserId)).returning();

  return c.json(updatedEndUser, 200);
})



/**
 * SESSIONS
 */

const PublicSessionsGetQueryParamsSchema = z.object({
  agent: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional()
});

const SessionsGetQueryParamsSchema = PublicSessionsGetQueryParamsSchema.extend({
  endUserId: z.string().optional(),
  list: z.enum(allowedSessionLists).optional(),
})


const DEFAULT_LIMIT = 50
const DEFAULT_PAGE = 1


function getSessionListFilter(params: z.infer<typeof SessionsGetQueryParamsSchema>, principal: Principal) {
  const { agent, list, endUserId } = params;

  const filters: any[] = []

  if (agent) {
    filters.push(eq(sessions.agent, agent));
  }

  if (principal.type === 'user' || principal.type === 'apiKey') {

    if (list === "playground_shared") {
      filters.push(and(isNotNull(endUsers.simulatedBy), eq(endUsers.isShared, true)));
    }
    else if (list === "playground_private") {
      if (principal.type === 'user') {
        filters.push(and(eq(endUsers.simulatedBy, principal.session.user.id), eq(endUsers.isShared, false)));
      }
      throw new HTTPException(401, { message: "`playground_private` can only be used with provided logged in user id." });
    }
    else if (list === "prod") {
      filters.push(isNull(endUsers.simulatedBy));
    }

    if (endUserId) {
      filters.push(eq(endUsers.id, endUserId));
    }
  }
  else if (principal.type === 'endUser') {
    filters.push(eq(endUsers.id, principal.session.endUserId));
  }

  return and(...filters);
}

async function getSessions(params: z.infer<typeof SessionsGetQueryParamsSchema>, principal: Principal) {
  const limit = Math.max(parseInt(params.limit ?? DEFAULT_LIMIT.toString()) || DEFAULT_LIMIT, 1);
  const page = Math.max(parseInt(params.page ?? DEFAULT_PAGE.toString()) || DEFAULT_PAGE, 1);
  const offset = (page - 1) * limit;

  // Get total count for pagination metadata
  const totalCountResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(sessions)
    .leftJoin(endUsers, eq(sessions.endUserId, endUsers.id))
    .where(getSessionListFilter(params, principal));

  const totalCount = totalCountResult[0]?.count ?? 0;

  // Get sessions with pagination
  const result = await db
    .select()
    .from(sessions)
    .leftJoin(endUsers, eq(sessions.endUserId, endUsers.id))
    .where(getSessionListFilter(params, principal))
    .orderBy(desc(sessions.updatedAt))
    .limit(limit)
    .offset(offset);

  const sessionsResult = result.map((row) => ({
    id: row.sessions.id,
    handle: row.sessions.handleNumber.toString() + (row.sessions.handleSuffix ?? ""),
    createdAt: row.sessions.createdAt,
    updatedAt: row.sessions.updatedAt,
    context: row.sessions.context,
    agent: row.sessions.agent,
    endUser: row.end_users!,
    endUserId: row.end_users!.id,
  }));

  // Calculate pagination metadata
  const totalPages = Math.ceil(totalCount / limit);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;
  const currentPageStart = offset + 1;
  const currentPageEnd = Math.min(offset + limit, totalCount);

  return {
    sessions: sessionsResult,
    pagination: {
      totalCount,
      page,
      limit,
      hasNextPage,
      hasPreviousPage,
      currentPageStart,
      currentPageEnd,
    }
  };
}


// internal
const sessionsGETRoute = createRoute({
  method: 'get',
  path: '/api/sessions',
  request: {
    query: SessionsGetQueryParamsSchema,
  },
  responses: {
    200: response_data(SessionsPaginatedResponseSchema),
    401: response_error(),
  },
})

app.openapi(sessionsGETRoute, async (c) => {
  const principal = await authn(c.req.raw.headers)
  const params = c.req.query();
  const sessions = await getSessions(params, principal)
  return c.json(sessions, 200);
})

// public
const publicSessionsGETRoute = createRoute({
  method: 'get',
  path: '/api/public/sessions',
  tags: ['public'],
  request: {
    query: PublicSessionsGetQueryParamsSchema,
  },
  responses: {
    200: response_data(SessionsPaginatedResponseSchema),
    401: response_error(),
  },
})

app.openapi(publicSessionsGETRoute, async (c) => {
  const principal = await authn(c.req.raw.headers)
  const params = c.req.query();
  const sessions = await getSessions(params, principal)
  return c.json(sessions, 200);
})



type StatsResponse = {
  unseenCount: number,
  sessions?: {
    [sessionId: string]: {
      unseenEvents: any[],
      items: { [itemId: string]: { unseenEvents: any[] } }
    }
  }
}

const sessionsGETStatsRoute = createRoute({
  method: 'get',
  path: '/api/sessions/stats',
  request: {
    query: SessionsGetQueryParamsSchema.extend({
      granular: z.stringbool().optional()
    }),
  },
  responses: {
    200: response_data(z.object({ unseenCount: z.number() })),
  },
})

app.openapi(sessionsGETStatsRoute, async (c) => {
  const principal = await authn(c.req.raw.headers)
  const userPrincipal = requireUserPrincipal(principal);

  const { granular = false, ...params } = c.req.query();

  const result = await db
    .select({
      unreadSessions: countDistinct(inboxItems.sessionId),
    })
    .from(inboxItems)
    .leftJoin(sessions, eq(inboxItems.sessionId, sessions.id))
    .leftJoin(endUsers, eq(sessions.endUserId, endUsers.id))
    .where(
      and(
        eq(inboxItems.userId, userPrincipal.session.user.id),
        sql`${inboxItems.lastNotifiableEventId} > COALESCE(${inboxItems.lastReadEventId}, 0)`,
        getSessionListFilter(params, principal)
      )
    )

  const response: StatsResponse = {
    unseenCount: result[0].unreadSessions ?? 0,
  }

  if (granular) {
    const sessionsResult = await getSessions(params, principal);
    const sessionIds = sessionsResult.sessions.map((row) => row.id);

    response.sessions = {}

    const sessionRows = await db.query.sessions.findMany({
      where: inArray(sessions.id, sessionIds),
      with: {
        endUser: true,
        inboxItems: {
          where: eq(inboxItems.userId, userPrincipal.session.user.id),
        },
      },
      orderBy: (session, { desc }: any) => [desc(session.updatedAt)],
    })

    sessionRows.map((session) => {
      const sessionInboxItem = session.inboxItems.find((inboxItem) => inboxItem.sessionItemId === null);
      const itemInboxItems = session.inboxItems.filter((inboxItem) => inboxItem.sessionItemId !== null);

      function getUnseenEvents(inboxItem: InferSelectModel<typeof inboxItems> | null | undefined) {
        if (isInboxItemUnread(inboxItem)) {
          const render: any = inboxItem?.render;
          return render?.events ?? [];
        }
        return [];
      }

      response.sessions![session.id] = {
        unseenEvents: getUnseenEvents(sessionInboxItem),
        items: {}
      }

      itemInboxItems.forEach((inboxItem) => {
        response.sessions![session.id].items[inboxItem.sessionItemId!] = {
          unseenEvents: getUnseenEvents(inboxItem),
        }
      });

    })
  }

  return c.json(response, 200);
})


const sessionGETRoute = createRoute({
  method: 'get',
  path: '/api/sessions/{session_id}',
  request: {
    params: z.object({
      sessionId: z.string(),
    }),
  },
  responses: {
    200: response_data(SessionWithCollaborationSchema),
    404: response_error()
  },
})

app.openapi(sessionGETRoute, async (c) => {
  const principal = await authn(c.req.raw.headers)
  const { session_id } = c.req.param()
  const session = await requireSession(session_id);
  await authorizeSessionAction(principal, { type: "session:read", session });

  return c.json(session, 200);
})

const publicSessionGETRoute = createRoute({
  method: 'get',
  path: '/api/public/sessions/{session_id}',
  tags: ['public'],
  request: {
    params: z.object({
      sessionId: z.string(),
    }),
  },
  responses: {
    200: response_data(SessionSchema),
    404: response_error()
  },
})

app.openapi(publicSessionGETRoute, async (c) => {
  const endUserAuthSession = await requireEndUserAuthSession(c.req.raw.headers)
  const { session_id } = c.req.param()

  const session = await requireSession(session_id, { type: 'endUser', session: endUserAuthSession });

  const sessionWithoutCollaboration = {
    ...session,
    runs: session.runs.map((run) => ({
      ...run,
      items: run.items.map(({ commentMessages, scores, ...item }) => ({
        ...item
      })),
    }))
  }

  return c.json(sessionWithoutCollaboration, 200);
})


const sessionsPOSTRoute = createRoute({
  method: 'post',
  path: '/api/sessions',
  request: {
    body: body(SessionCreateSchema)
  },
  responses: {
    201: response_data(SessionSchema),
    400: response_error()
  },
})

app.openapi(sessionsPOSTRoute, async (c) => {
  const { isShared = false, ...body } = await c.req.valid('json')

  const config = await requireConfig()
  const agentConfig = await requireAgentConfig(config, body.agent)
  const auth = await requireUserOrApiKey(c.req.raw.headers)
  const endUser = await requireEndUser(body.endUserId);

  // Validate context against the schema
  if (agentConfig.context) {
    try {
      agentConfig.context.parse(body.context);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return c.json({ message: "Error parsing the session context.", code: 'parse.schema', details: error.issues }, 400);
      }
      throw new Error("Unreachable");
    }
  }

  const newSession = await db.transaction(async (tx) => {
    const handleSuffix = endUser.simulatedBy ? "s" : "";

    const sessionWithHighestHandleNumber = await tx.query.sessions.findFirst({
      orderBy: (sessions, { desc }) => [desc(sessions.handleNumber)],
      where: eq(sessions.handleSuffix, handleSuffix),
    });

    const newHandleNumber = sessionWithHighestHandleNumber ? sessionWithHighestHandleNumber.handleNumber + 1 : 1;

    const [newSessionRow] = await tx.insert(sessions).values({
      handleNumber: newHandleNumber,
      handleSuffix: handleSuffix,
      context: body.context,
      agent: body.agent,
      endUserId: endUser.id
    }).returning();

    // add event (only for users, not endUsers)
    const [event] = await tx.insert(events).values({
      type: 'session_created',
      authorId: auth.user.id,
      payload: {
        session_id: newSessionRow.id,
      }
    }).returning();

    const newSession = await fetchSession(newSessionRow.id, tx);
    if (!newSession) {
      throw new Error("[Internal Error] Session not found");
    }

    await updateInboxes(tx, event, newSession, null);
    return newSession;
  });

  return c.json(newSession, 201);
})


const sessionSeenRoute = createRoute({
  method: 'post',
  path: '/api/sessions/{sessionId}/seen',
  request: {
    params: z.object({
      sessionId: z.string(),
    }),
  },
  responses: {
    200: response_data(z.object({})),
    400: response_error(),
    401: response_error(),
    404: response_error(),
  },
})

app.openapi(sessionSeenRoute, async (c) => {
  const auth = await requireUserOrApiKey(c.req.raw.headers);

  const { sessionId } = c.req.param()

  await db.update(inboxItems).set({
    lastReadEventId: sql`${inboxItems.lastNotifiableEventId}`,
    updatedAt: new Date().toISOString(),
  }).where(and(
    eq(inboxItems.userId, auth.user.id),
    eq(inboxItems.sessionId, sessionId),
    isNull(inboxItems.sessionItemId),
  ))

  return c.json({}, 200);
})


/* --------- RUNS --------- */


function parseVersion(version: string): { major: number, minor: number, patch: number } | undefined {
  // Accept version strings like '1.2.3', 'v1.2.3', possibly with suffixes like '-beta'
  const m = version.match(/^v?(\d+)\.(\d+)\.(\d+)/);
  if (!m) return undefined;
  const major = Number(m[1]), minor = Number(m[2]), patch = Number(m[3]);
  if (Number.isNaN(major) || Number.isNaN(minor) || Number.isNaN(patch)) return undefined;
  return { major, minor, patch };
}


const runsPOSTRoute = createRoute({
  method: 'post',
  path: '/api/runs',
  request: {
    params: z.object({
      session_id: z.string(),
    }),
    body: body(RunCreateSchema)
  },
  responses: {
    201: response_data(RunSchema),
    400: response_error(),
    404: response_error()
  },
})


app.openapi(runsPOSTRoute, async (c) => {
  const auth = await requireUserOrApiKey(c.req.raw.headers);

  // const { session_id } = c.req.param()
  const body = await c.req.valid('json')

  const session = await requireSession(body.sessionId, auth);
  const config = await requireConfig()
  const agentConfig = requireAgentConfig(config, session.agent)
  const itemConfig = requireItemConfig(agentConfig, session, body.items[0], "input")

  const lastRun = getLastRun(session)

  if (lastRun?.status === 'in_progress') {
    return new HTTPException(400, { message: `Can't create a run because session has already a run in progress.` });
  }

  /** ITEMS VALIDATION **/

  // TODO!!!!


  /** METADATA VALIDATION **/

  // TODO!!!!

  /** STATE **/


  /** VERSION CHECKING **/

  const parsedVersion = parseVersion(body.version.version);
  if (!parsedVersion) {
    throw new HTTPException(400, { message: "Invalid version number format. Should be like '1.2.3'" });
  }

  if (lastRun?.version && !lastRun.version.env && !body.version.env) { // if previous version and current version exist and are not suffixed, check for compatibility
    const lastVersionParsed = parseVersion(lastRun.version.version);

    if (lastVersionParsed?.major !== parsedVersion?.major || lastVersionParsed?.minor !== parsedVersion?.minor) {
      throw new HTTPException(400, { message: "Cannot continue a session with a different major or minor version." });
    }

    if (lastVersionParsed?.patch < parsedVersion?.patch) {
      throw new HTTPException(400, { message: "Cannot continue a session with a smaller patch version." });
    }
  }

  const [version] = await db.insert(versions).values({
    version: body.version.version,
    env: body.version.env || 'dev',
    metadata: body.version.metadata,
  }).onConflictDoNothing().returning();


  // Create run and items
  await db.transaction(async (tx) => {

    const [newRun] = await tx.insert(runs).values({
      sessionId: body.sessionId,
      status: body.status ?? 'in_progress',
      versionId: version.id,
      metadata: body.metadata,
    }).returning();

    await tx.insert(sessionItems).values(
      body.items.map(item => ({
        sessionId: body.sessionId,
        content: item,
        runId: newRun.id,
      }))
    ).returning();
  });

  const updatedSession = await requireSession(body.sessionId, auth);
  const newRun = getLastRun(updatedSession)!;

  return c.json(newRun, 201);
})




const runsPATCHRoute = createRoute({
  method: 'patch',
  path: '/api/runs/{run_id}',
  request: {
    params: z.object({
      run_id: z.string(),
    }),
    body: body(RunUpdateSchema)
  },
  responses: {
    201: response_data(RunSchema),
    400: response_error(),
    404: response_error()
  },
})

app.openapi(runsPATCHRoute, async (c) => {
  const auth = await requireUserOrApiKey(c.req.raw.headers);

  const { run_id } = c.req.param()
  const body = await c.req.valid('json')

  const run = await requireRun(run_id)

  const session_id = run.sessionId;
  const session = await requireSession(session_id, auth);
  const config = await requireConfig()
  const agentConfig = requireAgentConfig(config, session.agent)

  // prevent wrong status changes
  if (body.status && (run.status === 'failed' || run.status === 'completed') && body.status !== run.status) {
    throw new HTTPException(400, { message: `Cannot change the status of a completed or failed run.` });
  }

  /**
   * ITEMS VALIDATION
   */

  // TODO!!!!

  /**
   * METADATA VALIDATION
   */

  const justCompleted = body.status === 'completed' && run.status !== 'completed';
  const justFailed = body.status === 'failed' && run.status !== 'failed';
  const justFinished = justCompleted || justFailed;

  const newStatus = body.status ?? run.status;
  const newFailReason = newStatus === 'failed' ? body.failReason : run.failReason; // ignore fail reason for non-failed statuses
  const finishedAt = justFinished ? new Date().toISOString() : run.finishedAt;

  await db.transaction(async (tx) => {
    if (body.items) {
      await tx.insert(sessionItems).values(
        body.items?.map(item => ({
          sessionId: session_id,
          content: item,
          runId: run.id
        }))
      );
    }

    await tx.update(runs).set({
      status: newStatus,
      metadata: body.metadata,
      failReason: newFailReason,
      finishedAt: finishedAt,
    }).where(eq(runs.id, run.id));
  });

  const updatedSession = await requireSession(session_id, auth);
  const newRun = getLastRun(updatedSession)!;

  return c.json(newRun, 201);
})

const runWatchRoute = createRoute({
  method: 'get',
  path: '/api/runs/{run_id}/watch',
  request: {
    params: z.object({
      run_id: z.string()
    })
  },
  responses: {
    200: {
      content: {
        'text/event-stream': {
          schema: z.string(),
        },
      },
      description: "Streams items from the run",
    },
    400: response_error(),
    404: response_error()
  },
})


app.openapi(runWatchRoute, async (c) => {
  const auth = await requireUserOrApiKey(c.req.raw.headers);

  const { run_id } = c.req.param()

  const run = await requireRun(run_id)
  const session_id = run.sessionId;

  const session = await requireSession(session_id, auth)
  const lastRun = getLastRun(session)

  return streamSSE(c, async (stream) => {
    let running = true;
    stream.onAbort(() => {
      running = false;
    });

    // let's start with sending full run snapshot
    await stream.writeSSE({
      data: JSON.stringify(lastRun ?? null),
      event: 'run.snapshot',
    });

    // close stream for runs that are not in_progress
    if (lastRun?.status !== 'in_progress') {
      return;
    }

    let previousRun = lastRun;

    /**
     * POLLING HERE
     * Soon we'll need to create a proper messaging, when some LLM API will be streaming characters then even NOTIFY/LISTEN won't make it performance-wise.
     */
    while (running) {
      const session = await requireSession(session_id, auth)
      const lastRun = getLastRun(session)

      if (!lastRun) {
        throw new Error('unreachable');
      }

      // check for new items
      const items = lastRun.items
      const freshItems = items.filter(i => !previousRun.items.find(i2 => i2.id === i.id))

      for (const item of freshItems) {
        await stream.writeSSE({
          data: JSON.stringify(item),
          event: 'item.created',
        });
      }

      previousRun = {
        ...previousRun,
        items: [...previousRun.items, ...freshItems],
      }

      // check for state change
      const runFieldsToCompare = ['id', 'createdAt', 'finishedAt', 'sessionId', 'versionId', 'status', 'failReason', 'version', 'metadata'] as const;
      const changedFields: Partial<typeof lastRun> = {};

      for (const field of runFieldsToCompare) {
        if (JSON.stringify(previousRun[field]) !== JSON.stringify(lastRun[field])) {
          changedFields[field] = lastRun[field];
        }
      }

      if (Object.keys(changedFields).length > 0) {
        await stream.writeSSE({
          data: JSON.stringify(changedFields),
          event: 'run.state',
        });

        // Update previousRun with the new values (excluding sessionItems)
        previousRun = {
          ...previousRun,
          ...changedFields,
        };
      }

      // End if run is no longer in_progress
      if (lastRun?.status !== 'in_progress') {
        break;
      }

      // Wait 1s before next poll
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  });
});









// const runsPOSTRoute = createRoute({
//   method: 'post',
//   path: '/api/sessions/{sessionId}/runs',
//   request: {
//     params: z.object({
//       sessionId: z.string(),
//     }),
//     body: body(z.object({ input: z.any() }))
//   },
//   responses: {
//     201: response_data(RunSchema), // todo: this sucks I guess
//     400: response_error(),
//     404: response_error()
//   },
// })

// app.openapi(runsPOSTRoute, async (c) => {
//   const authSession = await requireAuthSession(c.req.raw.headers);

//   const { sessionId } = c.req.param()
//   const { input } = await c.req.valid('json')

//   const session = await requireSession(sessionId, { type: 'user', session: authSession });
//   const config = await requireConfig()
//   const agentConfig = requireAgentConfig(config, session.agent)
//   const itemConfig = requireItemConfig(agentConfig, session, input, "input")

//   const lastRun = getLastRun(session)

//   if (lastRun?.status === 'in_progress') {
//     return c.json({ message: `Cannot add user item when session is in 'in_progress' status.` }, 400);
//   }

//   // Create user item and run
//   const userItem: SessionItem = await db.transaction(async (tx) => {

//     const [newRun] = await tx.insert(runs).values({
//       sessionId: sessionId,
//       status: 'in_progress',
//     }).returning();

//     const [userItem] = await tx.insert(sessionItems).values({
//       sessionId: sessionId,
//       // type,
//       // role,
//       content: input,
//       runId: newRun.id,
//     }).returning();

//     return userItem;
//   });


//   /***
//    * 
//    * SIMULATION OF THE BACKGROUND JOB RUNNING
//    * 
//    * This should go to the queue but for now is scheduled in HTTP Server process
//    * 
//    * Caveats:
//    * - when server goes down then status is not recovered (dangling `in_progress` run)
//    * 
//    ***/

//   (async () => {

//     const runBody: RunBody = {
//       session: {
//         ...session,
//         runs: session.runs.filter((run) => run.status === 'completed').map((run) => ({
//           ...run,
//           items: run.items.map((item) => ({
//             // type: item.type,
//             // role: item.role,
//             content: item.content,
//             runId: run.id,
//             sessionId: session.id,
//             createdAt: item.createdAt,
//             updatedAt: item.updatedAt,
//             id: item.id,
//           })),
//         })),
//       },
//       input
//     }

//     async function isStillRunning() {
//       const currentRun = await db.query.runs.findFirst({ where: eq(runs.id, userItem.runId) });
//       if (currentRun && currentRun.status === 'in_progress') {
//         return true
//       }
//       return false
//     }

//     try {
//       // Try streaming first, fallback to non-streaming
//       const runOutput = callAgentAPI(runBody, agentConfig.url)

//       let versionId: string | null = null;

//       let hadManifest = false

//       for await (const event of runOutput) {
//         if (!(await isStillRunning())) {
//           return
//         }

//         console.log('EVENT', event.name);

//         if (!hadManifest && event.name !== 'response_data' && event.name !== 'manifest') {
//           throw new AgentAPIError({
//             message: "No 'manifest' was sent by the agent."
//           });
//         }

//         if (event.name === 'response_data') {
//           await db.update(runs)
//             .set({ responseData: event.data })
//             .where(eq(runs.id, userItem.runId));
//           continue;
//         }
//         else if (event.name === 'manifest') {
//           // Create or find existing version
//           const [version] = await db.insert(versions).values({
//             version: event.data.version,
//             env: event.data.env || 'dev',
//             metadata: event.data.metadata || null,
//           }).onConflictDoUpdate({
//             target: [versions.version, versions.env],
//             set: {
//               metadata: event.data.metadata || null,
//             }
//           }).returning();

//           versionId = version.id;

//           // Update the run with version_id
//           if (userItem.runId) {
//             await db.update(runs)
//               .set({ versionId })
//               .where(eq(runs.id, userItem.runId));
//           }

//           hadManifest = true;
//           continue; // Skip this item as it's not an item
//         }
//         else if (event.name === 'metadata') {
//           await db.update(runs)
//             .set({ metadata: event.data })
//             .where(eq(runs.id, userItem.runId));
//           continue;
//         }
//         else if (event.name === 'state') {
//           await db.insert(sessionItems).values({
//             sessionId: sessionId,
//             isState: true,
//             content: event.data,
//             runId: userItem.runId,
//           })
//         }
//         else if (event.name === 'item') {

//           // const parsedItem = z.object({
//           //   type: z.string(),
//           //   role: z.string().optional(),
//           //   content: z.any(),
//           // }).safeParse(event.data)

//           // if (!parsedItem.success) {
//           //   throw new AgentAPIError({
//           //     message: "Invalid item",
//           //     details: event.data
//           //   });
//           // }

//           await db.insert(sessionItems).values({
//             sessionId: sessionId,
//             // type: parsedItem.data.type,
//             // role: parsedItem.data.role,
//             // content: parsedItem.data.content,
//             content: event.data,
//             // metadata: event.data.metadata,
//             runId: userItem.runId,
//           })
//         }
//         else {
//           throw new AgentAPIError({
//             message: `Unknown event type: "${event.name}"`
//           });
//         }
//       }

//       if (!(await isStillRunning())) {
//         return
//       }

//       await db.update(runs)
//         .set({
//           status: 'completed',
//           finishedAt: new Date().toISOString(),
//         })
//         .where(eq(runs.id, userItem.runId));
//     }
//     catch (error: unknown) {
//       if (!(await isStillRunning())) {
//         return
//       }

//       let failReason: { message: string, [key: string]: any }

//       if (error instanceof AgentAPIError) {
//         failReason = error.object
//       }
//       else {
//         console.error(error)
//         failReason = {
//           message: "AgentView internal error, please report to the team"
//         }
//       }

//       await db.update(runs)
//         .set({
//           status: 'failed',
//           finishedAt: new Date().toISOString(),
//           failReason
//         })
//         .where(eq(runs.id, userItem.runId));
//     }

//   })();

//   const newSession = await fetchSession(sessionId);
//   const newRun = getLastRun(newSession!);

//   return c.json(newRun, 201);
// })

// // // Get run response details
// // const runDetailsGETRoute = createRoute({
// //   method: 'get',
// //   path: '/api/sessions/{sessionId}/runs/{runId}/details',
// //   request: {
// //     params: z.object({
// //       sessionId: z.string(),
// //       runId: z.string(),
// //     }),
// //   },
// //   responses: {
// //     200: response_data(z.any()),
// //     401: response_error(),
// //     404: response_error(),
// //   },
// // })

// // app.openapi(runDetailsGETRoute, async (c) => {
// //   const auth = await requireAuthSessionForUserOrEndUser(c.req.raw.headers);

// //   const { sessionId, runId } = c.req.param();

// //   await requireSession(sessionId, auth);

// //   const runRow = await db.query.runs.findFirst({
// //     where: and(
// //       eq(runs.id, runId),
// //       eq(runs.sessionId, sessionId),
// //     ),
// //   });

// //   if (!runRow) {
// //     return c.json({ message: 'Run not found' }, 404);
// //   }

// //   return c.json(runRow.responseData ?? null, 200);
// // })


// // Cancel Run Endpoint
// const runCancelRoute = createRoute({
//   method: 'post',
//   path: '/api/sessions/{sessionId}/cancel_run',
//   request: {
//     params: z.object({
//       sessionId: z.string(),
//     }),
//   },
//   responses: {
//     200: response_data(z.object({})),
//     400: response_error(),
//     404: response_error(),
//   },
// });

// app.openapi(runCancelRoute, async (c) => {
//   const auth = await requireAuthSessionForUserOrEndUser(c.req.raw.headers);

//   const { sessionId } = c.req.param();

//   const session = await requireSession(sessionId, auth);

//   const lastRun = getLastRun(session)

//   if (lastRun?.status !== 'in_progress') {
//     return c.json({ message: 'Run is not in progress' }, 400);
//   }
//   // Set the run as failed
//   await db.update(runs)
//     .set({
//       status: 'failed',
//       finishedAt: new Date().toISOString(),
//       failReason: { message: 'Run was cancelled by user' }
//     })
//     .where(eq(runs.id, lastRun.id));

//   return c.json(await fetchSession(sessionId), 200);
// });

// const runWatchRoute = createRoute({
//   method: 'get',
//   path: '/api/sessions/{sessionId}/watch_run',
//   request: {
//     params: z.object({
//       sessionId: z.string()
//     })
//   },
//   responses: {
//     // 201: response_data(z.array(SessionItemSchema)),
//     400: response_error(),
//     404: response_error()
//   },
// })


// // @ts-ignore don't know how to fix this with hono yet
// app.openapi(runWatchRoute, async (c) => {
//   const auth = await requireAuthSessionForUserOrEndUser(c.req.raw.headers);

//   const { sessionId } = c.req.param()

//   const session = await requireSession(sessionId, auth)
//   const lastRun = getLastRun(session)

//   return streamSSE(c, async (stream) => {
//     let running = true;
//     stream.onAbort(() => {
//       running = false;
//     });

//     // let's start with sending full run snapshot
//     await stream.writeSSE({
//       data: JSON.stringify(lastRun ?? null),
//       event: 'run.snapshot',
//     });

//     // close stream for runs that are not in_progress
//     if (lastRun?.status !== 'in_progress') {
//       return;
//     }


//     let previousRun = lastRun;

//     /**
//      * POLLING HERE
//      * Soon we'll need to create a proper messaging, when some LLM API will be streaming characters then even NOTIFY/LISTEN won't make it performance-wise.
//      */
//     while (running) {
//       const session = await requireSession(sessionId, auth)
//       const lastRun = getLastRun(session)

//       if (!lastRun) {
//         throw new Error('unreachable');
//       }

//       // check for new items
//       const items = lastRun.items
//       const freshItems = items.filter(i => !previousRun.items.find(i2 => i2.id === i.id))

//       for (const item of freshItems) {
//         await stream.writeSSE({
//           data: JSON.stringify(item),
//           event: 'item.created',
//         });
//       }

//       previousRun = {
//         ...previousRun,
//         items: [...previousRun.items, ...freshItems],
//       }

//       // check for state change
//       const runFieldsToCompare = ['id', 'createdAt', 'finishedAt', 'sessionId', 'versionId', 'status', 'failReason', 'version', 'metadata'] as const;
//       const changedFields: Partial<typeof lastRun> = {};

//       for (const field of runFieldsToCompare) {
//         if (JSON.stringify(previousRun[field]) !== JSON.stringify(lastRun[field])) {
//           changedFields[field] = lastRun[field];
//         }
//       }

//       if (Object.keys(changedFields).length > 0) {
//         await stream.writeSSE({
//           data: JSON.stringify(changedFields),
//           event: 'run.state',
//         });

//         // Update previousRun with the new values (excluding sessionItems)
//         previousRun = {
//           ...previousRun,
//           ...changedFields,
//         };
//       }

//       // End if run is no longer in_progress
//       if (lastRun?.status !== 'in_progress') {
//         break;
//       }

//       // Wait 1s before next poll
//       await new Promise(resolve => setTimeout(resolve, 1000));
//     }
//   });
// });





/* --------- ITEMS --------- */

const itemSeenRoute = createRoute({
  method: 'post',
  path: '/api/sessions/{sessionId}/items/{itemId}/seen',
  request: {
    params: z.object({
      sessionId: z.string(),
      itemId: z.string(),
    }),
  },
  responses: {
    200: response_data(z.object({})),
    400: response_error(),
    401: response_error(),
    404: response_error(),
  },
})

app.openapi(itemSeenRoute, async (c) => {
  const auth = await requireUserOrApiKey(c.req.raw.headers);

  const { sessionId, itemId } = c.req.param()

  await db.update(inboxItems).set({
    lastReadEventId: sql`${inboxItems.lastNotifiableEventId}`,
    updatedAt: new Date().toISOString(),
  }).where(and(
    eq(inboxItems.userId, auth.user.id),
    eq(inboxItems.sessionId, sessionId),
    eq(inboxItems.sessionItemId, itemId),
  ))

  return c.json({}, 200);
})



/* --------- FEED --------- */


// function validateScore(config: BaseConfig, session: Session, item: SessionItem, user: BetterAuthUser, scoreName: string, scoreValue: any, options?: { mustNotExist?: boolean }) {
//   const agentConfig = requireAgentConfig(config, session.agent);
//   const itemConfig = requireItemConfig(agentConfig, item.type, item.role ?? undefined)
//   const itemTypeCuteName = `${item.type}' / '${item.role}`

//   // Find the score config for this item
//   const scoreConfig = itemConfig.scores?.find((scoreConfig) => scoreConfig.name === scoreName);
//   if (!scoreConfig) {
//     throw new HTTPException(400, { message: `Score name '${scoreName}' not found in configuration for item  '${itemTypeCuteName}' in agent '${session.agent}'` });
//   }

//   // Check if there is already a score with the same name in any commentMessage's scores
//   if (item.commentMessages && options?.mustNotExist === true) {
//     for (const message of item.commentMessages) {
//       if (message.scores) {
//         for (const score of message.scores) {
//           if (score.name === scoreName && !score.deletedAt && score.createdBy === user.id) {
//             throw new HTTPException(400, { message: `A score with name '${scoreName}' already exists.` });
//           }
//         }
//       }
//     }
//   }

//   // Validate value against the schema
//   const result = scoreConfig.schema.safeParse(scoreValue);
//   if (!result) {
//     throw new HTTPException(400, { message: `Error parsing the score value for score "${scoreName}"` }); // todo: add result.error.issues and "parse.schema" error code.
//   }
// }



const commentsPOSTRoute = createRoute({
  method: 'post',
  path: '/api/sessions/{sessionId}/items/{itemId}/comments',
  request: {
    params: z.object({
      sessionId: z.string(),
      itemId: z.string(),
    }),
    body: body(z.object({
      comment: z.string().optional()
    }))
  },
  responses: {
    201: response_data(z.object({})),
    400: response_error(),
    401: response_error(),
    404: response_error(),
  },
})


app.openapi(commentsPOSTRoute, async (c) => {
  const authSession = await requireAuthSession(c.req.raw.headers);

  const body = await c.req.valid('json')
  const { sessionId, itemId } = c.req.param()

  const session = await requireSession(sessionId, { type: 'user', session: authSession })
  const item = await requireSessionItem(session, itemId);

  await db.transaction(async (tx) => {
    await createComment(tx, session, item, authSession.user, body.comment ?? null);
  })

  return c.json({}, 201);
})


// Comments DELETE (delete comment)
const commentsDELETERoute = createRoute({
  method: 'delete',
  path: '/api/sessions/{sessionId}/items/{itemId}/comments/{commentId}',
  request: {
    params: z.object({
      sessionId: z.string(),
      itemId: z.string(),
      commentId: z.string(),
    }),
  },
  responses: {
    200: response_data(z.object({})),
    400: response_error(),
    401: response_error(),
    404: response_error(),
  },
})

app.openapi(commentsDELETERoute, async (c) => {
  const authSession = await requireAuthSession(c.req.raw.headers);

  const { commentId, sessionId, itemId } = c.req.param()
  const session = await requireSession(sessionId, { type: 'user', session: authSession })
  const item = await requireSessionItem(session, itemId);
  const commentMessage = await requireCommentMessageFromUser(item, commentId, authSession.user);

  await db.transaction(async (tx) => {
    await deleteComment(tx, session, item, commentMessage.id, authSession.user);
  });
  return c.json({}, 200);
})


// Comments PUT (edit comment)
const commentsPUTRoute = createRoute({
  method: 'put',
  path: '/api/sessions/{sessionId}/items/{itemId}/comments/{commentId}',
  request: {
    params: z.object({
      sessionId: z.string(),
      itemId: z.string(),
      commentId: z.string(),
    }),
    body: body(z.object({
      comment: z.string().optional()
    }))
  },
  responses: {
    200: response_data(z.object({})),
    400: response_error(),
    401: response_error(),
    404: response_error(),
  },
})

app.openapi(commentsPUTRoute, async (c) => {
  const authSession = await requireAuthSession(c.req.raw.headers);

  const { sessionId, itemId, commentId } = c.req.param()
  const body = await c.req.valid('json')

  const session = await requireSession(sessionId, { type: 'user', session: authSession })
  const item = await requireSessionItem(session, itemId)
  const commentMessage = await requireCommentMessageFromUser(item, commentId, authSession.user);

  await db.transaction(async (tx) => {
    try {
      await updateComment(tx, session, item, commentMessage, body.comment ?? null);
    } catch (error) {
      return c.json({ message: `Invalid mention format: ${(error as Error).message}` }, 400);
    }
  });

  return c.json({}, 200);
})


/* --------- SCORES --------- */


// Scores GET (get all scores for an item)
const scoresGETRoute = createRoute({
  method: 'get',
  path: '/api/sessions/{sessionId}/items/{itemId}/scores',
  request: {
    params: z.object({
      sessionId: z.string(),
      itemId: z.string(),
    }),
  },
  responses: {
    200: response_data(z.array(z.object({
      name: z.string(),
      value: z.any()
    }))),
    401: response_error(),
    404: response_error(),
  },
})

app.openapi(scoresGETRoute, async (c) => {
  const authSession = await requireAuthSession(c.req.raw.headers);

  const { sessionId, itemId } = c.req.param()

  const session = await requireSession(sessionId, { type: 'user', session: authSession })
  const item = await requireSessionItem(session, itemId);

  // Get all scores for this item created by the current user
  const itemScores = await db.query.scores.findMany({
    where: and(
      eq(scores.sessionItemId, itemId),
      eq(scores.createdBy, authSession.user.id),
      isNull(scores.deletedAt)
    )
  });

  // Convert to array format
  const scoresArray = itemScores.map(score => ({
    name: score.name,
    value: score.value
  }));

  return c.json(scoresArray, 200);
})


// Scores PUT (create or update scores for an item)
const scoresPUTRoute = createRoute({
  method: 'put',
  path: '/api/sessions/{sessionId}/items/{itemId}/scores',
  request: {
    params: z.object({
      sessionId: z.string(),
      itemId: z.string(),
    }),
    body: body(z.array(z.object({
      name: z.string(),
      value: z.any()
    })))
  },
  responses: {
    200: response_data(z.object({})),
    400: response_error(),
    401: response_error(),
    404: response_error(),
  },
})

app.openapi(scoresPUTRoute, async (c) => {
  const authSession = await requireAuthSession(c.req.raw.headers);

  const { sessionId, itemId } = c.req.param()
  const inputScores = await c.req.valid('json');

  const config = await requireConfig()
  const session = await requireSession(sessionId, { type: 'user', session: authSession })
  const item = await requireSessionItem(session, itemId);

  const agentConfig = requireAgentConfig(config, session.agent);
  const itemConfig = requireItemConfig(agentConfig, session, item.id)

  await db.transaction(async (tx) => {
    for (const score of inputScores) {
      const { name, value } = score;

      const scoreConfig = requireScoreConfig(itemConfig, name);

      // Check if score already exists for this user
      const existingScore = await tx.query.scores.findFirst({
        where: and(
          eq(scores.sessionItemId, itemId),
          eq(scores.name, name),
          eq(scores.createdBy, authSession.user.id),
          isNull(scores.deletedAt)
        )
      });

      // delete
      if (value === null || value === undefined) {
        if (existingScore) {
          await deleteComment(tx, session, item, existingScore.commentId, authSession.user);
          await tx.delete(scores)
            // .set({
            //   deletedAt: new Date().toISOString(),
            //   deletedBy: authSession.user.id
            // })
            .where(eq(scores.id, existingScore.id));
        }
        else {
          // null value + non-existing score -> noop
        }
      }
      else if (value !== null) {
        const result = scoreConfig.schema.safeParse(value);
        if (!result.success) {
          return c.json({
            message: `Error parsing the score "${name}"`,
            code: 'parse.schema',
            details: result.error.issues
          }, 400);
        }

        // edit
        if (existingScore) {
          await tx.update(scores)
            .set({
              value: value,
              updatedAt: new Date().toISOString()
            })
            .where(eq(scores.id, existingScore.id));
        }
        // create
        else {
          const commentMessage = await createComment(tx, session, item, authSession.user, null);
          await tx.insert(scores).values({
            sessionItemId: itemId,
            name,
            value,
            commentId: commentMessage.id,
            createdBy: authSession.user.id,
          });
        }
      }
    }
  });

  return c.json({}, 200);
})


/* --------- USERS --------- */


// Users GET (list all users)
const usersGETRoute = createRoute({
  method: 'get',
  path: '/api/users',
  responses: {
    200: response_data(z.array(UserSchema)),
    401: response_error(),
  },
})

app.openapi(usersGETRoute, async (c) => {
  await requireAuthSession(c.req.raw.headers);

  const userRows = await db.select().from(users);

  return c.json(userRows.map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role ?? "user",
    image: user.image ?? null,
    createdAt: user.createdAt,
  })), 200);
})

// User POST (update role)
const userPOSTRoute = createRoute({
  method: 'post',
  path: '/api/users/{userId}',
  request: {
    params: z.object({
      userId: z.string(),
    }),
    body: body(UserUpdateSchema)
  },
  responses: {
    200: response_data(z.object({})),
    400: response_error(),
    401: response_error(),
    404: response_error(),
  },
})

app.openapi(userPOSTRoute, async (c) => {
  await requireAuthSession(c.req.raw.headers, { admin: true });

  const { userId } = c.req.param()
  const body = await c.req.valid('json')

  await auth.api.setRole({
    headers: c.req.raw.headers,
    body: { userId, role: body.role },
  });

  return c.json({}, 200);
})

// User DELETE (delete user)
const userDELETERoute = createRoute({
  method: 'delete',
  path: '/api/users/{userId}',
  request: {
    params: z.object({
      userId: z.string(),
    }),
  },
  responses: {
    200: response_data(z.object({})),
    400: response_error(),
    401: response_error(),
    404: response_error(),
  },
})

app.openapi(userDELETERoute, async (c) => {
  await requireAuthSession(c.req.raw.headers, { admin: true });

  const { userId } = c.req.param()

  await auth.api.removeUser({
    headers: c.req.raw.headers,
    body: { userId },
  });

  return c.json({}, 200);
})

/* --------- INVITATIONS --------- */

// Invitations POST (create invitation)
const invitationsPOSTRoute = createRoute({
  method: 'post',
  path: '/api/invitations',
  request: {
    body: body(InvitationCreateSchema)
  },
  responses: {
    201: response_data(InvitationSchema),
    400: response_error(),
  },
})


app.openapi(invitationsPOSTRoute, async (c) => {
  const session = await requireAuthSession(c.req.raw.headers, { admin: true });

  const body = await c.req.valid('json')

  await createInvitation(body.email, body.role, session.user.id);

  // Get the created invitation to return it
  const pendingInvitations = await getPendingInvitations();
  const createdInvitation = pendingInvitations.find(inv => inv.email === body.email);

  if (!createdInvitation) {
    return c.json({ message: "Failed to create invitation" }, 400);
  }

  return c.json(createdInvitation, 201);
})

// Invitations GET (get pending invitations)
const invitationsGETRoute = createRoute({
  method: 'get',
  path: '/api/invitations',
  responses: {
    200: response_data(z.array(InvitationSchema)),
    400: response_error(),
  },
})

app.openapi(invitationsGETRoute, async (c) => {
  await requireAuthSession(c.req.raw.headers, { admin: true });

  const pendingInvitations = await getPendingInvitations();
  return c.json(pendingInvitations, 200);
})

// Invitation DELETE (cancel invitation)
const invitationDELETERoute = createRoute({
  method: 'delete',
  path: '/api/invitations/{id}',
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: response_data(z.object({})),
    400: response_error(),
    404: response_error(),
  },
})

app.openapi(invitationDELETERoute, async (c) => {
  await requireAuthSession(c.req.raw.headers, { admin: true });

  const { id } = c.req.param()

  await cancelInvitation(id);
  return c.json({}, 200);
})

// Invitation validation
const invitationValidateRoute = createRoute({
  method: 'get',
  path: '/api/invitations/{invitationId}',
  request: {
    params: z.object({
      invitationId: z.string(),
    }),
  },
  responses: {
    200: response_data(InvitationSchema),
    400: response_error(),
  },
})

app.openapi(invitationValidateRoute, async (c) => {
  const { invitationId } = c.req.param()

  const invitation = await getValidInvitation(invitationId);
  return c.json(invitation, 200);
})


/* --------- EMAILS --------- */

// Emails GET
const emailsGETRoute = createRoute({
  method: 'get',
  path: '/api/dev/emails',
  responses: {
    200: response_data(z.any()),
  },
})

app.openapi(emailsGETRoute, async (c) => {
  await requireAuthSession(c.req.raw.headers, { admin: true });

  const emailRows = await db
    .select({
      id: emails.id,
      to: emails.to,
      subject: emails.subject,
      from: emails.from,
      createdAt: emails.createdAt,
    })
    .from(emails)
    .orderBy(desc(emails.createdAt))
    .limit(100);

  return c.json(emailRows, 200);
})

/* --------- EMAIL DETAIL --------- */

const emailDetailGETRoute = createRoute({
  method: 'get',
  path: '/api/dev/emails/{id}',
  responses: {
    200: response_data(z.any()),
  },
})

app.openapi(emailDetailGETRoute, async (c) => {
  await requireAuthSession(c.req.raw.headers, { admin: true });

  const { id } = c.req.param()
  const emailRow = await db.query.emails.findFirst({ where: eq(emails.id, id) })
  return c.json(emailRow, 200)
})

/* --------- SCHEMAS ---------   */

const configsGETRoute = createRoute({
  method: 'get',
  path: '/api/dev/configs/current',
  responses: {
    200: response_data(ConfigSchema.nullable()),
  },
})

app.openapi(configsGETRoute, async (c) => {
  await requireAuthSession(c.req.raw.headers)

  const configRows = await db.select().from(configs).orderBy(desc(configs.createdAt)).limit(1)
  if (configRows.length === 0) {
    return c.json(null, 200)
  }
  return c.json(configRows[0], 200)
})

const configsPOSTRoute = createRoute({
  method: 'post',
  path: '/api/dev/configs',
  request: {
    body: body(ConfigCreateSchema)
  },
  responses: {
    200: response_data(ConfigSchema),
  },
})

app.openapi(configsPOSTRoute, async (c) => {
  const session = await requireAuthSession(c.req.raw.headers, { admin: true })
  const body = await c.req.valid('json')

  const [newSchema] = await db.insert(configs).values({
    config: body.config,
    createdBy: session.user.id,
  }).returning()

  return c.json(newSchema, 200)
})


/* --------- IS ACTIVE --------- */

const statusRoute = createRoute({
  method: 'get',
  path: '/api/status',
  responses: {
    200: response_data(z.object({
      status: z.literal("ok"),
      is_active: z.boolean(),
    })),
  },
})

app.openapi(statusRoute, async (c) => {
  const hasUsers = await getUsersCount() > 0;
  return c.json({ status: "ok", is_active: hasUsers }, 200);
})

/* --------- EMAILS --------- */

// The OpenAPI documentation will be available at /doc
app.doc('/openapi', {
  openapi: '3.0.0',
  info: {
    version: packageJson.version,
    title: "agentview API",
  },
})

app.get('/docs', swaggerUI({ url: '/openapi' }))
app.get('/', (c) => c.text('Hello Agent View!'))

const port = (() => {
  // Get the port from API_PORT
  const apiPort = process.env.AGENTVIEW_API_PORT ?? "80";
  // if (!apiPort) throw new Error('API_PORT is not set');

  try {
    return Number(apiPort);
  } catch (e) {
    throw new Error('Invalid API_PORT: ' + e);
  }
})()

serve({
  fetch: app.fetch,
  port
})

console.log("Agent View API running on port " + port)
