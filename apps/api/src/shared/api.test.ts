import { describe, it, test, expect, beforeAll } from 'vitest'
import { AgentView, AgentViewClient } from './AgentView'
import type { EndUser } from './apiTypes';
import { z } from 'zod';
import { AgentViewError } from './AgentViewError';

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
        await expect(av.getEndUser({ id: 'xxx' })).rejects.toThrowError(expect.objectContaining({
          statusCode: 404,
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

    describe("get session by id", () => {
      test("works for own session", async () => {
        await av.__updateConfig({ config: { agents: [{ name: "test", url: "https://test.com" }] } })
        const session = await av.createSession({ agent: "test", endUserId: initEndUser1.id })

        const avPublic1 = new AgentViewClient({
          apiUrl,
          endUserToken: initEndUser1.token
        })

        const fetchedSession = await avPublic1.getSession({ id: session.id })
        expect(fetchedSession).toMatchObject(session)
      })

      test("fails for someone else's session", async () => {
        await av.__updateConfig({ config: { agents: [{ name: "test", url: "https://test.com" }] } })
        const session = await av.createSession({ agent: "test", endUserId: initEndUser1.id })

        const avPublic2 = new AgentViewClient({
          apiUrl,
          endUserToken: initEndUser2.token
        })

        await expect(avPublic2.getSession({ id: session.id })).rejects.toThrowError(expect.objectContaining({
          statusCode: 401,
          message: expect.any(String),
        }))
      })
    })
  })

  describe("configs", () => {

    test("works", async () => {
      const CONFIG = { agents: [{ name: "test", url: "https://test.com" }] };

      let configRow = await av.__updateConfig({ config: CONFIG })
      expect(configRow.config).toEqual(CONFIG);

      configRow = await av.__getConfig();
      expect(configRow.config).toEqual(CONFIG);

      const CONFIG_2 = { agents: [{ name: "test2", url: "https://test2.com" }] };

      configRow = await av.__updateConfig({ config: CONFIG_2 })
      expect(configRow.config).toEqual(CONFIG_2);

      configRow = await av.__getConfig();
      expect(configRow.config).toEqual(CONFIG_2);
    })

    test("non-config fields are stripped", async () => {
      let configRow = await av.__updateConfig({ config: { agents: [], animal: "cat" } })
      expect(configRow.config).toEqual({ agents: [] });

      configRow = await av.__getConfig();
      expect(configRow.config).toEqual({ agents: [] });
    })

    test("invalid config throws", async () => {
      await expect(av.__updateConfig({ config: { agents: 100 } })).rejects.toThrowError(expect.objectContaining({
        statusCode: 400,
        message: expect.any(String),
      }))
    })
  })

  describe("sessions", async () => {
    test("create", async () => {
      await av.__updateConfig({ config: { agents: [{ name: "test", url: "https://test.com" }] } })

      const session = await av.createSession({ agent: "test", endUserId: initEndUser1.id })
      expect(session).toMatchObject({
        agent: "test",
        metadata: {},
        runs: [],
        endUser: {
          id: initEndUser1.id,
          externalId: EXTERNAL_ID_1,
          isShared: false,
          token: initEndUser1.token,
        }
      })
    })

    test("create - fails at wrong agent", async () => {
      await av.__updateConfig({ config: { agents: [{ name: "test", url: "https://test.com" }] } })
      
      await expect(av.createSession({ agent: "wrong_agent", endUserId: initEndUser1.id })).rejects.toThrowError(expect.objectContaining({
        statusCode: 404,
        message: expect.any(String),
      }))
    })

    test("create / with known metadata / saved", async () => {
      await av.__updateConfig({ config: { agents: [{ name: "test", url: "https://test.com", metadata: { product_id: z.string() } }] } })

      const session = await av.createSession({ agent: "test", endUserId: initEndUser1.id, metadata: { product_id: "123" } })
      expect(session).toMatchObject({
        agent: "test",
        metadata: {
          product_id: "123",
        }
      })
    })

    test("create / with known metadata + allowUnknownMetadata=false / saved", async () => {
      await av.__updateConfig({ config: { agents: [{ name: "test", url: "https://test.com", metadata: { product_id: z.string() }, allowUnknownMetadata: false }] } })

      const session = await av.createSession({ agent: "test", endUserId: initEndUser1.id, metadata: { product_id: "123" } })
      expect(session).toMatchObject({
        agent: "test",
        metadata: {
          product_id: "123",
        }
      })
    })

    test("create / with unknown metadata / saved", async () => {
      await av.__updateConfig({ config: { agents: [{ name: "test", url: "https://test.com" }] } })

      const session = await av.createSession({ agent: "test", endUserId: initEndUser1.id, metadata: { product_id: "123" } })
      expect(session).toMatchObject({
        agent: "test",
        metadata: {
          product_id: "123",
        }
      })
    })

    test("create / with unknown metadata + allowUnknownMetadata=false / failed", async () => {
      await av.__updateConfig({ config: { agents: [{ name: "test", url: "https://test.com", allowUnknownMetadata: false }] } })

      await expect(av.createSession({ agent: "test", endUserId: initEndUser1.id, metadata: { product_id: "123" } })).rejects.toThrowError(expect.objectContaining({
        statusCode: 422,
        message: expect.any(String),
      }))
    })

    test("create / with incompatible metadata / fails", async () => {
      await av.__updateConfig({ config: { agents: [{ name: "test", url: "https://test.com", metadata: { product_id: z.string() } }] } })

      await expect(av.createSession({ agent: "test", endUserId: initEndUser1.id, metadata: { product_id: 123 } })).rejects.toThrowError(expect.objectContaining({
        statusCode: 422,
        message: expect.any(String),
      }))
    })

    test("get by id for existing session", async () => {
      await av.__updateConfig({ config: { agents: [{ name: "test", url: "https://test.com" }] } })

      const session = await av.createSession({ agent: "test", endUserId: initEndUser1.id })
      const fetchedSession = await av.getSession({ id: session.id })
      expect(fetchedSession).toMatchObject({
        agent: "test",
        metadata: {},
        runs: [],
        endUserId: initEndUser1.id,
      })
    })

    test("get by id - wrong id", async () => {
      await av.__updateConfig({ config: { agents: [{ name: "test", url: "https://test.com" }] } })

      await expect(av.getSession({ id: 'xxx' })).rejects.toThrowError(expect.objectContaining({
        statusCode: 404,
        message: expect.any(String),
      }))
    })
    
    // TODO - update metadata!!! (PATCH /api/sessions/{session_id})


  })
});

