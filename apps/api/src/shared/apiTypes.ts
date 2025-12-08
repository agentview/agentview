import z from 'zod'


export const UserSchema = z.object({
    id: z.string(),
    externalId: z.string().nullable(),
    createdAt: z.iso.date(),
    updatedAt: z.iso.date(),
    createdBy: z.string().nullable(),
    isShared: z.boolean(),
    token: z.string(),
})

export type User = z.infer<typeof UserSchema>

export const UserCreateSchema = UserSchema.pick({
    isShared: true,
    externalId: true,
}).partial()

export type UserCreate = z.infer<typeof UserCreateSchema>

export const InvitationSchema = z.object({
    id: z.string(),
    email: z.string(),
    role: z.string(),
    expiresAt: z.iso.date(),
    createdAt: z.iso.date(),
    status: z.string(),
    invitedBy: z.string().nullable(),
})

export const InvitationCreateSchema = z.object({
    email: z.email(),
    role: z.enum(['admin', 'user']),
})

export const VersionSchema = z.object({
    id: z.string(),
    version: z.string(),
    env: z.string(),
    metadata: z.any(),
    createdAt: z.iso.date(),
})

export const VersionCreateSchema = z.object({
    version: z.string(),
    env: z.string().optional(),
    metadata: z.any().optional(),
})

export type VersionCreate = z.infer<typeof VersionCreateSchema>


export const ScoreSchema = z.object({
    id: z.string(),
    sessionItemId: z.string(),

    name: z.string(),
    value: z.any(),
    commentId: z.string().nullable(),

    createdBy: z.string(),
    createdAt: z.iso.date(),
    updatedAt: z.iso.date(),
    deletedAt: z.iso.date().nullable(),
    deletedBy: z.string().nullable(),
})

export type Score = z.infer<typeof ScoreSchema>

export const CommentMessageSchema = z.object({
    id: z.string(),
    userId: z.string(),
    content: z.string().nullable(),
    createdAt: z.iso.date(),
    updatedAt: z.iso.date().nullable(),
    deletedAt: z.iso.date().nullable(),
    deletedBy: z.string().nullable(),
    score: ScoreSchema.nullable(),
})

export type CommentMessage = z.infer<typeof CommentMessageSchema>

export const SessionItemSchema = z.object({
    id: z.string(),
    createdAt: z.iso.date(),
    updatedAt: z.iso.date(),
    // type: z.string(),
    // role: z.string().nullable(),
    content: z.any(),

    runId: z.string(), // potential bloat
    sessionId: z.string(), // potential bloat
})

export const SessionItemWithCollaborationSchema = SessionItemSchema.extend({
    commentMessages: z.array(CommentMessageSchema),
    scores: z.array(ScoreSchema),
})

export type SessionItem = z.infer<typeof SessionItemSchema>
export type SessionItemWithCollaboration = z.infer<typeof SessionItemWithCollaborationSchema>


export const RunSchema = z.object({
    id: z.string(),
    createdAt: z.iso.date(),
    finishedAt: z.iso.date().nullable(),
    status: z.string(),
    failReason: z.any().nullable(),
    version: VersionSchema.nullable(),
    metadata: z.record(z.string(), z.any()).nullable(),
    sessionItems: z.array(SessionItemSchema),

    sessionId: z.string(), // potential bloat
    versionId: z.string().nullable(), // potential bloat
})

export const RunCreateSchema = z.object({
    sessionId: z.string(),
    items: z.array(z.record(z.string(), z.any())),
    version: z.union([VersionCreateSchema, z.string()]),
    metadata: z.record(z.string(), z.any()).optional(),
    status: z.enum(['in_progress', 'completed', 'cancelled', 'failed']).optional(),
    state: z.any().optional(),
    failReason: z.any().nullable().optional()
});

export type RunCreate = z.infer<typeof RunCreateSchema>

export const RunUpdateSchema = RunCreateSchema.pick({
    items: true,
    metadata: true,
    status: true,
    state: true,
    failReason: true
}).partial()

