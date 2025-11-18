import { describe, it, test, expect, beforeAll } from 'vitest'
import { AgentView, AgentViewClient } from './AgentView'
import type { EndUser } from './apiTypes';

const apiKey = 'cTlvHJzNQqFwgUaXJwhQCgnxUaYPYrgnjLDkapomgcAHRKoyutJpvVJACaBCUWoT'
const apiUrl = 'http://localhost:8080'

const av = new AgentView({
  apiUrl,
  apiKey
})

describe('API', () => {
  let initEndUser1: EndUser
  let initEndUser2: EndUser
  const EXTERNAL_ID_1 = Math.random().toString(36).slice(2)
  const EXTERNAL_ID_2 = Math.random().toString(36).slice(2)

  beforeAll(async () => {
    initEndUser1 = await av.createEndUser({ externalId: EXTERNAL_ID_1 })
    initEndUser2 = await av.createEndUser({ externalId: EXTERNAL_ID_2 })

    expect(initEndUser1).toBeDefined()
    expect(initEndUser1.externalId).toBe(EXTERNAL_ID_1)

    expect(initEndUser2).toBeDefined()
    expect(initEndUser2.externalId).toBe(EXTERNAL_ID_2)
  })

  describe("end users", () => {
    test("creating another user with the same external id should fail", async () => {
      await expect(av.createEndUser({ externalId: EXTERNAL_ID_1 })).rejects.toThrowError(expect.objectContaining({
        statusCode: 400,
        message: expect.any(String),
      }))
    })

    test("update works", async () => {
      const EXTERNAL_ID = Math.random().toString(36).slice(2);
      const NEW_EXTERNAL_ID = EXTERNAL_ID + '1';

      const endUser = await av.createEndUser({ externalId: EXTERNAL_ID, isShared: false })
      let updatedEndUser = await av.updateEndUser({ id: endUser.id, externalId: NEW_EXTERNAL_ID, isShared: true })
      expect(updatedEndUser).toBeDefined()
      expect(updatedEndUser.externalId).toBe(NEW_EXTERNAL_ID)
      expect(updatedEndUser.isShared).toBe(true)

      updatedEndUser = await av.getEndUser({ id: endUser.id })
      expect(updatedEndUser).toBeDefined()
      expect(updatedEndUser.externalId).toBe(NEW_EXTERNAL_ID)
      expect(updatedEndUser.isShared).toBe(true)
    })

    describe("get by id", () => {

      test("existing ids", async () => {
        const endUser1 = await av.getEndUser({ id: initEndUser1.id })
        expect(endUser1).toBeDefined()
        expect(endUser1.externalId).toBe(EXTERNAL_ID_1)

        const endUser2 = await av.getEndUser({ id: initEndUser2.id })
        expect(endUser2).toBeDefined()
        expect(endUser2.externalId).toBe(EXTERNAL_ID_2)
      })

      test("not found", async () => {
        await expect(av.getEndUser({ id: randomUUID() })).rejects.toThrowError(expect.objectContaining({
          statusCode: 404,
          message: expect.any(String),
        }))
      })

      test("incorrect id", async () => {
        await expect(av.getEndUser({ id: 'xxx' })).rejects.toThrowError(expect.objectContaining({
          statusCode: 422,
          message: expect.any(String),
        }))
      })

      test("succeeeds when scoped with own token", async () => {
        const endUser1 = await av.getEndUser({ id: initEndUser1.id, endUserToken: initEndUser1.token })
        expect(endUser1).toBeDefined()
        expect(endUser1.externalId).toBe(EXTERNAL_ID_1)
      })

      test("fails when scoped with another user's token", async () => {
        await expect(av.getEndUser({ id: initEndUser1.id, endUserToken: initEndUser2.token })).rejects.toThrowError(expect.objectContaining({
          statusCode: 401,
          message: expect.any(String),
        }))
      })
    })

    describe("get by external id", () => {
      test("existing external ids", async () => {
        const endUser1 = await av.getEndUserByExternalId({ externalId: EXTERNAL_ID_1 })
        expect(endUser1).toBeDefined()
        expect(endUser1.externalId).toBe(EXTERNAL_ID_1)
      })

      test("not found", async () => {
        await expect(av.getEndUserByExternalId({ externalId: 'unknown_external_id' })).rejects.toThrowError(expect.objectContaining({
          statusCode: 404,
          message: expect.any(String),
        }))
      })

      test("succeeeds when scoped with own token", async () => {
        const endUser1 = await av.getEndUserByExternalId({ externalId: EXTERNAL_ID_1, endUserToken: initEndUser1.token })
        expect(endUser1).toBeDefined()
        expect(endUser1.externalId).toBe(EXTERNAL_ID_1)
      })

      test("fails when scoped with another user's token", async () => {
        await expect(av.getEndUserByExternalId({ externalId: EXTERNAL_ID_1, endUserToken: initEndUser2.token })).rejects.toThrowError(expect.objectContaining({
          statusCode: 401,
          message: expect.any(String),
        }))
      })
    })

    describe("get me", () => {
      test("works", async () => {
        const endUser1 = await av.getEndUserMe({ endUserToken: initEndUser1.token })
        expect(endUser1).toBeDefined()
        expect(endUser1.externalId).toBe(EXTERNAL_ID_1)

        const endUser2 = await av.getEndUserMe({ endUserToken: initEndUser2.token })
        expect(endUser2).toBeDefined()
        expect(endUser2.externalId).toBe(EXTERNAL_ID_2)
      })

      test("fails for bad token", async () => {
        await expect(av.getEndUserMe({ endUserToken: 'xxx' })).rejects.toThrowError(expect.objectContaining({
          statusCode: 404,
          message: expect.any(String),
        }))
      })
    })
  })

  describe("PUBLIC API", () => {
    
    describe("get me", () => {

      test("works for existing users", async () => {
        const avPublic1 = new AgentViewClient({
          apiUrl,
          endUserToken: initEndUser1.token
        })
        const endUser1 = await avPublic1.getMe()
        expect(endUser1).toBeDefined()
        expect(endUser1.externalId).toBe(EXTERNAL_ID_1)

        const avPublic2 = new AgentViewClient({
          apiUrl,
          endUserToken: initEndUser2.token
        })
        const endUser2 = await avPublic2.getMe()
        expect(endUser2).toBeDefined()
        expect(endUser2.externalId).toBe(EXTERNAL_ID_2)
      })


      test("fails for unknown key", async () => {
        const avPublic1 = new AgentViewClient({
          apiUrl,
          endUserToken: "xxx"
        })

        await expect(avPublic1.getMe()).rejects.toThrowError(expect.objectContaining({
          statusCode: 401,
          message: expect.any(String),
        }))
      })
    })
  })
});



// Generate a random UUID (v4) for testing
function randomUUID() {
  // Browser environments have crypto.randomUUID()
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Node.js 14.17+
  if (typeof require === 'function') {
    try {
      return require('crypto').randomUUID()
    } catch { }
  }
  // Fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}