import { db } from './db'
import { endUsers, endUserAuthSessions } from './schemas/schema'
import { eq, and, gt } from 'drizzle-orm'
import { randomBytes } from 'crypto'
import jwt from 'jsonwebtoken'


export async function createEndUser(externalId?: string) {
  const [newEndUser] = await db.insert(endUsers).values({
    externalId: externalId ?? null,
    isShared: false,
    simulatedBy: null,
  }).returning()

  return newEndUser
}

export async function createEndUserAuthSession(
  endUserId: string,
  options?: {
    ipAddress?: string
    userAgent?: string
    expiresInHours?: number
  }
) {
  const expiresInHours = options?.expiresInHours ?? 24 * 7 // Default 7 days
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString()
  
  const [session] = await db.insert(endUserAuthSessions).values({
    endUserId,
    token: generateEndUserToken(),
    expiresAt,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ipAddress: options?.ipAddress,
    userAgent: options?.userAgent,
  }).returning()

  return session
}

export async function getEndUserAuthSession(options?: { token?: string, headers?: Headers }) {
  const token = options?.token ?? extractEndUserToken(options?.headers ?? new Headers())
  if (!token) {
    return undefined;
  }

  const session = await db.query.endUserAuthSessions.findFirst({
    where: and(
      eq(endUserAuthSessions.token, token),
      gt(endUserAuthSessions.expiresAt, new Date().toISOString())
    ),
    with: {
      endUser: true
    }
  })
  
  return session;
}

export function generateEndUserToken(): string {
  return randomBytes(32).toString('hex')
}

export function extractEndUserToken(headers: Headers): string | null {
  const authHeader = headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7) // Remove 'Bearer ' prefix
}

export function verifyJWT(token: string): { externalId: string } | null {
  try {
    const decoded = jwt.verify(token, process.env.AGENTVIEW_SECRET_KEY!) as any

    if (!decoded || !decoded.externalId) {
      return null
    }
    
    return { externalId: decoded.externalId }
  } catch (error) {
    return null
  }
}

export async function findEndUserByExternalId(externalId: string) {
  const endUser = await db.query.endUsers.findFirst({
    where: eq(endUsers.externalId, externalId)
  })
  
  return endUser
}
