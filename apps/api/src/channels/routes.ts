import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { and, desc, eq, sql } from 'drizzle-orm';
import { authn, authorize } from '../authMiddleware';
import { withOrg } from '../withOrg';
import { channels, channelMessages } from '../schemas/schema';
import { response_data, response_error } from '../hono_utils';

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
