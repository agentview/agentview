import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { and, desc, eq, sql } from 'drizzle-orm';
import { authn, authorize } from '../authMiddleware';
import { withOrg } from '../withOrg';
import { channels, channelMessages, environments } from '../schemas/schema';
import { response_data, response_error } from '../hono_utils';
import { BaseConfigSchemaToZod } from 'agentview/configUtils';

export const channelsApp = new OpenAPIHono();

// --- Helpers ---

function normalizeNumberParam(value: number | string | undefined, defaultValue: number) {
  let numValue: number;

  if (!value) {
    numValue = defaultValue;
  } else if (typeof value === 'string') {
    numValue = parseInt(value);
  } else {
    numValue = value;
  }

  if (isNaN(numValue)) {
    return 1;
  }

  return Math.max(numValue, 1);
}

function buildPaginationMetadata(totalCount: number, page: number, limit: number, offset: number) {
  const totalPages = Math.ceil(totalCount / limit);
  return {
    totalCount,
    totalPages,
    page,
    limit,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
    currentPageStart: offset + 1,
    currentPageEnd: Math.min(offset + limit, totalCount),
  };
}

// --- POST /api/channels ---

const channelPOSTRoute = createRoute({
  method: 'post',
  path: '/api/channels',
  summary: 'Create channel',
  tags: ['Channels'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            type: z.string(),
            name: z.string().optional(),
            address: z.string(),
            config: z.any().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: response_data(z.object({
      id: z.string(),
      type: z.string(),
      name: z.string().nullable(),
      address: z.string(),
      status: z.string(),
      environmentId: z.string().nullable(),
      agent: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
    })),
    401: response_error(),
  },
});

channelsApp.openapi(channelPOSTRoute, async (c) => {
  const principal = await authn(c.req.raw.headers);
  authorize(principal, { action: 'environment:write' });

  const body = c.req.valid('json');

  return withOrg(principal.organizationId, async (tx) => {
    const [channel] = await tx
      .insert(channels)
      .values({
        organizationId: principal.organizationId,
        type: body.type,
        name: body.name ?? null,
        address: body.address,
        status: 'active',
        config: body.config ?? {},
      })
      .onConflictDoUpdate({
        target: [channels.organizationId, channels.type, channels.address],
        set: {
          name: body.name ?? null,
          config: body.config ?? {},
          status: 'active',
          updatedAt: new Date().toISOString(),
        },
      })
      .returning({
        id: channels.id,
        type: channels.type,
        name: channels.name,
        address: channels.address,
        status: channels.status,
        environmentId: channels.environmentId,
        agent: channels.agent,
        createdAt: channels.createdAt,
        updatedAt: channels.updatedAt,
      });

    return c.json(channel, 200);
  });
});

// --- GET /api/channels ---

const channelsGETRoute = createRoute({
  method: 'get',
  path: '/api/channels',
  summary: 'List channels',
  tags: ['Channels'],
  responses: {
    200: response_data(z.array(z.object({
      id: z.string(),
      type: z.string(),
      name: z.string().nullable(),
      address: z.string(),
      status: z.string(),
      environmentId: z.string().nullable(),
      agent: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
    }))),
    401: response_error(),
  },
});

channelsApp.openapi(channelsGETRoute, async (c) => {
  const principal = await authn(c.req.raw.headers);
  authorize(principal, { action: 'environment:read' });

  return withOrg(principal.organizationId, async (tx) => {
    const result = await tx
      .select({
        id: channels.id,
        type: channels.type,
        name: channels.name,
        address: channels.address,
        status: channels.status,
        environmentId: channels.environmentId,
        agent: channels.agent,
        createdAt: channels.createdAt,
        updatedAt: channels.updatedAt,
      })
      .from(channels)
      .orderBy(desc(channels.createdAt));

    return c.json(result, 200);
  });
});

// --- GET /api/channels/:channelId/messages ---

const channelMessagesGETRoute = createRoute({
  method: 'get',
  path: '/api/channels/{channelId}/messages',
  summary: 'List channel messages',
  tags: ['Channels'],
  request: {
    params: z.object({
      channelId: z.string(),
    }),
    query: z.object({
      page: z.union([z.number(), z.string()]).optional(),
      limit: z.union([z.number(), z.string()]).optional(),
      contact: z.string().optional(),
      threadId: z.string().optional(),
    }),
  },
  responses: {
    200: response_data(z.object({
      messages: z.array(z.any()),
      pagination: z.any(),
    })),
    401: response_error(),
    404: response_error(),
  },
});

