import z from 'zod'


export const ClientSchema = z.object({
    id: z.string(),
    createdAt: z.iso.date(),
    updatedAt: z.iso.date(),
    simulatedBy: z.string().nullable(),
    isShared: z.boolean(),
})

export type Client = z.infer<typeof ClientSchema>

export const ClientCreateSchema = ClientSchema.pick({
    isShared: true,
}).partial()

export type ClientCreate = z.infer<typeof ClientCreateSchema>

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
    type: z.string(),
    role: z.string().nullable(),
    content: z.any(),

    runId: z.string(), // potential bloat
    sessionId: z.string(), // potential bloat

    commentMessages: z.array(CommentMessageSchema),
    scores: z.array(ScoreSchema),
})

export type SessionItem = z.infer<typeof SessionItemSchema>

export const SessionItemCreateSchema = SessionItemSchema.pick({
    type: true,
    role: true,
    content: true,
})

export const RunSchema = z.object({
    id: z.string(),
    createdAt: z.iso.date(),
    finishedAt: z.iso.date().nullable(),
    status: z.string(),
    failReason: z.any().nullable(),
    sessionItems: z.array(SessionItemSchema),
    version: VersionSchema.nullable(),
    metadata: z.any().nullable(),

    sessionId: z.string(), // potential bloat
    versionId: z.string().nullable(), // potential bloat

    responseData: z.any().nullable(), // it shouldn't be here by default! separate endpoint for that!!!
})

export type Run = z.infer<typeof RunSchema>

export const SessionBaseSchema = z.object({
    id: z.string(),
    handle: z.string(),
    createdAt: z.iso.date(),
    updatedAt: z.iso.date(),
    context: z.any(),
    agent: z.string(),
    client: ClientSchema,
})

export type SessionBase = z.infer<typeof SessionBaseSchema>

export const SessionSchema = SessionBaseSchema.extend({
    runs: z.array(RunSchema),
})

export type Session = z.infer<typeof SessionSchema>


export const SessionCreateSchema = SessionBaseSchema.pick({
    agent: true,
    context: true,
}).extend({
    clientId: z.string().optional(),
    isShared: z.boolean().optional(),
})

export const ScoreCreateSchema = ScoreSchema.pick({
    sessionItemId: true,
    name: true,
    value: true,
    commentId: true,
})



// const input = {
//     session: {
//       id: session.id,
//       createdAt: session.createdAt,
//       updatedAt: session.updatedAt,
//       context: session.context,
//       clientId: session.clientId,
//       agent: session.agent,
//       items: getAllSessionItems(session),
//       state
//     },
//     input: userItem
//   }






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

export const UserSchema = z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
    role: z.string(),
    image: z.string().nullable(),
    createdAt: z.iso.date(),
})

export const UserUpdateSchema = z.object({
    role: z.enum(['admin', 'user']),
})

export type User = z.infer<typeof UserSchema>

export type UserUpdate = z.infer<typeof UserUpdateSchema>

export const allowedSessionLists = ["real", "simulated_private", "simulated_shared"]

export const PaginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
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