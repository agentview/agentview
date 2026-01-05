import { endUsers } from './schemas/schema'
import { eq, and } from 'drizzle-orm'
import { randomBytes } from 'crypto'
import type { z } from 'better-auth'
import type { EnvSchema } from 'agentview/apiTypes'
import { AgentViewError } from 'agentview/AgentViewError'
import type { Transaction } from './types'


export function generateUserToken(): string {
  return randomBytes(32).toString('hex')
}

export async function createUser(tx: Transaction, values: { organizationId: string, createdBy: string, env: z.infer<typeof EnvSchema>, externalId?: string | null }) {
  if (values.externalId) {
    const existingUserWithExternalId = await findUser(tx, { externalId: values.externalId, env: values.env, organizationId: values.organizationId })
    if (existingUserWithExternalId) {
      throw new AgentViewError('User with this external ID already exists', 422)
    }
  }

  const [newEndUser] = await tx.insert(endUsers).values({
    organizationId: values.organizationId,
    externalId: values.externalId ?? null,
    createdBy: values.env === 'production' ? null : values.createdBy,
    env: values.env,
    token: generateUserToken(),
  }).returning()

  return newEndUser
}

// export async function createEndUserAuthSession(
//   endUserId: string,
//   options?: {
//     ipAddress?: string
//     userAgent?: string
//     expiresInHours?: number
//   }
// ) {
//   const expiresInHours = options?.expiresInHours ?? 24 * 7 // Default 7 days
//   const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString()
  
//   const [session] = await db.insert(endUserAuthSessions).values({
//     endUserId,
//     token: generateEndUserToken(),
//     expiresAt,
//     createdAt: new Date().toISOString(),
//     updatedAt: new Date().toISOString(),
//     ipAddress: options?.ipAddress,
//     userAgent: options?.userAgent,
//   }).returning()

//   return session
// }

// export async function getEndUserAuthSession(options?: { token?: string, headers?: Headers }) {
//   const token = options?.token ?? extractEndUserToken(options?.headers ?? new Headers())
//   if (!token) {
//     return undefined;
//   }

//   const session = await db.query.endUserAuthSessions.findFirst({
//     where: and(
//       eq(endUserAuthSessions.token, token),
//       gt(endUserAuthSessions.expiresAt, new Date().toISOString())
//     ),
//     with: {
//       endUser: true
//     }
//   })
  
//   return session;
// }

// export function generateEndUserToken(): string {
//   return randomBytes(32).toString('hex')
// }

// export function extractEndUserToken(headers: Headers): string | null {
//   const authHeader = headers.get('authorization')
//   if (!authHeader || !authHeader.startsWith('Bearer ')) {
//     return null
//   }
//   return authHeader.substring(7) // Remove 'Bearer ' prefix
// }

// export function verifyJWT(token: string): { externalId: string } | null {
//   try {
//     const decoded = jwt.verify(token, process.env.AGENTVIEW_SECRET_KEY!) as any

//     if (!decoded || !decoded.externalId) {
//       return null
//     }
    
//     return { externalId: decoded.externalId }
//   } catch (error) {
//     return null
//   }
// }



type FindUserByIdOptions = {
  id: string
}

type FindUserByExternalIdOptions = {
  externalId: string,
  env: z.infer<typeof EnvSchema>,
  organizationId: string,
}

type FindUserByTokenOptions = {
  token: string
}

export async function findUser(tx: Transaction, args: FindUserByIdOptions | FindUserByExternalIdOptions | FindUserByTokenOptions) {
  if ('id' in args) {
    return await tx.query.endUsers.findFirst({
      where: eq(endUsers.id, args.id),
    });
  }

  if ('externalId' in args) {
    return await tx.query.endUsers.findFirst({
      where: and(
        eq(endUsers.externalId, args.externalId),
        eq(endUsers.env, args.env),
        eq(endUsers.organizationId, args.organizationId)
      ),
    });
  }

  if ('token' in args) {
    return await tx.query.endUsers.findFirst({
      where: eq(endUsers.token, args.token), // fixme: this is terrible
    });
  }

  return undefined;
}