channelsApp.openapi(channelMessagesGETRoute, async (c) => {
  const principal = await authn(c.req.raw.headers);
  authorize(principal, { action: 'environment:read' });

  const { channelId } = c.req.param();
  const query = c.req.valid('query');

  const page = normalizeNumberParam(query.page, 1);
  const limit = normalizeNumberParam(query.limit, 50);
  const offset = (page - 1) * limit;

  return withOrg(principal.organizationId, async (tx) => {
    // Verify channel exists in this org
    const channel = await tx.query.channels.findFirst({
      where: eq(channels.id, channelId),
    });

    if (!channel) {
      return c.json({ message: 'Channel not found' }, 404);
    }

    // Build filters
    const filters: any[] = [eq(channelMessages.channelId, channelId)];

    if (query.contact) {
      filters.push(eq(channelMessages.contact, query.contact));
    }
    if (query.threadId) {
      filters.push(eq(channelMessages.threadId, query.threadId));
    }

    const whereClause = and(...filters);

    // Count
    const countResult = await tx
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(channelMessages)
      .where(whereClause);

    const totalCount = countResult[0]?.count ?? 0;

    // Fetch messages
    const messages = await tx
      .select()
      .from(channelMessages)
      .where(whereClause)
      .orderBy(desc(channelMessages.createdAt))
      .limit(limit)
      .offset(offset);

    return c.json({
      messages,
      pagination: buildPaginationMetadata(totalCount, page, limit, offset),
    }, 200);
  });
});

// --- PATCH /api/channels/:channelId ---

const channelPATCHRoute = createRoute({
  method: 'patch',
  path: '/api/channels/{channelId}',
  summary: 'Update channel',
  tags: ['Channels'],
  request: {
    params: z.object({
      channelId: z.string(),
    }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            environmentId: z.string().nullable().optional(),
            agent: z.string().nullable().optional(),
            status: z.enum(['active', 'archived']).optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: response_data(z.object({
      id: z.string(),
      type: z.string(),
      name: z.string().nullable(),
      address: z.string(),
      status: z.string(),
      environmentId: z.string().nullable(),
      agent: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
    })),
    401: response_error(),
    404: response_error(),
    422: response_error(),
  },
});

channelsApp.openapi(channelPATCHRoute, async (c) => {
  const principal = await authn(c.req.raw.headers);
  authorize(principal, { action: 'environment:write' });

  const { channelId } = c.req.param();
  const body = c.req.valid('json');

  return withOrg(principal.organizationId, async (tx) => {
    const channel = await tx.query.channels.findFirst({
      where: eq(channels.id, channelId),
    });

    if (!channel) {
      return c.json({ message: 'Channel not found' }, 404);
    }

    // Validate environmentId exists in org
    if (body.environmentId) {
      const env = await tx.query.environments.findFirst({
        where: eq(environments.id, body.environmentId),
      });
      if (!env) {
        return c.json({ message: 'Environment not found' }, 422);
      }

      // Validate agent exists in environment config
      if (body.agent) {
        const config = BaseConfigSchemaToZod.parse(env.config);
        const agentConfig = config.agents?.find((a) => a.name === body.agent);
        if (!agentConfig) {
          return c.json({ message: `Agent '${body.agent}' not found in environment config` }, 422);
        }
      }
    }

    const updates: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (body.environmentId !== undefined) updates.environmentId = body.environmentId;
    if (body.agent !== undefined) updates.agent = body.agent;
    if (body.status !== undefined) updates.status = body.status;

    const [updated] = await tx
      .update(channels)
      .set(updates)
      .where(eq(channels.id, channelId))
      .returning({
        id: channels.id,
        type: channels.type,
        name: channels.name,
        address: channels.address,
        status: channels.status,
        environmentId: channels.environmentId,
        agent: channels.agent,
        createdAt: channels.createdAt,
        updatedAt: channels.updatedAt,
      });

    return c.json(updated, 200);
  });
});
