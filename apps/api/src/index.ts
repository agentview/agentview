import '@agentview/utils/loadEnv'

import { serve } from '@hono/node-server'
import { HTTPException } from 'hono/http-exception'

import { cors } from 'hono/cors'
import { streamSSE } from 'hono/streaming'
import { APIError as BetterAuthAPIError } from "better-auth/api";
import type { User as BetterAuthUser, ZodError } from "better-auth";

import { z, createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { swaggerUI } from '@hono/swagger-ui'
import { db } from './db'
import { endUsers, sessions, sessionItems, runs, emails, commentMessages, commentMessageEdits, commentMentions, versions, scores, configs, events, inboxItems, starredSessions } from './schemas/schema'
import { eq, desc, and, inArray, ne, gt, isNull, isNotNull, or, gte, sql, countDistinct, DrizzleQueryError, type InferSelectModel } from 'drizzle-orm'
import { response_data, response_error, body } from './hono_utils'
import { isUUID } from './isUUID'
import { extractMentions } from './extractMentions'
import { auth } from './auth'
import { createInvitation, cancelInvitation, getPendingInvitations, getValidInvitation } from './invitations'
import { fetchSession } from './sessions'
import { callAgentAPI, AgentAPIError } from './agentApi'
import { getStudioURL } from './getStudioURL'
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { getActiveRuns, getAllSessionItems, getLastRun } from 'agentview/sessionUtils'
import {
  UserSchema,
  UserCreateSchema,
  SessionSchema,
  SessionCreateSchema,
  SessionUpdateSchema,
  RunSchema,
  type Session, type SessionItem, ConfigSchema, ConfigCreateSchema, MemberSchema, MemberUpdateSchema, InvitationSchema, InvitationCreateSchema, SessionBaseSchema, SessionsPaginatedResponseSchema, type CommentMessage, type SessionItemWithCollaboration, type SessionWithCollaboration, type RunBody, SessionWithCollaborationSchema, RunCreateSchema, RunUpdateSchema, type User, type Run, type PublicSessionsGetQueryParams, type SessionsGetQueryParams, PublicSessionsGetQueryParamsSchema, SessionsGetQueryParamsSchema,
  EnvSchema
} from 'agentview/apiTypes'
import { BaseConfigSchema, BaseConfigSchemaToZod } from 'agentview/configUtils'
import { getConfigRow } from './getConfig'
import { type BaseAgentViewConfig, type Metadata, type BaseRunConfig } from 'agentview/configTypes'
import { users } from './schemas/auth-schema'
import { getTotalMemberCount } from './members'
import { updateInboxes } from './updateInboxes'
import { isInboxItemUnread } from './inboxItems'
import { findUser, createUser } from './users'
import packageJson from '../package.json'
import type { Transaction } from './types'
import { findItemConfig, findItemConfigById, requireRunConfig } from 'agentview/configUtils'
import { equalJSON } from './equalJSON'
import { AgentViewError } from 'agentview/AgentViewError'

console.log("Migrating database...");
await migrate(db, { migrationsFolder: './drizzle' });
console.log("✅ Database migrated successfully");

export const app = new OpenAPIHono({
  // custom error handler for zod validation errors
  defaultHook: (result, c) => {
    if (!result.success) {
      console.log('Validation Error', result.error.issues);
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
  if (error instanceof AgentViewError) {
    console.log('#########################');
    const payload = { message: error.message, ...(error.details ?? {}) }
    console.log('AgentViewError', error.statusCode, payload);
    return c.json(payload, error.statusCode as any);
  }
  else if (error instanceof BetterAuthAPIError) {
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
  // origin: (origin) => {
  //   if (!origin) return;

  //   try {
  //     const url = new URL(origin)

  //     const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname.endsWith('.localhost')

  //     if (isLocalhost) {
  //       return origin;
  //     }
  //   } catch {
  //     return;
  //   }
  // },
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

async function verifyAndGetKey(bearer: string) { // this function exists just for type inference below
  const maybeApiKey = await auth.api.verifyApiKey({
    body: {
      key: bearer,
    },
  })

  return maybeApiKey?.key;
}

type MemberPrincipal = {
  type: 'member',
  session: NonNullable<Awaited<ReturnType<(typeof getBetterAuthSession)>>>,
  user?: User // narrowing down scope
}

type ApiKeyPrincipal = {
  type: 'apiKey',
  apiKey: NonNullable<Awaited<ReturnType<typeof verifyAndGetKey>>>,
  user?: User // narrowing down scope
}

type UserPrincipal = {
  type: 'user',
  user: User
}

type PrivatePrincipal = MemberPrincipal | ApiKeyPrincipal;
type Principal = MemberPrincipal | ApiKeyPrincipal | UserPrincipal;




function extractBearerToken(headers: Headers) {
  const authorization = headers.get('authorization')
  if (!authorization) return null

  const [scheme, ...rest] = authorization.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || rest.length === 0) return null

  return rest.join(' ').trim()
}

function extractUserToken(headers: Headers) {
  const xUserToken = headers.get('x-user-token')
  if (!xUserToken) return null
  return xUserToken.trim()
}

async function authn(headers: Headers): Promise<PrivatePrincipal> {
  // See whether user header exists
  let user: User | undefined;

  const token = extractUserToken(headers)
  if (token) {
    user = await findUser({ token });
    if (!user) {
      throw new HTTPException(404, { message: "User not found." });
    }
  }

  // members
  const memberSession = await auth.api.getSession({ headers })
  if (memberSession) {
    return { type: 'member', session: memberSession, user }
  }

  // API Keys
  const bearer = extractBearerToken(headers)

  if (bearer) {
    const { valid, error, key } = await auth.api.verifyApiKey({
      body: {
        key: bearer,
      },
    })

    if (valid === true && !error && key) {
      return { type: 'apiKey', apiKey: key, user }
    }
  }

  throw new HTTPException(401, { message: "Unauthorized" });
}

async function authnUser(headers: Headers): Promise<UserPrincipal> {
  const token = extractUserToken(headers)

  if (token) {
    const user = await findUser({ token })
    if (user) {
      return { type: 'user', user }
    }
  }

  throw new HTTPException(401, { message: "Unauthorized" });
}



function requireMemberPrincipal(principal: Principal) {
  if (principal.type === 'member') {
    return principal;
  }
  throw new HTTPException(401, { message: "Unauthorized" });
}

// AUTHORIZATION

type Action = {
  action: "end-user:read",
  user: User,
} | {
  action: "end-user:update",
  user: User
} | {
  action: "end-user:create"
} | {
  action: "admin"
} | {
  action: "config"
}

function authorize(principal: Principal, action: Action) {

  // sessions / end-users actions
  if (action.action === "end-user:read" || action.action === "end-user:update" || action.action === "end-user:create") {

    if (principal.type === 'user') { // only session:read for end users for now
      if (action.action === "end-user:read") {
        if (action.user.id === principal.user.id) {
          return true;
        }
      }
    }
    else if ((principal.type === 'apiKey' || principal.type === 'member') && principal.user) { // API_KEY or user, but end user is provided -> narrow down scope to end user
      if ((action.action === "end-user:read" || action.action === "end-user:update") && action.user.id === principal.user.id) {
        return true;
      }
    }
    else if (principal.type === 'member') {
      const memberId = principal.session.user.id

      if (action.action === "end-user:read" && (action.user.env === 'production' || action.user.env === 'shared-playground' || (action.user.env === 'playground' && action.user.createdBy === memberId))) { // sessions without owner or shared -> read access
        return true;
      }

      if (action.action === "end-user:create") {
        return true;
      }

      if (action.action === "end-user:update" && action.user.createdBy === memberId) { // all access for your sessions
        return true;
      }

    }
    else if (principal.type === 'apiKey') { // god mode access to api keys for now
      return true;
    }

  }
  else if (action.action === "admin") {
    if (principal.type === 'member' && principal.session.user.role === "admin") {
      return true;
    }
  }
  else if (action.action === "config") {
    if (principal.type === 'apiKey' || principal.type === 'member') { // TODO: fixme!!! Just api key!
      return true;
    }
  }

  throw new HTTPException(401, { message: "Unauthorized" });
}

// Can call this function after authorise safely
function requireMemberId(principal: Principal) {
  if (principal.type === 'member') {
    return principal.session.user.id;
  }
  else if (principal.type === 'apiKey') {
    return principal.apiKey.userId;
  }
  throw new HTTPException(401, { message: "Unauthorized" });
}


// CONFIG HELPERS

async function requireConfig(): Promise<BaseAgentViewConfig> {
  const configRow = await getConfigRow()
  if (!configRow) {
    throw new HTTPException(404, { message: "Config not found" });
  }

  return BaseConfigSchemaToZod.parse(configRow.config)
  // const parsedConfig = await getParsedConfig()
  // if (!parsedConfig) {
  //   throw new HTTPException(404, { message: "Config not found" });
  // }
  // return parsedConfig
}

function requireAgentConfig(config: BaseAgentViewConfig, name: string) {
  const agentConfig = config.agents?.find((agent) => agent.name === name)
  if (!agentConfig) {
    throw new HTTPException(404, { message: `Agent '${name}' not found in schema.` });
  }
  return agentConfig
}

function requireItemConfig(runConfig: ReturnType<typeof requireRunConfig>, sessionItems: SessionItem[], itemId: string, itemType?: "input" | "output" | "step") {
  let itemConfig = findItemConfigById(runConfig, sessionItems, itemId, itemType);

  if (!itemConfig) {
    throw new HTTPException(400, { message: `Item not found in configuration for item '${itemId}'.` });
  }

  return itemConfig
}

function requireScoreConfig(itemConfig: ReturnType<typeof requireItemConfig>["itemConfig"], scoreName: string) {
  const scoreConfig = itemConfig.scores?.find((scoreConfig) => scoreConfig.name === scoreName)
  if (!scoreConfig) {
    throw new HTTPException(400, { message: `Score name '${scoreName}' not found in configuration.'` });
  }
  return scoreConfig
}

// DATA HELPERS

function requireUUID(id: string) {
  if (!isUUID(id)) {
    throw new HTTPException(404, { message: "Not found" });
  }
}

async function requireSession(sessionId: string) {
  const session = await fetchSession(sessionId)
  if (!session) {
    throw new HTTPException(404, { message: "Session not found" });
  }

  return session
}

async function requireRun(runId: string) {
  const run = await db.query.runs.findFirst({
    where: eq(runs.id, runId),
    with: {
      sessionItems: {
        orderBy: (sessionItem, { asc }) => [asc(sessionItem.sortOrder)],
        where: (sessionItem, { eq }) => eq(sessionItem.isState, false),
      },
    },
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


async function requireUser(arg: Parameters<typeof findUser>[0]) {
  const user = await findUser(arg)
  if (!user) {
    throw new HTTPException(404, { message: "End user not found" });
  }
  return user
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

function parseMetadata(metadataConfig: Metadata | undefined, allowUnknownKeys: boolean = true, inputMetadata: Record<string, any>, existingMetadata: Record<string, any> | undefined | null): Record<string, any> {
  let schema = z.object(metadataConfig ?? {});
  if (allowUnknownKeys) {
    schema = schema.loose();
  } else {
    schema = schema.strict();
  }

  // const emptyNullMetadata = Object.fromEntries(
  //   Object.keys(metadataConfig ?? {}).map((key) => [key, null])
  // );

  const metadata = {
    // ...emptyNullMetadata, // default nulls
    ...(existingMetadata ?? {}), // existing metadata overrides nulls
    ...(inputMetadata ?? {}), // input overrides existing metadata
  }

  // // undefined values 
  // for (const [key, value] of Object.entries(metadata)) {
  //   if (value === undefined) {
  //      metadata[key] = null;
  //   }
  // }

  const result = schema.safeParse(metadata);
  if (!result.success) {
    throw new AgentViewError("Error parsing the metadata.", 422, { code: 'parse.schema', issues: result.error.issues });
  }
  return result.data;
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


const usersPOSTRoute = createRoute({
  method: 'post',
  path: '/api/users',
  request: {
    body: body(UserCreateSchema)
  },
  responses: {
    201: response_data(UserSchema)
  },
})

app.openapi(usersPOSTRoute, async (c) => {
  const principal = await authn(c.req.raw.headers)
  await authorize(principal, { action: "end-user:create" })

  const memberId = requireMemberId(principal);
  const body = await c.req.valid('json')

  const newUser = await createUser({
    createdBy: memberId,
    env: body.env ?? 'playground',
    externalId: body.externalId,
  })

  return c.json(newUser, 201);
})


const userMeRoute = createRoute({
  method: 'get',
  path: '/api/users/me',
  responses: {
    200: response_data(UserSchema),
    404: response_error()
  },
})

app.openapi(userMeRoute, async (c) => {
  const principal = await authn(c.req.raw.headers)
  const user = principal.user;

  if (!user) {
    throw new HTTPException(422, { message: "You must provide an end user token to access this endpoint." });
  }

  await authorize(principal, { action: "end-user:read", user })
  return c.json(user, 200);
})

const publicMeRoute = createRoute({
  method: 'get',
  path: '/api/public/me',
  tags: ['public'],
  responses: {
    200: response_data(UserSchema),
    404: response_error()
  },
})

app.openapi(publicMeRoute, async (c) => {
  const principal = await authnUser(c.req.raw.headers)
  const user = principal.user;

  await authorize(principal, { action: "end-user:read", user })
  return c.json(user, 200);
})

const userGETRoute = createRoute({
  method: 'get',
  path: '/api/users/{id}',
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: response_data(UserSchema),
    404: response_error()
  },
})

app.openapi(userGETRoute, async (c) => {
  const principal = await authn(c.req.raw.headers)

  const { id } = c.req.param()
  requireUUID(id);
  const user = await requireUser({ id })

  await authorize(principal, { action: "end-user:read", user })

  return c.json(user, 200);
})

const userByExternalIdGETRoute = createRoute({
  method: 'get',
  path: '/api/users/by-external-id/{external_id}',
  request: {
    query: z.object({
      env: EnvSchema,
    }),
    params: z.object({
      external_id: z.string(),
    }),
  },
  responses: {
    200: response_data(UserSchema),
    404: response_error()
  },
})

app.openapi(userByExternalIdGETRoute, async (c) => {
  const principal = await authn(c.req.raw.headers)

  const { external_id } = c.req.param()
  const { env } = c.req.valid("query")

  const user = await requireUser({ externalId: external_id, env: env as z.infer<typeof EnvSchema> })

  await authorize(principal, { action: "end-user:read", user })

  return c.json(user, 200);
})

const apiUsersPATCHRoute = createRoute({
  method: 'patch',
  path: '/api/users/{id}',
  request: {
    body: body(UserCreateSchema)
  },
  responses: {
    200: response_data(UserSchema)
  },
})


app.openapi(apiUsersPATCHRoute, async (c) => {
  const principal = await authn(c.req.raw.headers)

  const { id } = c.req.param()
  const user = await requireUser({ id })
  const body = await c.req.valid('json')

  await authorize(principal, { action: "end-user:update", user })

  const [updatedUser] = await db.update(endUsers).set(body).where(eq(endUsers.id, id)).returning();

  return c.json(updatedUser, 200);
})



/**
 * SESSIONS
 */

const DEFAULT_LIMIT = 50
const DEFAULT_PAGE = 1

function getSessionListFilter(params: z.infer<typeof SessionsGetQueryParamsSchema>, principal: Principal) {
  const { agent, env, userId } = params;

  const filters: any[] = []

  if (agent) {
    filters.push(eq(sessions.agent, agent));
  }

  if (principal.type === 'member' || principal.type === 'apiKey') {

    if (!env && !userId) {
      throw new HTTPException(422, { message: "You must set either `env` or `userId` to make this request." });
    }
    if (env && userId) {
      throw new HTTPException(422, { message: "You must set either `env` or `userId`, not both." });
    }
    if (userId && principal.user) {
      throw new HTTPException(422, { message: "You can't set both X-User-Token and userId query param" });
    }

    if (env) { // env
      filters.push(eq(endUsers.env, env));
    }

    if (userId) { // explicit user
      filters.push(eq(endUsers.id, userId));
    }

    if (principal.user) { // "as a user"
      filters.push(eq(endUsers.id, principal.user.id));
    }

    if (env === "playground") {

      if (principal.type === 'member') {
        filters.push(eq(endUsers.createdBy, principal.session.user.id));
      }
      else if (principal.type === 'apiKey') {
        filters.push(eq(endUsers.createdBy, principal.apiKey.userId));
      }
      // else {
      //   throw new HTTPException(401, { message: "`playground` can only be used with provided logged in user id." });
      // }
    }
  }
  else if (principal.type === 'user') {
    filters.push(eq(endUsers.id, principal.user.id));
  }

  return and(...filters);
}

function normalizeNumberParam(value: number | string | undefined, defaultValue: number) {
  let numValue: number;

  if (!value) {
    numValue = defaultValue;
  }
  else if (typeof value === 'string') {
    numValue = parseInt(value);
  }
  else {
    numValue = value;
  }

  return Math.max(numValue, 1);
}

async function getSessions(params: SessionsGetQueryParams, principal: Principal) {
  const limit = normalizeNumberParam(params.limit, DEFAULT_LIMIT);
  const page = normalizeNumberParam(params.page, DEFAULT_PAGE);

  const MAX_LIMIT = 1000;
  if (limit > MAX_LIMIT) {
    throw new HTTPException(422, { message: `Page limit cannot exceed ${MAX_LIMIT}` });
  }

  const offset = (page - 1) * limit;

  // Build base filter
  const baseFilter = getSessionListFilter(params, principal);

  // Handle starred filter - requires joining with starredSessions table
  const isStarred = params.starred === true || params.starred === 'true';
  if (isStarred) {
    if (principal.type === 'user') {
      throw new HTTPException(422, { message: "starred filter is only available for staff users" });
    }
    const memberId = requireMemberId(principal);

    // Get total count for pagination metadata
    const totalCountResult = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(sessions)
      .innerJoin(starredSessions, and(
        eq(starredSessions.sessionId, sessions.id),
        eq(starredSessions.userId, memberId)
      ))
      .leftJoin(endUsers, eq(sessions.userId, endUsers.id))
      .where(baseFilter);

    const totalCount = totalCountResult[0]?.count ?? 0;

    // Get sessions with pagination
    const result = await db
      .select({
        sessions: sessions,
        end_users: endUsers,
      })
      .from(sessions)
      .innerJoin(starredSessions, and(
        eq(starredSessions.sessionId, sessions.id),
        eq(starredSessions.userId, memberId)
      ))
      .leftJoin(endUsers, eq(sessions.userId, endUsers.id))
      .where(baseFilter)
      .orderBy(desc(sessions.updatedAt))
      .limit(limit)
      .offset(offset);

    const sessionsResult = result.map((row) => ({
      id: row.sessions.id,
      handle: row.sessions.handleNumber.toString() + (row.sessions.handleSuffix ?? ""),
      createdAt: row.sessions.createdAt,
      updatedAt: row.sessions.updatedAt,
      metadata: row.sessions.metadata as Record<string, any>,
      agent: row.sessions.agent,
      user: row.end_users!,
      env: row.end_users!.env,
      userId: row.end_users!.id,
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
        totalPages,
        page,
        limit,
        hasNextPage,
        hasPreviousPage,
        currentPageStart,
        currentPageEnd,
      }
    };
  }

  // Regular (non-starred) query
  // Get total count for pagination metadata
  const totalCountResult = await db
    .select({ count: sql<number>`cast(count(*) as integer)` })
    .from(sessions)
    .leftJoin(endUsers, eq(sessions.userId, endUsers.id))
    .where(baseFilter);

  const totalCount = totalCountResult[0]?.count ?? 0;

  // Get sessions with pagination
  const result = await db
    .select()
    .from(sessions)
    .leftJoin(endUsers, eq(sessions.userId, endUsers.id))
    .where(baseFilter)
    .orderBy(desc(sessions.updatedAt))
    .limit(limit)
    .offset(offset);

  const sessionsResult = result.map((row) => ({
    id: row.sessions.id,
    handle: row.sessions.handleNumber.toString() + (row.sessions.handleSuffix ?? ""),
    createdAt: row.sessions.createdAt,
    updatedAt: row.sessions.updatedAt,
    metadata: row.sessions.metadata as Record<string, any>,
    agent: row.sessions.agent,
    user: row.end_users!,
    env: row.end_users!.env,
    userId: row.end_users!.id,
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
      totalPages,
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
  const params = c.req.valid("query");
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
  const principal = await authnUser(c.req.raw.headers)
  const params = c.req.valid("query");
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
  const memberPrincipal = requireMemberPrincipal(principal);

  const { granular = false, ...params } = c.req.valid("query");

  const result = await db
    .select({
      unreadSessions: countDistinct(inboxItems.sessionId),
    })
    .from(inboxItems)
    .leftJoin(sessions, eq(inboxItems.sessionId, sessions.id))
    .leftJoin(endUsers, eq(sessions.userId, endUsers.id))
    .where(
      and(
        eq(inboxItems.userId, memberPrincipal.session.user.id),
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
        user: true,
        inboxItems: {
          where: eq(inboxItems.userId, memberPrincipal.session.user.id),
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
      session_id: z.string(),
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
  // requireUUID(session_id);

  const session = await requireSession(session_id);

  await authorize(principal, { action: "end-user:read", user: session.user });
  return c.json(session, 200);
})

const sessionPATCHRoute = createRoute({
  method: 'patch',
  path: '/api/sessions/{session_id}',
  request: {
    params: z.object({
      session_id: z.string(),
    }),
    body: body(SessionUpdateSchema),
  },
  responses: {
    200: response_data(SessionWithCollaborationSchema),
    401: response_error(),
    404: response_error(),
    422: response_error(),
  },
})

app.openapi(sessionPATCHRoute, async (c) => {
  const principal = await authn(c.req.raw.headers)
  const { session_id } = c.req.param()
  // requireUUID(session_id);

  const body = await c.req.valid('json')
  const session = await requireSession(session_id);
  authorize(principal, { action: "end-user:update", user: session.user });

  const config = await requireConfig()
  const agentConfig = await requireAgentConfig(config, session.agent)

  const metadata = parseMetadata(agentConfig.metadata, agentConfig.allowUnknownMetadata ?? true, body.metadata, session.metadata);


  await db.update(sessions).set({
    metadata,
    updatedAt: new Date().toISOString(),
  }).where(eq(sessions.id, session_id));

  const updatedSession = await requireSession(session_id);
  return c.json(updatedSession, 200);
})

// Star a session
const sessionStarPUTRoute = createRoute({
  method: 'put',
  path: '/api/sessions/{session_id}/star',
  request: {
    params: z.object({
      session_id: z.string(),
    }),
  },
  responses: {
    200: response_data(z.object({ starred: z.boolean() })),
    401: response_error(),
    404: response_error(),
  },
})

app.openapi(sessionStarPUTRoute, async (c) => {
  const principal = await authn(c.req.raw.headers)
  const { session_id } = c.req.param()

  const memberId = requireMemberId(principal);
  const session = await requireSession(session_id);
  authorize(principal, { action: "end-user:read", user: session.user });

  await db.insert(starredSessions).values({
    userId: memberId,
    sessionId: session_id,
  }).onConflictDoNothing();

  return c.json({ starred: true }, 200);
})

// Unstar a session
const sessionStarDELETERoute = createRoute({
  method: 'delete',
  path: '/api/sessions/{session_id}/star',
  request: {
    params: z.object({
      session_id: z.string(),
    }),
  },
  responses: {
    200: response_data(z.object({ starred: z.boolean() })),
    401: response_error(),
    404: response_error(),
  },
})

app.openapi(sessionStarDELETERoute, async (c) => {
  const principal = await authn(c.req.raw.headers)
  const { session_id } = c.req.param()

  const memberId = requireMemberId(principal);
  const session = await requireSession(session_id);
  authorize(principal, { action: "end-user:read", user: session.user });

  await db.delete(starredSessions).where(
    and(
      eq(starredSessions.userId, memberId),
      eq(starredSessions.sessionId, session_id)
    )
  );

  return c.json({ starred: false }, 200);
})

// Check if session is starred
const sessionStarGETRoute = createRoute({
  method: 'get',
  path: '/api/sessions/{session_id}/star',
  request: {
    params: z.object({
      session_id: z.string(),
    }),
  },
  responses: {
    200: response_data(z.object({ starred: z.boolean() })),
    401: response_error(),
    404: response_error(),
  },
})

app.openapi(sessionStarGETRoute, async (c) => {
  const principal = await authn(c.req.raw.headers)
  const { session_id } = c.req.param()

  const memberId = requireMemberId(principal);
  const session = await requireSession(session_id);
  authorize(principal, { action: "end-user:read", user: session.user });

  const star = await db.query.starredSessions.findFirst({
    where: and(
      eq(starredSessions.userId, memberId),
      eq(starredSessions.sessionId, session_id)
    )
  });

  return c.json({ starred: !!star }, 200);
})

const publicSessionGETRoute = createRoute({
  method: 'get',
  path: '/api/public/sessions/{session_id}',
  tags: ['public'],
  request: {
    params: z.object({
      session_id: z.string(),
    }),
  },
  responses: {
    200: response_data(SessionSchema),
    404: response_error()
  },
})

app.openapi(publicSessionGETRoute, async (c) => {
  const principal = await authnUser(c.req.raw.headers)

  const { session_id } = c.req.param()
  requireUUID(session_id);

  const session = await requireSession(session_id);
  authorize(principal, { action: "end-user:read", user: session.user });

  const sessionWithoutCollaboration = {
    ...session,
    runs: session.runs.map((run) => ({
      ...run,
      items: run.sessionItems.map(({ commentMessages, scores, ...item }) => ({
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
    422: response_error()
  },
})

app.openapi(sessionsPOSTRoute, async (c) => {
  const principal = await authn(c.req.raw.headers)

  const body = await c.req.valid('json')

  const config = await requireConfig()
  const agentConfig = await requireAgentConfig(config, body.agent)

  const memberId = requireMemberId(principal);

  // find user or create new one if not found
  const user = await (async () => {
    if (body.userId) {
      return await requireUser({ id: body.userId });
    }

    // if (body.userExternalId) {
    //   return await requireUser({ externalId: body.userExternalId, env: body.env as z.infer<typeof EnvSchema> });
    // }

    if (principal.user) {
      return principal.user;
    }

    // We must create user, for that env must be defined
    if (!body.env) {
      throw new HTTPException(422, { message: "You must provide 'env' parameter, since you didn't provide 'userId' nor 'X-User-Token'." });
    }

    authorize(principal, { action: "end-user:create" });

    return await createUser({ createdBy: memberId, env: body.env as z.infer<typeof EnvSchema> }) // default user doesn't have external id, it's just empty
  })()

  authorize(principal, { action: "end-user:update", user });

  /**
   * METADATA
   */
  const metadata = parseMetadata(agentConfig.metadata, agentConfig.allowUnknownMetadata, body.metadata ?? {}, {});

  const newSession = await db.transaction(async (tx) => {
    const handleSuffix = user.createdBy ? "s" : "";

    const sessionWithHighestHandleNumber = await tx.query.sessions.findFirst({
      orderBy: (sessions, { desc }) => [desc(sessions.handleNumber)],
      where: eq(sessions.handleSuffix, handleSuffix),
    });

    const newHandleNumber = sessionWithHighestHandleNumber ? sessionWithHighestHandleNumber.handleNumber + 1 : 1;

    const [newSessionRow] = await tx.insert(sessions).values({
      handleNumber: newHandleNumber,
      handleSuffix: handleSuffix,
      metadata: metadata,
      agent: body.agent,
      userId: user.id
    }).returning();

    // add event (only for users, not endUsers)
    const [event] = await tx.insert(events).values({
      type: 'session_created',
      authorId: memberId,
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


// watches session and its last run changes
async function* watchSession(initSession: Session) {
  yield {
    event: 'session.snapshot',
    data: initSession
  }

  let prevLastRun = getLastRun(initSession);

  while (true) {
    const session = await requireSession(initSession.id)
    const lastRun = getLastRun(session)

    if (lastRun) {
      const hasNewRun = prevLastRun?.id !== lastRun.id;

      // current run changed
      if (hasNewRun) {

        // if previous last run existed and it's not in session.runs now it means it is both failed & not active -> therefore archived. 
        if (prevLastRun && !session.runs.find(r => r.id === prevLastRun?.id)) {
          yield {
            event: 'run.archived',
            data: {
              id: prevLastRun.id,
            },
          }
        }

        yield {
          event: 'run.created',
          data: lastRun,
        }

        prevLastRun = lastRun;
      }
      else {
        const changedFields: Partial<typeof lastRun> = {};

        const newItems = lastRun.sessionItems.filter(i => !prevLastRun?.sessionItems.find(i2 => i2.id === i.id))

        if (newItems.length > 0) {
          changedFields.sessionItems = newItems;
        }

        const runFieldsToCompare = ['id', 'status', 'finishedAt', 'failReason', 'metadata'] as const;

        for (const field of runFieldsToCompare) {
          if (JSON.stringify(prevLastRun![field] ?? null) !== JSON.stringify(lastRun[field] ?? null)) {
            changedFields[field] = lastRun[field];
          }
        }

        if (Object.keys(changedFields).length > 0) {
          yield {
            event: 'run.updated',
            data: {
              id: lastRun.id,
              ...changedFields,
            },
          };
        }
      }

      prevLastRun = lastRun;
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

const sessionWatchRoute = createRoute({
  method: 'get',
  path: '/api/sessions/{session_id}/watch',
  request: {
    params: z.object({
      session_id: z.string(),
    }),
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
});


app.openapi(sessionWatchRoute, async (c) => {
  const principal = await authn(c.req.raw.headers);

  const { session_id } = c.req.param()
  const session = await requireSession(session_id)

  authorize(principal, { action: "end-user:read", user: session.user });

  const generator = watchSession(session);

  let running = true;

  // @ts-ignore
  c.env.incoming.on('aborted', () => {
    if (!running) return;
    running = false;
    generator.return();
    // console.log(`[session ${session.handle} watch] aborted`)
  });

  // @ts-ignore
  c.env.incoming.on('close', () => {
    if (!running) return;
    running = false;
    generator.return();
    // console.log(`[session ${session.handle} watch] closed`)
  });

  // console.log(`[session ${session.handle} watch] start`)

  // TODO: heartbeat
  return streamSSE(c, async (stream) => {
    for await (const event of generator) {
      if (!running) return;

      // console.log(`[session ${session.handle} watch] event: ${event.event}`);
      await stream.writeSSE({
        data: JSON.stringify(event.data),
        event: event.event,
      });
    }
  });

  // return streamSSE(c, async (stream) => {
  //   let running = true;
  //   stream.onAbort(() => {
  //     running = false;
  //   });

  //   // let's start with sending full run snapshot
  //   await stream.writeSSE({
  //     data: JSON.stringify(lastRun ?? null),
  //     event: 'run.snapshot',
  //   });

  //   // close stream for runs that are not in_progress
  //   if (lastRun?.status !== 'in_progress') {
  //     return;
  //   }

  //   let previousRun = lastRun;

  //   /**
  //    * POLLING HERE
  //    * Soon we'll need to create a proper messaging, when some LLM API will be streaming characters then even NOTIFY/LISTEN won't make it performance-wise.
  //    */
  //   while (running) {
  //     const session = await requireSession(session_id)
  //     const lastRun = getLastRun(session)

  //     if (!lastRun) {
  //       throw new Error('unreachable');
  //     }

  //     // check for new items
  //     const items = lastRun.items
  //     const freshItems = items.filter(i => !previousRun.items.find(i2 => i2.id === i.id))

  //     for (const item of freshItems) {
  //       await stream.writeSSE({
  //         data: JSON.stringify(item),
  //         event: 'item.created',
  //       });
  //     }

  //     previousRun = {
  //       ...previousRun,
  //       items: [...previousRun.items, ...freshItems],
  //     }

  //     // check for state change
  //     const runFieldsToCompare = ['id', 'createdAt', 'finishedAt', 'sessionId', 'versionId', 'status', 'failReason', 'version', 'metadata'] as const;
  //     const changedFields: Partial<typeof lastRun> = {};

  //     for (const field of runFieldsToCompare) {
  //       if (JSON.stringify(previousRun[field]) !== JSON.stringify(lastRun[field])) {
  //         changedFields[field] = lastRun[field];
  //       }
  //     }

  //     if (Object.keys(changedFields).length > 0) {
  //       await stream.writeSSE({
  //         data: JSON.stringify(changedFields),
  //         event: 'run.state',
  //       });

  //       // Update previousRun with the new values (excluding sessionItems)
  //       previousRun = {
  //         ...previousRun,
  //         ...changedFields,
  //       };
  //     }

  //     // End if run is no longer in_progress
  //     if (lastRun?.status !== 'in_progress') {
  //       break;
  //     }

  //     // Wait 1s before next poll
  //     await new Promise(resolve => setTimeout(resolve, 1000));
  //   }
  // });
});


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
  const principal = await authn(c.req.raw.headers)
  const userPrincipal = requireMemberPrincipal(principal);

  const { sessionId } = c.req.param()

  await db.update(inboxItems).set({
    lastReadEventId: sql`${inboxItems.lastNotifiableEventId}`,
    updatedAt: new Date().toISOString(),
  }).where(and(
    eq(inboxItems.userId, userPrincipal.session.user.id),
    eq(inboxItems.sessionId, sessionId),
    isNull(inboxItems.sessionItemId),
  ))

  return c.json({}, 200);
})


/* --------- RUNS --------- */


type ParsedVersion = {
  major: number;
  minor: number;
  patch: number;
  suffix?: string;
};

function parseVersion(version: string): ParsedVersion | undefined {
  // Accept version strings like '1.2.3', 'v1.2.3', '1', '1.2', possibly with suffixes like '-beta', '-alpha.1'
  // Normalize: '1' -> '1.0.0', '1.2' -> '1.2.0'
  const m = version.match(/^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:-(.+))?$/);
  if (!m) return undefined;

  const major = Number(m[1]);
  const minor = m[2] !== undefined ? Number(m[2]) : 0;
  const patch = m[3] !== undefined ? Number(m[3]) : 0;
  const suffix = m[4];

  if (Number.isNaN(major) || Number.isNaN(minor) || Number.isNaN(patch)) return undefined;

  return { major, minor, patch, ...(suffix ? { suffix } : {}) };
}

function compareVersions(v1: ParsedVersion, v2: ParsedVersion): number {
  // Returns: -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
  // Note: Suffixes are ignored for comparison purposes
  if (v1.major !== v2.major) return v1.major < v2.major ? -1 : 1;
  if (v1.minor !== v2.minor) return v1.minor < v2.minor ? -1 : 1;
  if (v1.patch !== v2.patch) return v1.patch < v2.patch ? -1 : 1;
  return 0;
}


/**
 * We process each item one by one. We don't think of consecutive ones in the loop.
 * 
 * - !validateSteps -> we allow any item. Only need to check the last one for "output" if "complete" and it works.
 * - validateSteps=true -> each item must be either STEP or OUTPUT. If last item is OUTPUT, then any next item is ERROR.
 * 
 * - new item shows up
 * - if !validateSteps -> always insert
 * - if validateSteps -> check if it's step or output. If not, then error.
 * -    if step -> insert
 * -    if output -> 
 * 
 * 
 * If validation is on -> if the last item *output* but not *step* -> error.
 * 
 * 
 * if !validateSteps -> anything is allowed. Only if "completed" -> validate last item "as an extra"
 * if validateSteps -> 
 * - if "completed" ->  
 * 
 * 
 * INPUT KNOWLEDGE:
 * - previous run was in_progress
 * - we don't know whether it had validation or not (we can't make such assumption). If it didn't it might have complete garbage, multiple output items etc.
 * - we know whether we want validation *NOW*
 * 
 */


function validateNonInputItems(runConfig: BaseRunConfig, previousRunItems: any[], items: any[], status: 'in_progress' | 'completed' | 'cancelled' | 'failed') {
  const validateSteps = runConfig.validateSteps ?? false;

  const parsedItems: any[] = [];

  const validateStepItems = (stepItems: any[]) => {
    for (const stepItem of stepItems) {
      const stepItemConfig = findItemConfig(runConfig, [...previousRunItems, ...parsedItems], stepItem, [], "step");
      if (stepItemConfig) {
        parsedItems.push(stepItemConfig.content);
      }
      else if (!validateSteps) {
        parsedItems.push(stepItem);
      }
      else {
        throw new AgentViewError("Couldn't find a matching step item.", 422, { item: stepItem });
      }
    }
  }

  if (status === "completed") { // last item must exist and must be output
    if (items.length === 0) {
      if (previousRunItems.length <= 1) {
        throw new AgentViewError("Run set as 'completed' must have at least 2 items, input and output.", 422);
      }

      // when completing run without items, we only validate the last item against output schema
      const lastItemOutputConfig = findItemConfig(runConfig, previousRunItems.slice(0, -1), previousRunItems[previousRunItems.length - 1], [], "output");

      if (!lastItemOutputConfig) {
        throw new AgentViewError("Last item must be an output.", 422, { item: previousRunItems[previousRunItems.length - 1] });
      }
    }
    else {

      const outputItem = items[items.length - 1];

      validateStepItems(items.slice(0, -1));
  
      const outputItemConfig = findItemConfig(runConfig, [...previousRunItems, ...parsedItems], outputItem, [], "output");
      if (!outputItemConfig) {
        throw new AgentViewError("Couldn't find a matching output item.", 422, { item: outputItem });
      }
      else {
        parsedItems.push(outputItemConfig.content);
      }
    }

  }
  else if (status === "failed" || status === "cancelled") { // last item, if exists, should be either step or output
    if (items.length === 0) {
      validateStepItems(items);
    }
    else {
      const lastItem = items[items.length - 1];
      validateStepItems(items.slice(0, -1));

      // last item must be either step or output. We first try to match step, if not successful then output
      const lastItemStepConfig = findItemConfig(runConfig, [...previousRunItems, ...parsedItems], lastItem, [], "step");
      const lastItemOutputConfig = findItemConfig(runConfig, [...previousRunItems, ...parsedItems], lastItem, [], "output");

      if (lastItemStepConfig) {
        parsedItems.push(lastItemStepConfig.content);
      }
      else if (lastItemOutputConfig) {
        parsedItems.push(lastItemOutputConfig.content);
      }
      else if (!validateSteps) {
        // we don't validate steps, so if no match, then we assume it's unknown step
        parsedItems.push(lastItem);
      }
      else {
        throw new AgentViewError("Last item must be either step or output.", 422, { item: lastItem });
      }
    }
  }
  else if (status === "in_progress") {
    validateStepItems(items);
  }
  
  return parsedItems;
}


const runsPOSTRoute = createRoute({
  method: 'post',
  path: '/api/runs',
  request: {
    body: body(RunCreateSchema)
  },
  responses: {
    201: response_data(RunSchema),
    400: response_error(),
    404: response_error()
  },
})

const DEFAULT_IDLE_TIME = 1000 * 60; // 60 seconds

app.openapi(runsPOSTRoute, async (c) => {
  const principal = await authn(c.req.raw.headers)
  const body = await c.req.valid('json')
  const session = await requireSession(body.sessionId);

  authorize(principal, { action: "end-user:update", user: session.user });

  const config = await requireConfig()
  const agentConfig = requireAgentConfig(config, session.agent)

  const lastRun = getLastRun(session)

  /** Only one in_progress run is allowed per session **/
  if (lastRun?.status === 'in_progress') {
    throw new HTTPException(422, { message: `Can't create a run because session has already a run in progress.` });
  }

  /** Version compatibility checking **/
  const parsedVersion = parseVersion(body.version);
  if (!parsedVersion) {
    throw new HTTPException(422, { message: "Invalid version number format. Should be like '1.2.3-xxx'" });
  }

  console.log('session.user.createdBy', session.user.createdBy);
  console.log('parsedVersion', parsedVersion);
  if (!session.user.createdBy && parsedVersion.suffix) { // production sessions can't have suffixes
    throw new HTTPException(422, { message: "Production sessions can't have suffixed versions." });
  }

  if (lastRun?.version) { // compare semantic versions when previous version exists
    const lastVersionParsed = parseVersion(lastRun.version.version);
    if (!lastVersionParsed) {
      throw new HTTPException(422, { message: "Invalid version format in previous run." });
    }

    // Major version must match (major version changes are breaking)
    if (lastVersionParsed.major !== parsedVersion.major) {
      throw new HTTPException(422, { message: "Cannot continue a session with a different major version." });
    }

    // Current version must be >= last version (minor and patch upgrades are backward-compatible)
    const comparison = compareVersions(parsedVersion, lastVersionParsed);
    if (comparison < 0) {
      throw new HTTPException(422, { message: "Cannot continue a session with an older version." });
    }
  }

  /** Validate input item **/
  if (body.items.length === 0) {
    throw new AgentViewError("New run must have at least 1 item, input.", 422);
  }
  const [inputItem, ...nonInputItems] = body.items;

  const runConfig = requireRunConfig(agentConfig, inputItem);

  const parsedInput = [runConfig.input.schema.parse(inputItem)] // must be true, because of line above

  /** Validate rest items **/
  const parsedNonInputItems = validateNonInputItems(runConfig, [parsedInput], nonInputItems, body.status ?? 'in_progress');

  const parsedItems = [...parsedInput, ...parsedNonInputItems];

  /** Metadata **/
  const metadata = parseMetadata(runConfig.metadata, runConfig.allowUnknownMetadata ?? true, body.metadata ?? {}, {})

  /** STATUS, FINISHED_AT, FAIL_REASON */
  const status = body.status ?? 'in_progress';
  const failReason = body.failReason ?? null;

  if (failReason && status !== 'failed') {
    throw new AgentViewError("failReason can only be set when status is 'failed'.", 422);
  }

  const isFinished = status === 'completed' || status === 'cancelled' || status === 'failed';
  const finishedAt = isFinished ? new Date().toISOString() : null;
  const idleTimeout = runConfig.idleTimeout ?? DEFAULT_IDLE_TIME;
  const expiresAt = isFinished ? null : new Date(Date.now() + idleTimeout).toISOString();

  // Create run and items
  await db.transaction(async (tx) => {
    await db.insert(versions).values({
      version: body.version,
    }).onConflictDoNothing();

    const [versionRow] = await tx.select().from(versions).where(eq(versions.version, body.version)).limit(1);

    const [newRun] = await tx.insert(runs).values({
      sessionId: body.sessionId,
      status,
      failReason,
      expiresAt,
      finishedAt,
      versionId: versionRow.id,
      metadata,
    }).returning();

    await tx.insert(sessionItems).values(
      parsedItems.map(item => ({
        sessionId: body.sessionId,
        content: item,
        runId: newRun.id,
      }))
    ).returning();

    // insert state item
    if (body.state !== undefined) {
      await tx.insert(sessionItems).values({
        sessionId: body.sessionId,
        content: body.state,
        runId: newRun.id,
        isState: true,
      })
    }
  });

  const updatedSession = await requireSession(body.sessionId);
  const newRun = getLastRun(updatedSession)!;

  return c.json(newRun, 201);
})




const runPATCHRoute = createRoute({
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

app.openapi(runPATCHRoute, async (c) => {
  const principal = await authn(c.req.raw.headers)

  const { run_id } = c.req.param()
  requireUUID(run_id);

  const body = await c.req.valid('json')

  const run = await requireRun(run_id);
  const session = await requireSession(run.sessionId);

  authorize(principal, { action: "end-user:update", user: session.user });

  console.log('run patch')

  const config = await requireConfig()
  const agentConfig = requireAgentConfig(config, session.agent)

  /** Find matching run **/
  const inputItem = run.sessionItems[0].content;

  console.log('inputItem: ', inputItem);

  const runConfig = requireRunConfig(agentConfig, inputItem);

  /** Validate items */
  const items = body.items ?? [];

  if (items.length > 0 && run.status !== 'in_progress') {
    throw new AgentViewError("Cannot add items to a finished run.", 422);
  }

  const parsedItems = validateNonInputItems(runConfig, run.sessionItems.map(sessionItem => sessionItem.content), items, body.status ?? 'in_progress');

  /** State */
  if (body.state !== undefined && run.status !== 'in_progress') {
    throw new AgentViewError("Cannot set state to a finished run.", 422);
  }

  /** Metadata **/
  const metadata = parseMetadata(runConfig.metadata, runConfig.allowUnknownMetadata ?? true, body.metadata ?? {}, run.metadata ?? {});

  /** Status, finished at, failReason */
  if (run.status !== 'in_progress' && body.status && body.status !== run.status) {
    throw new AgentViewError("Cannot change the status of a finished run.", 422);
  }

  const status = body.status ?? 'in_progress';
  const failReason = body.failReason ?? null;

  if (failReason) {
    if (run.status !== 'in_progress') {
      throw new AgentViewError("failReason cannot be set for a finished run.", 422);
    }
    else if (status !== 'failed') {
      throw new AgentViewError("failReason can only be set when changing status to 'failed'.", 422);
    }
  }

  const isFinished = status === 'completed' || status === 'failed' || status === 'cancelled';
  const finishedAt = run.finishedAt ?? (isFinished ? new Date().toISOString() : null);
  const idleTimeout = runConfig.idleTimeout ?? DEFAULT_IDLE_TIME;
  const expiresAt = isFinished ? null : new Date(Date.now() + idleTimeout).toISOString();

  await db.transaction(async (tx) => {
    if (parsedItems.length > 0) {
      await tx.insert(sessionItems).values(
        parsedItems?.map(item => ({
          sessionId: session.id,
          content: item,
          runId: run.id
        }))
      );
    }

    await tx.update(runs).set({
      status,
      metadata,
      failReason,
      finishedAt,
      expiresAt
    }).where(eq(runs.id, run.id));

    if (body.state !== undefined) {
      await tx.insert(sessionItems).values({
        sessionId: session.id,
        content: body.state,
        runId: run.id,
        isState: true,
      })
    }
  });

  const updatedSession = await requireSession(session.id);
  const newRun = getLastRun(updatedSession)!;

  return c.json(newRun, 201);
})

const runKeepAliveRoute = createRoute({
  method: 'post',
  path: '/api/runs/{run_id}/keep-alive',
  responses: {
    200: response_data(z.object({ expiresAt: z.string().nullable() })),
    400: response_error(),
    404: response_error()
  },
})

app.openapi(runKeepAliveRoute, async (c) => {
  const principal = await authn(c.req.raw.headers)

  const { run_id } = c.req.param()
  requireUUID(run_id);

  const run = await requireRun(run_id);
  const session = await requireSession(run.sessionId);

  authorize(principal, { action: "end-user:update", user: session.user });

  const config = await requireConfig();
  const agentConfig = requireAgentConfig(config, session.agent);
  const inputItem = run.sessionItems[0].content;
  const runConfig = requireRunConfig(agentConfig, inputItem);

  const status = run.status;
  const isFinished = status === 'completed' || status === 'failed' || status === 'cancelled';
  const idleTimeout = runConfig.idleTimeout ?? DEFAULT_IDLE_TIME;
  const expiresAt = isFinished ? null : new Date(Date.now() + idleTimeout).toISOString();

  await db.update(runs).set({
    status,
    expiresAt
  }).where(eq(runs.id, run.id));

  return c.json({
    expiresAt
  }, 200);
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
  const principal = await authn(c.req.raw.headers);

  const { run_id } = c.req.param()
  const run = await requireRun(run_id)
  const session_id = run.sessionId;
  const session = await requireSession(session_id)

  authorize(principal, { action: "end-user:read", user: session.user });

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
      const session = await requireSession(session_id)
      const lastRun = getLastRun(session)

      if (!lastRun) {
        throw new Error('unreachable');
      }

      // check for new items
      const items = lastRun.sessionItems
      const freshItems = items.filter(i => !previousRun.sessionItems.find(i2 => i2.id === i.id))

      for (const item of freshItems) {
        await stream.writeSSE({
          data: JSON.stringify(item),
          event: 'item.created',
        });
      }

      previousRun = {
        ...previousRun,
        sessionItems: [...previousRun.sessionItems, ...freshItems],
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
  const principal = await authn(c.req.raw.headers)
  const userPrincipal = requireMemberPrincipal(principal);

  const { sessionId, itemId } = c.req.param()

  await db.update(inboxItems).set({
    lastReadEventId: sql`${inboxItems.lastNotifiableEventId}`,
    updatedAt: new Date().toISOString(),
  }).where(and(
    eq(inboxItems.userId, userPrincipal.session.user.id),
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
  const principal = await authn(c.req.raw.headers)
  const userPrincipal = requireMemberPrincipal(principal);

  const body = await c.req.valid('json')
  const { sessionId, itemId } = c.req.param()

  const session = await requireSession(sessionId)
  const item = await requireSessionItem(session, itemId);

  await db.transaction(async (tx) => {
    await createComment(tx, session, item, userPrincipal.session.user, body.comment ?? null);
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
  const principal = await authn(c.req.raw.headers)
  const userPrincipal = requireMemberPrincipal(principal);

  const { commentId, sessionId, itemId } = c.req.param()
  const session = await requireSession(sessionId)
  const item = await requireSessionItem(session, itemId);
  const commentMessage = await requireCommentMessageFromUser(item, commentId, userPrincipal.session.user);

  await db.transaction(async (tx) => {
    await deleteComment(tx, session, item, commentMessage.id, userPrincipal.session.user);
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
  const principal = await authn(c.req.raw.headers)
  const userPrincipal = requireMemberPrincipal(principal);

  const { sessionId, itemId, commentId } = c.req.param()
  const body = await c.req.valid('json')

  const session = await requireSession(sessionId)
  const item = await requireSessionItem(session, itemId)
  const commentMessage = await requireCommentMessageFromUser(item, commentId, userPrincipal.session.user);

  await db.transaction(async (tx) => {
    try {
      await updateComment(tx, session, item, commentMessage, body.comment ?? null);
    } catch (error) {
      return c.json({ message: `Invalid mention format: ${(error as Error).message}` }, 422);
    }
  });

  return c.json({}, 200);
})


/* --------- SCORES --------- */


// Scores GET (get all scores for an item)
// const scoresGETRoute = createRoute({
//   method: 'get',
//   path: '/api/sessions/{sessionId}/items/{itemId}/scores',
//   request: {
//     params: z.object({
//       sessionId: z.string(),
//       itemId: z.string(),
//     }),
//   },
//   responses: {
//     200: response_data(z.array(z.object({
//       name: z.string(),
//       value: z.any()
//     }))),
//     401: response_error(),
//     404: response_error(),
//   },
// })

// app.openapi(scoresGETRoute, async (c) => {
//   const principal = await authn(c.req.raw.headers)
//   const userPrincipal = requireMemberPrincipal(principal);

//   const { sessionId, itemId } = c.req.param()

//   const session = await requireSession(sessionId)
//   const item = await requireSessionItem(session, itemId);

//   // Get all scores for this item created by the current user
//   const itemScores = await db.query.scores.findMany({
//     where: and(
//       eq(scores.sessionItemId, itemId),
//       eq(scores.createdBy, userPrincipal.session.user.id),
//       isNull(scores.deletedAt)
//     )
//   });

//   // Convert to array format
//   const scoresArray = itemScores.map(score => ({
//     name: score.name,
//     value: score.value
//   }));

//   return c.json(scoresArray, 200);
// })


// Scores PATCH (create or update scores for an item)
const scoresPATCHRoute = createRoute({
  method: 'patch',
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

app.openapi(scoresPATCHRoute, async (c) => {
  const principal = await authn(c.req.raw.headers)
  const userPrincipal = requireMemberPrincipal(principal);

  const { sessionId, itemId } = c.req.param()
  const inputScores = await c.req.valid('json');

  const config = await requireConfig()
  const session = await requireSession(sessionId)
  const item = await requireSessionItem(session, itemId);
  const run = session.runs.find(r => r.id === item.runId)!

  const agentConfig = requireAgentConfig(config, session.agent);
  const runConfig = requireRunConfig(agentConfig, run.sessionItems[0].content);
  const itemConfig = requireItemConfig(runConfig, run.sessionItems, item.id).itemConfig;

  await db.transaction(async (tx) => {
    for (const score of inputScores) {
      const { name, value } = score;

      const scoreConfig = requireScoreConfig(itemConfig, name);

      // Check if score already exists for this user
      const existingScore = await tx.query.scores.findFirst({
        where: and(
          eq(scores.sessionItemId, itemId),
          eq(scores.name, name),
          eq(scores.createdBy, userPrincipal.session.user.id),
          isNull(scores.deletedAt)
        )
      });

      // delete
      if (value === null || value === undefined) {
        if (existingScore) {
          await deleteComment(tx, session, item, existingScore.commentId, userPrincipal.session.user);
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
          const commentMessage = await createComment(tx, session, item, userPrincipal.session.user, null);
          await tx.insert(scores).values({
            sessionItemId: itemId,
            name,
            value,
            commentId: commentMessage.id,
            createdBy: userPrincipal.session.user.id,
          });
        }
      }
    }
  });

  return c.json({}, 200);
})


/* --------- USERS --------- */


// Members GET (list all users)
const membersGETRoute = createRoute({
  method: 'get',
  path: '/api/members',
  responses: {
    200: response_data(z.array(MemberSchema)),
    401: response_error(),
  },
})

app.openapi(membersGETRoute, async (c) => {
  const principal = await authn(c.req.raw.headers)
  const userPrincipal = requireMemberPrincipal(principal);

  const members = await db.select().from(users);

  return c.json(members.map((member) => ({
    id: member.id,
    email: member.email,
    name: member.name,
    role: member.role ?? "user",
    image: member.image ?? null,
    createdAt: member.createdAt,
  })), 200);
})

// Member POST (update role)
const memberPOSTRoute = createRoute({
  method: 'post',
  path: '/api/members/{memberId}',
  request: {
    params: z.object({
      memberId: z.string(),
    }),
    body: body(MemberUpdateSchema)
  },
  responses: {
    200: response_data(z.object({})),
    400: response_error(),
    401: response_error(),
    404: response_error(),
  },
})

app.openapi(memberPOSTRoute, async (c) => {
  const principal = await authn(c.req.raw.headers)
  authorize(principal, { action: "admin" });

  const { memberId } = c.req.param()
  const body = await c.req.valid('json')

  await auth.api.setRole({
    headers: c.req.raw.headers,
    body: { userId: memberId, role: body.role },
  });

  return c.json({}, 200);
})

// User DELETE (delete user)
const memberDELETERoute = createRoute({
  method: 'delete',
  path: '/api/members/{memberId}',
  request: {
    params: z.object({
      memberId: z.string(),
    }),
  },
  responses: {
    200: response_data(z.object({})),
    400: response_error(),
    401: response_error(),
    404: response_error(),
  },
})

app.openapi(memberDELETERoute, async (c) => {
  const principal = await authn(c.req.raw.headers)
  authorize(principal, { action: "admin" });

  const { memberId } = c.req.param()

  await auth.api.removeUser({
    headers: c.req.raw.headers,
    body: { userId: memberId },
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
  const principal = await authn(c.req.raw.headers)
  authorize(principal, { action: "admin" });

  const inviterId = requireMemberId(principal);

  const body = await c.req.valid('json')

  await createInvitation(body.email, body.role, inviterId);

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
  const principal = await authn(c.req.raw.headers)
  authorize(principal, { action: "admin" });

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
  const principal = await authn(c.req.raw.headers)
  authorize(principal, { action: "admin" });

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
  const principal = await authn(c.req.raw.headers)
  authorize(principal, { action: "admin" });

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
  const principal = await authn(c.req.raw.headers)
  authorize(principal, { action: "admin" });

  const { id } = c.req.param()
  const emailRow = await db.query.emails.findFirst({ where: eq(emails.id, id) })
  return c.json(emailRow, 200)
})

/* --------- SCHEMAS ---------   */

const configGETRoute = createRoute({
  method: 'get',
  path: '/api/config',
  responses: {
    200: response_data(ConfigSchema.nullable()),
  },
})

app.openapi(configGETRoute, async (c) => {
  const principal = await authn(c.req.raw.headers)
  authorize(principal, { action: "config" });

  const configRow = await getConfigRow();
  return c.json(configRow, 200)
})

const configPutRoute = createRoute({
  method: 'put',
  path: '/api/config',
  request: {
    body: body(ConfigCreateSchema)
  },
  responses: {
    200: response_data(ConfigSchema),
    422: response_error(),
  },
})

app.openapi(configPutRoute, async (c) => {
  const principal = await authn(c.req.raw.headers)

  authorize(principal, { action: "config" });
  const userId = requireMemberId(principal);

  const body = await c.req.valid('json')
  const configRow = await getConfigRow()

  // validate & parse body.config
  const { data, success, error } = BaseConfigSchema.safeParse(body.config)
  if (!success) {
    return c.json({ message: "Invalid config", code: 'parse.schema', details: error.issues }, 422);
  }

  // @ts-ignore
  if (configRow && equalJSON(configRow.config, data)) {
    return c.json(configRow, 200)
  }

  console.log('Updating config!');

  const [newConfigRow] = await db.insert(configs).values({
    config: data,
    createdBy: userId,
  }).returning()

  return c.json(newConfigRow, 200)
})


/* --------- IS ACTIVE --------- */

const healthRoute = createRoute({
  method: 'get',
  path: '/api/health',
  responses: {
    200: response_data(z.object({
      status: z.literal("ok"),
      is_active: z.boolean(),
    })),
  },
})

app.openapi(healthRoute, async (c) => {
  const hasUsers = await getTotalMemberCount() > 0;
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
