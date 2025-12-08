import { describe, test, expect, beforeAll } from 'vitest'
import { AgentView, PublicAgentView } from './AgentView'
import type { User, Run, Session } from './apiTypes';
import { z } from 'zod';

const apiKey = 'CTQWCPJrBTVUMbBgnkQNGeXxCaZsPgDJWZperYmGNPKgSzUqRcAVXnXggZLaxUSb'
const apiUrl = 'http://localhost:1990'

const av = new AgentView({
  apiUrl,
  apiKey
})

describe('API', () => {
  let initUser1: User
  let initUser2: User

  let initProdUser: User

  const EXTERNAL_ID_1 = Math.random().toString(36).slice(2)
  const EXTERNAL_ID_2 = Math.random().toString(36).slice(2)

  beforeAll(async () => {
    initUser1 = await av.createUser({ externalId: EXTERNAL_ID_1 })
    initUser2 = await av.createUser({ externalId: EXTERNAL_ID_2 })
    initProdUser = await av.createUser({ externalId: EXTERNAL_ID_1, env: "production" })

    expect(initUser1).toBeDefined()
    expect(initUser1.externalId).toBe(EXTERNAL_ID_1)
    expect(initUser1.createdBy).toBeDefined()

    expect(initUser2).toBeDefined()
    expect(initUser2.externalId).toBe(EXTERNAL_ID_2)
    expect(initUser1.createdBy).toBeDefined()

    expect(initProdUser).toBeDefined()
    expect(initProdUser.externalId).toBe(EXTERNAL_ID_1) // external id the same as initUSer1, but in prod
    expect(initProdUser.createdBy).toBeNull()
  })

  function expectToFail(promise: Promise<any>, statusCode: number) {
    return expect(promise).rejects.toThrowError(expect.objectContaining({
      statusCode,
      message: expect.any(String),
    }))
  }


  const updateConfig = async (options: { strictMatching?: boolean, runMetadata?: Record<string, z.ZodType>, allowUnknownMetadata?: boolean, validateSteps?: boolean } = {}) => {

    let inputSchema = z.looseObject({ type: z.literal("message"), role: z.literal("user"), content: z.string() })
    let stepSchema = z.looseObject({ type: z.literal("reasoning"), content: z.string() })
    let functionCallSchema = z.looseObject({ type: z.literal("function_call"), name: z.string(), callId: z.string().meta({ callId: true }) })
    let functionResultSchema = z.looseObject({ type: z.literal("function_call_result"), callId: z.string().meta({ callId: true }) })

    let outputSchema = z.looseObject({ type: z.literal("message"), role: z.literal("assistant"), content: z.string() })

    if (options.strictMatching) {
      inputSchema = inputSchema.strict();
      stepSchema = stepSchema.strict();
      outputSchema = outputSchema.strict();
    }

    const config = {
      agents: [
        {
          name: "test",
          runs: [
            {
              input: { schema: inputSchema },
              steps: [{ schema: stepSchema }, { schema: functionCallSchema, callResult: { schema: functionResultSchema } }],
              output: { schema: outputSchema },
              metadata: options.runMetadata,
              validateSteps: options.validateSteps,
              allowUnknownMetadata: options.allowUnknownMetadata,
            }
          ]
        }
      ]
    }

    await av.__updateConfig({ config })
  }

  const baseInput = { type: "message", role: "user", content: "Hello" }
  const baseOutput = { type: "message", role: "assistant", content: "Hi there" }
  const baseStep = { type: "reasoning", content: "Thinking..." }

  const fun1Call = (id?: string) => ({ type: "function_call", name: "function1", ...(id ? { callId: id } : {}) })
  const fun2Call = (id?: string) => ({ type: "function_call", name: "function2", ...(id ? { callId: id } : {}) })

  const funResult = (id?: string) => ({ type: "function_call_result", ...(id ? { callId: id } : {}) })

  const baseInputExt = { type: "message", role: "user", content: "Hello", __extraField: "extra" }
  const baseOutputExt = { type: "message", role: "assistant", content: "Hi there", __extraField: "extra" }
  const baseStepExt = { type: "reasoning", content: "Thinking...", __extraField: "extra" }

  const wrongInput = { type: "message", role: "user", content: 100 }
  const wrongStep = { type: "reasoning", content: 100 }
  const wrongOutput = { type: "message", role: "assistant", content: 100 }


  async function createSession() {
    return await av.createSession({ agent: "test", userId: initUser1.id })
  }

  describe("users", () => {
    test("creating another user with the same external id should fail", async () => {
      await expect(av.createUser({ externalId: EXTERNAL_ID_1 })).rejects.toThrowError(expect.objectContaining({
        statusCode: 422,
        message: expect.any(String),
      }))
    })

    // TODO: Uncomment this when update user is implemented
    // test("update works", async () => {
    //   const EXTERNAL_ID = Math.random().toString(36).slice(2);
    //   const NEW_EXTERNAL_ID = EXTERNAL_ID + '1';

    //   const user = await av.createUser({ externalId: EXTERNAL_ID, isShared: false })
    //   let updatedUser = await av.updateUser({ id: user.id, externalId: NEW_EXTERNAL_ID, isShared: true })
    //   expect(updatedUser).toBeDefined()
    //   expect(updatedUser.externalId).toBe(NEW_EXTERNAL_ID)
    //   expect(updatedUser.isShared).toBe(true)

    //   updatedUser = await av.getUser({ id: user.id })
    //   expect(updatedUser).toBeDefined()
    //   expect(updatedUser.externalId).toBe(NEW_EXTERNAL_ID)
    //   expect(updatedUser.isShared).toBe(true)
    // })

    describe("get by id", () => {

      test("existing ids", async () => {
        const user1 = await av.getUser({ id: initUser1.id })
        expect(user1).toBeDefined()
        expect(user1.externalId).toBe(EXTERNAL_ID_1)

        const user2 = await av.getUser({ id: initUser2.id })
        expect(user2).toBeDefined()
        expect(user2.externalId).toBe(EXTERNAL_ID_2)
      })

      test("not found", async () => {
        await expect(av.getUser({ id: 'xxx' })).rejects.toThrowError(expect.objectContaining({
          statusCode: 404,
          message: expect.any(String),
        }))
      })

      test("succeeeds when scoped with own token", async () => {
        const user1 = await av.as(initUser1).getUser({ id: initUser1.id })
        expect(user1).toBeDefined()
        expect(user1.externalId).toBe(EXTERNAL_ID_1)
      })

      test("fails when scoped with another user's token", async () => {
        await expect(av.as(initUser1).getUser({ id: initUser2.id })).rejects.toThrowError(expect.objectContaining({
          statusCode: 401,
          message: expect.any(String),
        }))
      })
    })

    describe("get by external id", () => {
      test("existing external ids", async () => {
        const user1 = await av.getUser({ externalId: EXTERNAL_ID_1 })
        expect(user1).toBeDefined()
        expect(user1.externalId).toBe(EXTERNAL_ID_1)
      })

      test("not found", async () => {
        await expect(av.getUser({ externalId: 'unknown_external_id' })).rejects.toThrowError(expect.objectContaining({
          statusCode: 404,
          message: expect.any(String),
        }))
      })

      test("succeeeds when scoped with own token", async () => {
        const user1 = await av.as(initUser1).getUser({ externalId: EXTERNAL_ID_1 })
        expect(user1).toBeDefined()
        expect(user1.externalId).toBe(EXTERNAL_ID_1)
      })

      test("fails when scoped with another user's token", async () => {
        await expect(av.as(initUser2).getUser({ externalId: EXTERNAL_ID_1 })).rejects.toThrowError(expect.objectContaining({
          statusCode: 401,
          message: expect.any(String),
        }))
      })
    })

    describe("get me", () => {
      test("works", async () => {
        const user1 = await av.as(initUser1).getUser()
        expect(user1).toBeDefined()
        expect(user1.externalId).toBe(EXTERNAL_ID_1)

        const user2 = await av.as(initUser2).getUser()
        expect(user2).toBeDefined()
        expect(user2.externalId).toBe(EXTERNAL_ID_2)
      })

      test("fails for bad token", async () => {
        await expect(av.as('xxx').getUser()).rejects.toThrowError(expect.objectContaining({
          statusCode: 404,
          message: expect.any(String),
        }))
      })
    })

    describe("PUBLIC API", () => {

      describe("get me", () => {

        test("works for existing users", async () => {
          const avPublic1 = new PublicAgentView({
            apiUrl,
            userToken: initUser1.token
          })
          const user1 = await avPublic1.getMe()
          expect(user1).toBeDefined()
          expect(user1.externalId).toBe(EXTERNAL_ID_1)

          const avPublic2 = new PublicAgentView({
            apiUrl,
            userToken: initUser2.token
          })
          const user2 = await avPublic2.getMe()
          expect(user2).toBeDefined()
          expect(user2.externalId).toBe(EXTERNAL_ID_2)
        })

        test("fails for unknown key", async () => {
          const avPublic1 = new PublicAgentView({
            apiUrl,
            userToken: "xxx"
          })

          await expect(avPublic1.getMe()).rejects.toThrowError(expect.objectContaining({
            statusCode: 401,
            message: expect.any(String),
          }))
        })
      })

      describe("get session by id", () => {
        test("works for own session", async () => {
          await av.__updateConfig({ config: { agents: [{ name: "test" }] } })
          const session = await av.createSession({ agent: "test", userId: initUser1.id })

          const avPublic1 = new PublicAgentView({
            apiUrl,
            userToken: initUser1.token
          })

          const fetchedSession = await avPublic1.getSession({ id: session.id })
          expect(fetchedSession).toMatchObject(session)
        })

        test("fails for someone else's session", async () => {
          await av.__updateConfig({ config: { agents: [{ name: "test" }] } })
          const session = await av.createSession({ agent: "test", userId: initUser1.id })

          const avPublic2 = new PublicAgentView({
            apiUrl,
            userToken: initUser2.token
          })

          await expect(avPublic2.getSession({ id: session.id })).rejects.toThrowError(expect.objectContaining({
            statusCode: 401,
            message: expect.any(String),
          }))
        })
      })
    })


  })



  describe("configs", () => {

    test("works", async () => {
      const CONFIG = { agents: [{ name: "test" }] };

      let configRow = await av.__updateConfig({ config: CONFIG })
      expect(configRow.config).toEqual(CONFIG);

      configRow = await av.__getConfig();
      expect(configRow.config).toEqual(CONFIG);

      const CONFIG_2 = { agents: [{ name: "test2" }] };

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
        statusCode: 422,
        message: expect.any(String),
      }))
    })
  })

  describe("sessions", async () => {
    test("create for specific user", async () => {
      await av.__updateConfig({ config: { agents: [{ name: "test" }] } })

      const session = await av.createSession({ agent: "test", userId: initUser1.id })
      expect(session).toMatchObject({
        agent: "test",
        metadata: {},
        runs: [],
        user: {
          id: initUser1.id,
          externalId: EXTERNAL_ID_1,
          env: "playground",
          token: initUser1.token,
        }
      })
    })

    test("create for no user (creates new user)", async () => {
      await av.__updateConfig({ config: { agents: [{ name: "test" }] } })

      const session = await av.createSession({ agent: "test" })
      expect(session.userId).toBeDefined()

      const fetchedSession = await av.as(session.user).getSession({ id: session.id });
      expect(fetchedSession).toMatchObject(session)
    })

    test("create session for other user with 'as' -> should throw", async () => {
      await av.__updateConfig({ config: { agents: [{ name: "test" }] } })

      await expect(av.as(initUser1).createSession({ agent: "test", userId: initUser2.id })).rejects.toThrowError(expect.objectContaining({
        statusCode: 401,
        message: expect.any(String),
      }))

    })

    test("create - fails at wrong agent", async () => {
      await av.__updateConfig({ config: { agents: [{ name: "test" }] } })

      await expect(av.createSession({ agent: "wrong_agent", userId: initUser1.id })).rejects.toThrowError(expect.objectContaining({
        statusCode: 404,
        message: expect.any(String),
      }))
    })




    test("get by id for existing session", async () => {
      await av.__updateConfig({ config: { agents: [{ name: "test" }] } })

      const session = await av.createSession({ agent: "test", userId: initUser1.id })
      const fetchedSession = await av.getSession({ id: session.id })
      expect(fetchedSession).toMatchObject({
        agent: "test",
        metadata: {},
        runs: [],
        userId: initUser1.id,
      })
    })

    test("get by id - wrong id", async () => {
      await av.__updateConfig({ config: { agents: [{ name: "test" }] } })

      await expect(av.getSession({ id: 'xxx' })).rejects.toThrowError(expect.objectContaining({
        statusCode: 404,
        message: expect.any(String),
      }))
    })

    test("history and lastRun are generated correctly as new runs are created", async () => {
      await updateConfig()

      let session = await createSession()
      expect(session.items).toEqual([])
      expect(session.lastRun).toBeUndefined()

      // First run, check 
      let run1 = await av.createRun({ sessionId: session.id, items: [baseInput], version: "1.0.0" })
      session = await av.getSession({ id: session.id })
      expect(session.items).toEqual([baseInput])
      expect(session.lastRun?.id).toBe(run1.id)

      run1 = await av.updateRun({ id: run1.id, items: [baseOutput], status: "completed" })
      session = await av.getSession({ id: session.id })
      expect(session.items).toEqual([baseInput, baseOutput])
      expect(session.lastRun?.id).toBe(run1.id)

      // Second run, failed, but items in the history
      let run2 = await av.createRun({ sessionId: session.id, items: [baseInput, baseStep, baseOutput], status: "failed", version: "1.0.0" })
      session = await av.getSession({ id: session.id })
      expect(session.items).toEqual([baseInput, baseOutput, baseInput, baseStep, baseOutput])
      expect(session.lastRun?.id).toBe(run2.id)

      // Retry, successful
      let run3 = await av.createRun({ sessionId: session.id, items: [baseInput, baseStep, baseOutput], status: "completed", version: "1.0.0" })
      session = await av.getSession({ id: session.id })
      expect(session.items).toEqual([baseInput, baseOutput, baseInput, baseStep, baseOutput])
      expect(session.lastRun?.id).toBe(run3.id)
    })

    test("state works properly", async () => {
      await updateConfig()

      let session = await createSession()
      expect(session.state).toBeNull();

      // First run, check 
      let run1 = await av.createRun({ sessionId: session.id, items: [baseInput], version: "1.0.0" })
      session = await av.getSession({ id: session.id })
      expect(session.state).toEqual(null)

      run1 = await av.updateRun({ id: run1.id, items: [baseOutput], status: "completed", state: { x: 1 } })
      session = await av.getSession({ id: session.id })
      expect(session.state).toEqual({ x: 1 })

      // Second run, failed
      let run2 = await av.createRun({ sessionId: session.id, items: [baseInput, baseStep, baseOutput], status: "failed", version: "1.0.0", state: { x: 2 } })
      session = await av.getSession({ id: session.id })
      expect(session.state).toEqual({ x: 2 })

      // Retry, successful
      let run3 = await av.createRun({ sessionId: session.id, items: [baseInput, baseStep, baseOutput], status: "completed", version: "1.0.0", state: { x: 3 } })
      session = await av.getSession({ id: session.id })
      expect(session.state).toEqual({ x: 3 })

      // can't change state after run is completed
      await expect(av.updateRun({ id: run3.id, state: { x: 4 } })).rejects.toThrowError(expect.objectContaining({
        statusCode: 422,
        message: expect.any(String),
      }))
    })



    // METADATA TESTS
    test("create / with known metadata / saved", async () => {
      await av.__updateConfig({ config: { agents: [{ name: "test", metadata: { product_id: z.string() } }] } })

      const session = await av.createSession({ agent: "test", userId: initUser1.id, metadata: { product_id: "123" } })
      expect(session).toMatchObject({
        agent: "test",
        metadata: {
          product_id: "123",
        }
      })
    })

    test("create / optional & nullable metadata / all saved as null", async () => {
      await av.__updateConfig({ config: { agents: [{ name: "test", metadata: { x: z.nullable(z.string()), y: z.nullable(z.number()) } }] } })

      const session = await av.createSession({ agent: "test", userId: initUser1.id })
      expect(session).toMatchObject({
        agent: "test",
        metadata: {
          x: null,
          y: null,
        }
      })
    })

    test("create / with known metadata + allowUnknownMetadata=false / saved", async () => {
      await av.__updateConfig({ config: { agents: [{ name: "test", metadata: { product_id: z.string() }, allowUnknownMetadata: false }] } })

      const session = await av.createSession({ agent: "test", userId: initUser1.id, metadata: { product_id: "123" } })
      expect(session).toMatchObject({
        agent: "test",
        metadata: {
          product_id: "123",
        }
      })
    })

    test("create / with unknown metadata / saved", async () => {
      await av.__updateConfig({ config: { agents: [{ name: "test" }] } })

      const session = await av.createSession({ agent: "test", userId: initUser1.id, metadata: { product_id: "123" } })
      expect(session).toMatchObject({
        agent: "test",
        metadata: {
          product_id: "123",
        }
      })
    })

    test("create / with unknown metadata + allowUnknownMetadata=false / failed", async () => {
      await av.__updateConfig({ config: { agents: [{ name: "test", allowUnknownMetadata: false }] } })

      await expect(av.createSession({ agent: "test", userId: initUser1.id, metadata: { product_id: "123" } })).rejects.toThrowError(expect.objectContaining({
        statusCode: 422,
        message: expect.any(String),
      }))
    })

    test("create / with incompatible metadata / fails", async () => {
      await av.__updateConfig({ config: { agents: [{ name: "test", metadata: { product_id: z.string() } }] } })

      await expect(av.createSession({ agent: "test", userId: initUser1.id, metadata: { product_id: 123 } })).rejects.toThrowError(expect.objectContaining({
        statusCode: 422,
        message: expect.any(String),
      }))
    })


    test("update metadata", async () => {
      await av.__updateConfig({ config: { agents: [{ name: "test", metadata: { field1: z.string(), field2: z.number() }, allowUnknownMetadata: false }] } })

      const session = await av.createSession({ agent: "test", metadata: { field1: "A", field2: 0 }, userId: initUser1.id })

      const updated = await av.updateSession({ id: session.id, metadata: { field1: "B", field2: 1 } })
      expect(updated.metadata).toEqual({ field1: "B", field2: 1 })

      const fetched = await av.getSession({ id: session.id })
      expect(fetched.metadata).toEqual({ field1: "B", field2: 1 })
    })

    test("update metadata - partial update", async () => {
      await av.__updateConfig({ config: { agents: [{ name: "test", metadata: { field1: z.string(), field2: z.number() }, allowUnknownMetadata: false }] } })

      const session = await av.createSession({ agent: "test", metadata: { field1: "A", field2: 0 }, userId: initUser1.id })

      const updated = await av.updateSession({ id: session.id, metadata: { field1: "B" } })
      expect(updated.metadata).toEqual({ field1: "B", field2: 0 })

      const fetched = await av.getSession({ id: session.id })
      expect(fetched.metadata).toEqual({ field1: "B", field2: 0 })
    })

    test("update metadata - make field null", async () => {
      await av.__updateConfig({ config: { agents: [{ name: "test", metadata: { field1: z.string(), field2: z.number().nullable() }, allowUnknownMetadata: false }] } })

      const session = await av.createSession({ agent: "test", metadata: { field1: "A", field2: 0 }, userId: initUser1.id })

      const updated = await av.updateSession({ id: session.id, metadata: { field2: null } })
      expect(updated.metadata).toEqual({ field1: "A", field2: null })

      const fetched = await av.getSession({ id: session.id })
      expect(fetched.metadata).toEqual({ field1: "A", field2: null })
    })

    test("update metadata only - validation enforced", async () => {
      await av.__updateConfig({ config: { agents: [{ name: "test", metadata: { product_id: z.string() }, allowUnknownMetadata: false }] } })

      const session = await av.createSession({ agent: "test", metadata: { product_id: "A" }, userId: initUser1.id })

      await expect(av.updateSession({ id: session.id, metadata: { wrong: "x" } })).rejects.toThrowError(expect.objectContaining({
        statusCode: 422,
        message: expect.any(String),
      }))
    })

    describe("get session list", () => {
      const USER_1_SESSIONS_COUNT = 20
      const USER_2_SESSIONS_COUNT = 7
      const PROD_USER_SESSIONS_COUNT = 20
      const TOTAL_SESSIONS_COUNT = USER_1_SESSIONS_COUNT + USER_2_SESSIONS_COUNT

      let user1Sessions: Session[] = []
      let user2Sessions: Session[] = []
      let prodUserSessions: Session[] = []

      let agentName = 'agent_' + Math.random().toString(36).slice(2)

      beforeAll(async () => {
        await av.__updateConfig({ config: { agents: [{ name: agentName }] } })

        // Create 20 sessions for testing
        user1Sessions = []
        for (let i = 0; i < USER_1_SESSIONS_COUNT; i++) {
          const session = await av.createSession({ agent: agentName, userId: initUser1.id })
          user1Sessions.push(session)
          await new Promise(resolve => setTimeout(resolve, 10)) // Small delay to ensure different updatedAt timestamps
        }

        user2Sessions = []
        for (let i = 0; i < USER_2_SESSIONS_COUNT; i++) {
          const session = await av.createSession({ agent: agentName, userId: initUser2.id })
          user2Sessions.push(session)
          await new Promise(resolve => setTimeout(resolve, 10)) // Small delay to ensure different updatedAt timestamps
        }

        prodUserSessions = []
        for (let i = 0; i < PROD_USER_SESSIONS_COUNT; i++) {
          const session = await av.createSession({ agent: agentName, userId: initProdUser.id })
          prodUserSessions.push(session)
          await new Promise(resolve => setTimeout(resolve, 10)) // Small delay to ensure different updatedAt timestamps
        }
      })

      test("no pagination params", async () => {
        const result = await av.getSessions({ agent: agentName })

        expect(result.sessions).toBeDefined()
        expect(Array.isArray(result.sessions)).toBe(true)
        expect(result.sessions.length).toEqual(TOTAL_SESSIONS_COUNT)

        expect(result.pagination).toMatchObject({
          page: 1,
          totalCount: TOTAL_SESSIONS_COUNT,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        })
      })

      test("5 items per page, first page", async () => {
        const result = await av.getSessions({ agent: agentName, limit: 5, page: 1 })

        expect(result.sessions).toBeDefined()
        expect(result.sessions.length).toBe(5)
        expect(result.pagination).toBeDefined()
        expect(result.pagination.totalCount).toEqual(TOTAL_SESSIONS_COUNT)
        expect(result.pagination.page).toBe(1)
        expect(result.pagination.limit).toBe(5)
        expect(result.pagination.totalPages).toEqual(Math.ceil(TOTAL_SESSIONS_COUNT / 5))
        expect(result.pagination.hasNextPage).toBe(true)
        expect(result.pagination.hasPreviousPage).toBe(false)
      })

      test("5 items per page, second page", async () => {
        const result = await av.getSessions({ agent: agentName, limit: 5, page: 2 })

        expect(result.sessions).toBeDefined()
        expect(result.sessions.length).toBe(5)
        expect(result.pagination).toBeDefined()
        expect(result.pagination.page).toBe(2)
        expect(result.pagination.limit).toBe(5)
        expect(result.pagination.hasNextPage).toBe(true)
        expect(result.pagination.hasPreviousPage).toBe(true)
      })

      test("5 items per page, last page", async () => {
        const itemsPerPage = 5
        const lastPage = Math.ceil(TOTAL_SESSIONS_COUNT / itemsPerPage)

        const result = await av.getSessions({ agent: agentName, limit: 5, page: lastPage })

        expect(result.sessions).toBeDefined()
        expect(result.sessions.length).toBeGreaterThan(0)
        expect(result.sessions.length).toBeLessThanOrEqual(5)
        expect(result.pagination).toBeDefined()
        expect(result.pagination.page).toBe(lastPage)
        expect(result.pagination.limit).toBe(5)
        expect(result.pagination.hasNextPage).toBe(false)
        expect(result.pagination.hasPreviousPage).toBe(true)
      })


      test("5 items per page, page well beyond last page", async () => {
        const itemsPerPage = 5
        const lastPage = Math.ceil(TOTAL_SESSIONS_COUNT / itemsPerPage)

        const result = await av.getSessions({ agent: agentName, limit: 5, page: 100 })

        expect(result.sessions).toBeDefined()
        expect(result.sessions.length).toEqual(0)
        expect(result.pagination).toBeDefined()
        expect(result.pagination.page).toBe(100)
        expect(result.pagination.limit).toBe(5)
        expect(result.pagination.hasNextPage).toBe(false)
        expect(result.pagination.hasPreviousPage).toBe(true)
      })

      test("different page numbers", async () => {
        const page3 = await av.getSessions({ limit: 5, page: 3 })
        expect(page3.pagination.page).toBe(3)
        expect(page3.sessions.length).toBe(5)

        const page4 = await av.getSessions({ limit: 5, page: 4 })
        expect(page4.pagination.page).toBe(4)
        expect(page4.sessions.length).toBe(5)
      })

      test("page limit exceeds maximum (999999) should error", async () => {
        await expect(av.getSessions({ agent: agentName, limit: 999999 })).rejects.toThrowError(expect.objectContaining({
          statusCode: 422,
          message: expect.any(String)
        }))
      })

      test("user scoping works", async () => {
        const user1FetchedSessions = await av.as(initUser1).getSessions({ agent: agentName, limit: 10 })
        const user2FetchedSessions = await av.as(initUser2).getSessions({ agent: agentName, limit: 10 })

        expect(user1FetchedSessions.sessions.length).toBe(10)
        expect(user1FetchedSessions.sessions.every(session => session.userId === initUser1.id)).toBe(true)
        expect(user1FetchedSessions.pagination.totalCount).toBe(USER_1_SESSIONS_COUNT)

        expect(user2FetchedSessions.sessions.length).toBe(7)
        expect(user2FetchedSessions.sessions.every(session => session.userId === initUser2.id)).toBe(true)
        expect(user2FetchedSessions.pagination.totalCount).toBe(USER_2_SESSIONS_COUNT)
      })

      test("[public api] works", async () => {
        const avPublic1 = new PublicAgentView({
          apiUrl,
          userToken: initUser1.token
        })

        const user1FetchedSessions = await avPublic1.getSessions({ agent: agentName, limit: 10 })

        expect(user1FetchedSessions.sessions.length).toBe(10)
        expect(user1FetchedSessions.sessions.every(session => session.userId === initUser1.id)).toBe(true)
        expect(user1FetchedSessions.pagination.totalCount).toBe(USER_1_SESSIONS_COUNT)


        const avPublic2 = new PublicAgentView({
          apiUrl,
          userToken: initUser2.token
        })

        const user2FetchedSessions = await avPublic2.getSessions({ agent: agentName, limit: 10 })

        expect(user2FetchedSessions.sessions.length).toBe(7)
        expect(user2FetchedSessions.sessions.every(session => session.userId === initUser2.id)).toBe(true)
        expect(user2FetchedSessions.pagination.totalCount).toBe(USER_2_SESSIONS_COUNT)
      })

    })
  })


  describe("runs", () => {
    test("creating run with non-existing sessionId", async () => {
      await updateConfig()

      await expect(av.createRun({ sessionId: 'non-existing', items: [baseInput], version: "1.0.0" })).rejects.toThrowError(expect.objectContaining({
        statusCode: 404,
        message: expect.any(String),
      }))
    })

    test("updating run with non-existing run id", async () => {
      await updateConfig()

      await expect(av.updateRun({ id: 'non-existing', items: [baseOutput] })).rejects.toThrowError(expect.objectContaining({
        statusCode: 404,
        message: expect.any(String),
      }))
    })

    test("creating run without items", async () => {
      await updateConfig()
      const session = await createSession()

      await expect(av.createRun({ sessionId: session.id, items: [], version: "1.0.0" })).rejects.toThrowError(expect.objectContaining({
        statusCode: 422,
        message: expect.any(String),
      }))
    })

    test("new run defaults to in_progress status", async () => {
      await updateConfig()
      const session = await createSession()

      const run = await av.createRun({ sessionId: session.id, items: [baseInput], version: "1.0.0" })
      expect(run.status).toBe("in_progress")
    })

    test("cannot create new run while previous is in progress", async () => {
      await updateConfig()
      const session = await createSession()

      await av.createRun({ sessionId: session.id, items: [baseInput], version: "1.0.0" })
      await expect(av.createRun({ sessionId: session.id, items: [baseInput], version: "1.0.0" })).rejects.toThrowError(expect.objectContaining({
        statusCode: 422,
        message: expect.any(String),
      }))
    })

    /** 
     * RUN STATES TESTS 
     * 
     * This is automated set of test cases where we test different scenarios of runs.
     **/

    // TODO: Better error messages from bad matches!!!

    const baseTestCases: Array<{ title: string, scenarios: any[], lastRunStatus: ("in_progress" | "completed" | "failed" | undefined)[], error?: number | null, validateSteps?: boolean, strictMatching?: boolean, only?: boolean }> = [
      {
        title: "just input & output",
        scenarios: [
          [[baseInput, baseOutput]],
          [[baseInput], [baseOutput]]
        ],
        lastRunStatus: ["completed", "failed"],
        error: null
      },
      {
        title: "input, 2 items, output",
        scenarios: [
          [[baseInput, baseStep, baseStep, baseOutput]],
          [[baseInput], [baseStep], [baseStep], [baseOutput]],
          [[baseInput], [baseStep, baseStep], [baseOutput]],
          [[baseInput], [baseStep, baseStep, baseOutput]],
        ],
        lastRunStatus: ["completed", "failed", undefined], // in_progress (undefined) doesn't throw because we don't validate steps -> therefore output can be treated as step. 
        error: null
      },
      {
        title: "input, 2 items, output",
        scenarios: [
          [[baseInput, baseStep, baseStep, baseOutput]],
          [[baseInput], [baseStep], [baseStep], [baseOutput]],
          [[baseInput], [baseStep, baseStep], [baseOutput]],
          [[baseInput], [baseStep, baseStep, baseOutput]],
        ],
        lastRunStatus: [undefined],
        validateSteps: true,
        error: 422,
      },
      {
        title: "input, 2 steps, no output",
        scenarios: [
          [[baseInput, baseStep, baseStep]],
          [[baseInput], [baseStep], [baseStep]],
          [[baseInput], [baseStep, baseStep]],
        ],
        lastRunStatus: ["failed"],
        error: null
      },
      {
        title: "input, 2 items, no output",
        scenarios: [
          [[baseInput, baseStep, baseStep]],
          [[baseInput], [baseStep], [baseStep]],
          [[baseInput], [baseStep, baseStep]],
        ],
        lastRunStatus: ["completed"],
        error: 422
      },
      {
        title: "single item",
        scenarios: [
          [[baseInput]],
        ],
        lastRunStatus: ["completed"],
        error: 422
      },
      {
        title: "single item",
        scenarios: [
          [[baseInput]],
        ],
        lastRunStatus: ["failed"],
        error: null
      },

      // Validation
      {
        title: "loose matching -> extra fields saved",
        scenarios: [
          [[baseInputExt, baseStepExt, baseStepExt, baseOutputExt]],
          [[baseInputExt], [baseStepExt], [baseStepExt], [baseOutputExt]],
          [[baseInputExt], [baseStepExt, baseStepExt], [baseOutputExt]],
          [[baseInputExt], [baseStepExt, baseStepExt, baseOutputExt]],
        ],
        lastRunStatus: ["completed", "failed"],
        error: null
      },
      {
        title: "strict matching -> extra fields trimmed",
        strictMatching: true,
        scenarios: [
          [[baseInputExt, baseOutputExt]],
          [[baseInput], [baseStep, baseStep], [baseOutputExt]],
          [[baseInput, baseStep, baseStep, baseOutputExt]],
        ],
        lastRunStatus: ["completed"],
        error: null
      },
      {
        title: "incorrect input item",
        scenarios: [
          [[wrongInput]],
          [[wrongInput, baseStep]],
          [[wrongInput, baseStep, baseStep, baseOutput]]
        ],
        lastRunStatus: ["completed", "failed"],
        error: 422
      },
      {
        title: "incorrect output item",
        scenarios: [
          [[baseInput, baseStep, wrongOutput]],
          [[baseInput], [baseStep], [wrongOutput]],
          [[baseInput], [baseStep, wrongOutput]],
        ],
        lastRunStatus: ["completed"],
        error: 422
      },
      {
        title: "incorrect output item",
        scenarios: [
          [[baseInput, baseStep, wrongOutput]],
          [[baseInput], [baseStep], [wrongOutput]],
          [[baseInput], [baseStep, wrongOutput]],
        ],
        lastRunStatus: ["failed"],
        error: null // when there is no step validation and status becomes "failed", we don't know if the last item was output or step
      },
      {
        title: "incorrect step item, validateSteps=false",
        scenarios: [
          [[baseInput, baseStep, wrongStep]],
          [[baseInput], [baseStep], [wrongStep]],
          [[baseInput], [baseStep, wrongStep]],
        ],
        // validateSteps: false -> default
        lastRunStatus: [undefined],
        error: null,
      },
      {
        title: "incorrect step item, validateSteps=true",
        scenarios: [
          [[baseInput, baseStep, wrongStep]],
          [[baseInput], [baseStep], [wrongStep]],
          [[baseInput], [baseStep, wrongStep]],
        ],
        validateSteps: true,
        lastRunStatus: [undefined],
        error: 422,
      },
      // Tool calls validation
      {
        title: "tool calls, correct call, sequential",
        scenarios: [
          [[baseInput, fun1Call("xxx"), funResult("xxx"), baseOutput]],
          [[baseInput, fun1Call("xxx"), funResult("xxx"), fun2Call("yyy"), funResult("yyy"), baseOutput]],
          [[baseInput], [fun1Call("id1")], [funResult("id1")], [fun2Call("id2")], [funResult("id2")], [baseOutput]],
          [[baseInput], [fun1Call("id1")], [funResult("id1"), fun2Call("id2")], [funResult("id2"), baseOutput]],
        ],
        validateSteps: true,
        lastRunStatus: ["completed", "failed"],
        error: null,
      },
      {
        title: "tool calls, correct call, paralell",
        scenarios: [
          [[baseInput, fun1Call("1"), fun2Call("2"), fun1Call("3"), funResult("3"), funResult("1"), funResult("2"), baseOutput]],
        ],
        validateSteps: true,
        lastRunStatus: ["completed", "failed"],
        error: null,
      },
      {
        title: "tool calls, not matching result",
        scenarios: [
          [[baseInput, funResult("xxx")]],
          [[baseInput], [funResult("xxx")]],

          [[baseInput, fun1Call("xxx"), funResult("xxx_different")]],
          [[baseInput], [fun1Call("xxx")], [funResult("xxx_different")]],
        ],
        validateSteps: true,
        lastRunStatus: [undefined],
        error: 422,
      },
    ]

    for (const testCase of baseTestCases) {
      let counter = 0;
      for (const scenario of testCase.scenarios) {
        counter++;

        for (const lastRunStatus of testCase.lastRunStatus) {
          const title = `${testCase.title} / scenario ${counter} / ${lastRunStatus} -> ${testCase.error ? `error ${testCase.error}` : "ok"}`

          const testFn = testCase.only ? test.only : test;

          testFn(title, async () => {
            await updateConfig({ strictMatching: testCase.strictMatching, validateSteps: testCase.validateSteps });

            const session = await createSession()

            let run: Run | undefined;
            let expected_history: any[] = [];

            for (const iteration of scenario) {
              const isLast = iteration === scenario[scenario.length - 1];
              const isFirst = iteration === scenario[0];

              let expectedStatus: string;
              let expectedHasFinishedAt: boolean;
              let promise: any;

              if (isFirst && isLast) {
                promise = av.createRun({ sessionId: session.id, items: iteration, version: "1.0.0", status: lastRunStatus });
                expectedStatus = lastRunStatus ?? "in_progress";
                expectedHasFinishedAt = expectedStatus !== "in_progress";
              } else if (isLast) {
                promise = av.updateRun({ id: run!.id, items: iteration, status: lastRunStatus })
                expectedStatus = lastRunStatus ?? "in_progress";
                expectedHasFinishedAt = expectedStatus !== "in_progress";
              } else if (isFirst) {
                promise = av.createRun({ sessionId: session.id, items: iteration, version: "1.0.0" })
                expectedStatus = "in_progress";
                expectedHasFinishedAt = false;
              } else {
                promise = av.updateRun({ id: run!.id, items: iteration })
                expectedStatus = "in_progress";
                expectedHasFinishedAt = false;
              }

              if (testCase.error && isLast) {
                await expect(promise).rejects.toThrowError(expect.objectContaining({
                  statusCode: testCase.error,
                  message: expect.any(String),
                }))

                const { items, lastRun } = await av.getSession({ id: session.id });
                expect(deepCompare(items, expected_history)).toBe(true)

                if (lastRun) {
                  expect(lastRun.status).toBe("in_progress")
                }
              }
              else {
                run = await promise! as Run;
                expect(run.status).toBe(expectedStatus)

                if (expectedHasFinishedAt) {
                  expect(run.finishedAt).toBeTruthy()
                } else {
                  expect(run.finishedAt).toBeNull()
                }

                if (testCase.strictMatching) {
                  expected_history = [...expected_history, ...removeDoubleUnderscoreKeys(iteration)]; // for strict matching we expect all the extra fields to be trimmed, we represent them as __{field}
                }
                else {
                  expected_history = [...expected_history, ...iteration];
                }

                const { lastRun, items } = await av.getSession({ id: session.id });

                // console.log('history', history);
                // console.log('expected_history', expected_history);
                expect(deepCompare(items, expected_history)).toBe(true)

                expect(lastRun?.status).toBe(expectedStatus)
              }
            }
          })
        }
      }
    }


    test("cannot add items or change status after completion", async () => {
      await updateConfig()
      const session = await createSession()

      const run = await av.createRun({ sessionId: session.id, items: [baseInput], version: "1.0.0" })
      const completed = await av.updateRun({ id: run.id, items: [baseOutput], status: "completed", metadata: { trace_id: "abc" } })
      expect(completed.status).toBe("completed")

      await expect(av.updateRun({ id: run.id, items: [baseStep] })).rejects.toThrowError(expect.objectContaining({
        statusCode: 422,
        message: expect.any(String),
      }))

      await expect(av.updateRun({ id: run.id, status: "failed" })).rejects.toThrowError(expect.objectContaining({
        statusCode: 422,
        message: expect.any(String),
      }))

    })

    test("failReason can be set only on failed runs", async () => {
      await updateConfig()
      const session = await createSession()

      const run = await av.createRun({ sessionId: session.id, items: [baseInput], version: "1.0.0" })

      const failReason = { message: "oops" }

      await expect(av.updateRun({ id: run.id, items: [baseStep], failReason })).rejects.toThrowError(expect.objectContaining({
        statusCode: 422,
        message: expect.any(String),
      }))

      await expect(av.updateRun({ id: run.id, items: [baseOutput], failReason, status: "completed" })).rejects.toThrowError(expect.objectContaining({
        statusCode: 422,
        message: expect.any(String),
      }))

      const updated = await av.updateRun({ id: run.id, items: [baseOutput], status: "failed", failReason })
      expect(updated.failReason).toEqual(failReason)
    })


    describe("versioning", () => {
      test("incorrect formats fail", async () => {
        await updateConfig()
        const session = await createSession()

        await expectToFail(av.createRun({ sessionId: session.id, items: [baseInput], version: "xxx" }), 422)
        await expectToFail(av.createRun({ sessionId: session.id, items: [baseInput], version: "blah.blah.blah" }), 422)

      })

      test("compatibility enforced - playground", async () => {
        await updateConfig()
        const session = await createSession()

        await av.createRun({ sessionId: session.id, items: [baseInput, baseOutput], status: "completed", version: "1.2" }) // allow for partial version
        await av.createRun({ sessionId: session.id, items: [baseInput, baseOutput], status: "completed", version: "1.2.3" })
        await av.createRun({ sessionId: session.id, items: [baseInput, baseOutput], status: "completed", version: "1.2.4" }) // higher patch works
        await av.createRun({ sessionId: session.id, items: [baseInput, baseOutput], status: "completed", version: "1.3.0" }) // higher minor works

        await expectToFail(av.createRun({ sessionId: session.id, items: [baseInput, baseOutput], version: "1.2.2" }), 422) // smaller patch fails
        await expectToFail(av.createRun({ sessionId: session.id, items: [baseInput, baseOutput], version: "2.0.0" }), 422) // different minor fails

        // suffixes
        await av.createRun({ sessionId: session.id, items: [baseInput, baseOutput], status: "completed", version: "1.3.3" })
        await av.createRun({ sessionId: session.id, items: [baseInput, baseOutput], status: "completed", version: "1.3.3-dev" })
        await av.createRun({ sessionId: session.id, items: [baseInput, baseOutput], status: "completed", version: "1.3.3-xxx" })
        await av.createRun({ sessionId: session.id, items: [baseInput, baseOutput], status: "completed", version: "1.3.4" })
        await av.createRun({ sessionId: session.id, items: [baseInput, baseOutput], status: "completed", version: "1.3.4-local" })

        await expectToFail(av.createRun({ sessionId: session.id, items: [baseInput, baseOutput], version: "1.3.3-dev" }), 422) // smaller patch fails even with suffix
        await expectToFail(av.createRun({ sessionId: session.id, items: [baseInput, baseOutput], version: "1.3.3-xxx" }), 422) // different suffix fails
        await expectToFail(av.createRun({ sessionId: session.id, items: [baseInput, baseOutput], version: "2.0.0" }), 422) // different suffix fails
        await expectToFail(av.createRun({ sessionId: session.id, items: [baseInput, baseOutput], version: "2.0.0-dev" }), 422) // different suffix fails
      })


      test("compatibility enforced - production", async () => {
        await updateConfig()
        const session = await av.createSession({ agent: "test", userId: initProdUser.id })

        await expectToFail(av.createRun({ sessionId: session.id, items: [baseInput, baseOutput], version: "1.3.0-dev" }), 422) // production can't have suffixes
        await expectToFail(av.createRun({ sessionId: session.id, items: [baseInput, baseOutput], version: "1.3.1-local" }), 422) // production can't have suffixes
      })

    });

    test("userToken scoped permissions", async () => {
      await updateConfig()
      const session = await createSession()

      await expect(av.as(initUser2).createRun({ sessionId: session.id, items: [baseInput], version: "1.0.0" })).rejects.toThrowError(expect.objectContaining({
        statusCode: 401,
        message: expect.any(String),
      }))
    })

    // METADATA

    test("create / with known metadata / saved", async () => {
      await updateConfig({ runMetadata: { product_id: z.string() } })
      const session = await createSession()
      const run = await av.createRun({ sessionId: session.id, items: [baseInput], version: "1.0.0", metadata: { product_id: "123" } })

      expect(run.metadata).toMatchObject({
        product_id: "123",
      })
    })

    test("create / optional & nullable metadata / all saved as null", async () => {
      await updateConfig({ runMetadata: { x: z.nullable(z.string()), y: z.nullable(z.number()) } })

      const session = await createSession()
      const run = await av.createRun({ sessionId: session.id, items: [baseInput], version: "1.0.0", metadata: { product_id: "123" } })

      expect(run.metadata).toMatchObject({
        x: null,
        y: null,
      })
    })

    test("create / with known metadata + allowUnknownMetadata=false / saved", async () => {
      await updateConfig({ runMetadata: { product_id: z.string() }, allowUnknownMetadata: false })

      const session = await createSession()
      const run = await av.createRun({
        sessionId: session.id,
        items: [baseInput],
        version: "1.0.0",
        metadata: { product_id: "123" }
      })

      expect(run.metadata).toMatchObject({
        product_id: "123",
      })
    })

    test("create / with unknown metadata / saved", async () => {
      await updateConfig()
      const session = await createSession()
      const run = await av.createRun({
        sessionId: session.id,
        items: [baseInput],
        version: "1.0.0",
        metadata: { product_id: "123" }
      })

      expect(run.metadata).toMatchObject({
        product_id: "123",
      })
    })

    test("create / with unknown metadata + allowUnknownMetadata=false / failed", async () => {
      await updateConfig({ allowUnknownMetadata: false })

      const session = await createSession()
      await expect(av.createRun({
        sessionId: session.id,
        items: [baseInput],
        version: "1.0.0",
        metadata: { product_id: "123" }
      })).rejects.toThrowError(expect.objectContaining({
        statusCode: 422,
        message: expect.any(String),
      }))
    })

    test("create / with incompatible metadata / fails", async () => {
      await updateConfig({ runMetadata: { product_id: z.string() } })

      const session = await createSession()
      await expect(av.createRun({
        sessionId: session.id,
        items: [baseInput],
        version: "1.0.0",
        metadata: { product_id: 123 }
      })).rejects.toThrowError(expect.objectContaining({
        statusCode: 422,
        message: expect.any(String),
      }))
    })

    test("update metadata", async () => {
      await updateConfig({ runMetadata: { field1: z.string(), field2: z.number() }, allowUnknownMetadata: false })

      const session = await createSession()
      const run = await av.createRun({
        sessionId: session.id,
        items: [baseInput],
        version: "1.0.0",
        metadata: { field1: "A", field2: 0 }
      })

      const updated = await av.updateRun({ id: run.id, metadata: { field1: "B", field2: 1 } })
      expect(updated.metadata).toEqual({ field1: "B", field2: 1 })
    })

    test("update metadata - partial update", async () => {
      await updateConfig({ runMetadata: { field1: z.string(), field2: z.number() }, allowUnknownMetadata: false })

      const session = await createSession()
      const run = await av.createRun({
        sessionId: session.id,
        items: [baseInput],
        version: "1.0.0",
        metadata: { field1: "A", field2: 0 }
      })

      const updated = await av.updateRun({ id: run.id, metadata: { field1: "B" } })
      expect(updated.metadata).toEqual({ field1: "B", field2: 0 })
    })

    test("update metadata - make field null", async () => {
      await updateConfig({ runMetadata: { field1: z.string(), field2: z.number().nullable() }, allowUnknownMetadata: false })

      const session = await createSession()
      const run = await av.createRun({
        sessionId: session.id,
        items: [baseInput],
        version: "1.0.0",
        metadata: { field1: "A", field2: 0 }
      })

      const updated = await av.updateRun({ id: run.id, metadata: { field2: null } })
      expect(updated.metadata).toEqual({ field1: "A", field2: null })
    })

    test("update metadata only - validation enforced", async () => {
      await updateConfig({ runMetadata: { product_id: z.string() }, allowUnknownMetadata: false })

      const session = await createSession()
      const run = await av.createRun({
        sessionId: session.id,
        items: [baseInput],
        version: "1.0.0",
        metadata: { product_id: "A" }
      })

      await expect(av.updateRun({ id: run.id, metadata: { wrong: "x" } })).rejects.toThrowError(expect.objectContaining({
        statusCode: 422,
        message: expect.any(String),
      }))
    })

    test("metadata can be updated AFTER the run is completed", async () => {
      await updateConfig({ runMetadata: { product_id: z.string() } })
      const session = await createSession()
      let run = await av.createRun({ sessionId: session.id, items: [baseInput], version: "1.0.0", metadata: { product_id: "123" } })

      expect(run.metadata).toMatchObject({
        product_id: "123",
      })

      run = await av.updateRun({ id: run.id, items: [baseOutput], status: "completed", metadata: { product_id: "456" } })
      expect(run.metadata).toMatchObject({
        product_id: "456",
      })

      run = await av.updateRun({ id: run.id, metadata: { product_id: "789" } })
      expect(run.metadata).toMatchObject({
        product_id: "789",
      })
    })

  })
});


/** Quick JSON.parse-based deep compare, ignores order of keys in objects */
function deepCompare(a: any, b: any): boolean {
  // simple primitives and types
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;

  // arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepCompare(a[i], b[i])) return false;
    }
    return true;
  }

  // plain objects
  if (typeof a === "object" && typeof b === "object") {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    for (const key of aKeys) {
      if (!bKeys.includes(key)) return false;
      if (!deepCompare(a[key], b[key])) return false;
    }
    return true;
  }

  // fallback
  return false;
}


function removeDoubleUnderscoreKeys(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(removeDoubleUnderscoreKeys);
  } else if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      if (!key.startsWith('__')) {
        result[key] = removeDoubleUnderscoreKeys(obj[key]);
      }
    }
    return result;
  }
  return obj;
}
