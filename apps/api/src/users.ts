import { endUsers } from './schemas/schema'
import { eq, and } from 'drizzle-orm'
import { randomBytes } from 'crypto'
import type { z } from 'better-auth'
import type { SpaceSchema } from 'agentview/apiTypes'
import { AgentViewError } from 'agentview/AgentViewError'
import type { Transaction } from './types'


// export function generateUserToken(): string {
//   return randomBytes(32).toString('hex')
// }

// export async function createUser(tx: Transaction, values: { organizationId: string, createdBy: string | null, space: z.infer<typeof SpaceSchema>, externalId?: string | null }) {
//   if (values.externalId) {
//     const existingUserWithExternalId = await findUser(tx, { externalId: values.externalId, space: values.space, organizationId: values.organizationId })
//     if (existingUserWithExternalId) {
//       throw new AgentViewError('User with this external ID already exists', 422)
//     }
//   }

//   if (values.space === 'production' && values.createdBy !== null) {
//     throw new AgentViewError('Production space cannot be created by a member', 422)
//   }

//   const [newEndUser] = await tx.insert(endUsers).values({
//     organizationId: values.organizationId,
//     externalId: values.externalId ?? null,
//     createdBy: values.createdBy,
//     space: values.space,
//     token: generateUserToken(),
//   }).returning()

//   return newEndUser
// }



type FindUserByIdOptions = {
  id: string
}

type FindUserByExternalIdOptions = {
  externalId: string,
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