export type RunUpdate = z.infer<typeof RunUpdateSchema>

export type Run = z.infer<typeof RunSchema>

export const RunWithCollaborationSchema = RunSchema.extend({
    sessionItems: z.array(SessionItemWithCollaborationSchema),
})

export type RunWithCollaboration = z.infer<typeof RunWithCollaborationSchema>

export const SessionBaseSchema = z.object({
    id: z.string(),
    agent: z.string(),
    handle: z.string(),
    createdAt: z.iso.date(),
    updatedAt: z.iso.date(),
    metadata: z.record(z.string(), z.any()).nullable(),
    user: UserSchema,
    userId: z.string(), // potential bloat
    state: z.any().nullable().optional(),
})

export type SessionBase = z.infer<typeof SessionBaseSchema>

export const SessionSchema = SessionBaseSchema.extend({
    runs: z.array(RunSchema),
})

export const SessionWithCollaborationSchema = SessionBaseSchema.extend({
    runs: z.array(RunWithCollaborationSchema),
})

export type Session = z.infer<typeof SessionSchema>
export type SessionWithCollaboration = z.infer<typeof SessionWithCollaborationSchema>


export const SessionCreateSchema = z.object({
    agent: z.string(),
    metadata: z.record(z.string(), z.any()).optional(),
    userId: z.string().optional(),
    userExternalId: z.string().optional(),
})

export type SessionCreate = z.infer<typeof SessionCreateSchema>

export const SessionUpdateSchema = z.object({
    metadata: SessionCreateSchema.shape.metadata.unwrap(),
})

export type SessionUpdate = z.infer<typeof SessionUpdateSchema>

export const ScoreCreateSchema = ScoreSchema.pick({
    sessionItemId: true,
    name: true,
    value: true,
    commentId: true,
})

export const allowedSessionLists = ["prod", "playground_private", "playground_shared"]

export const PublicSessionsGetQueryParamsSchema = z.object({
    agent: z.string().optional(),
    page: z.union([z.number(), z.string()]).optional(),
    limit: z.union([z.number(), z.string()]).optional()
  });
  
export const SessionsGetQueryParamsSchema = PublicSessionsGetQueryParamsSchema.extend({
    userId: z.string().optional(),
    list: z.enum(allowedSessionLists).optional(),
})


export type PublicSessionsGetQueryParams = z.infer<typeof PublicSessionsGetQueryParamsSchema>
export type SessionsGetQueryParams = z.infer<typeof SessionsGetQueryParamsSchema>





export const ConfigSchema = z.object({
    id: z.string(),
    config: z.any(),
    createdAt: z.iso.date(),
    createdBy: z.string(),
})

export type Config = z.infer<typeof ConfigSchema>

export const ConfigCreateSchema = ConfigSchema.pick({
    config: true,
})

export type ConfigCreate = z.infer<typeof ConfigCreateSchema>

// member - user of organization, works in agentview panel, not end user
export const MemberSchema = z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
    role: z.string(),
    image: z.string().nullable(),
    createdAt: z.iso.date(),
})

export const MemberUpdateSchema = z.object({
    role: z.enum(['admin', 'user']),
})

export type Member = z.infer<typeof MemberSchema>

export type MemberUpdate = z.infer<typeof MemberUpdateSchema>

export const PaginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
  totalCount: z.number(),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
  currentPageStart: z.number(),
  currentPageEnd: z.number()
})

export type Pagination = z.infer<typeof PaginationSchema>

export const SessionsPaginatedResponseSchema = z.object({
  sessions: z.array(SessionBaseSchema),
  pagination: PaginationSchema,
})

export type SessionsPaginatedResponse = z.infer<typeof SessionsPaginatedResponseSchema>


// run webhook
export const RunBodySchema = z.object({
    session: SessionSchema,
    input: z.any(),
})

export type RunBody = z.infer<typeof RunBodySchema>
