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
      console.log(configRow.config);
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

    test("create / optional & nullable metadata / all saved as null", async () => {
      await av.__updateConfig({ config: { agents: [{ name: "test", url: "https://test.com", metadata: { x: z.nullable(z.string()), y: z.nullable(z.number()) } }] } })

      const session = await av.createSession({ agent: "test", endUserId: initEndUser1.id })
      expect(session).toMatchObject({
        agent: "test",
        metadata: {
          x: null,
          y: null,
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
    
    test("update metadata", async () => {
      await av.__updateConfig({ config: { agents: [{ name: "test", url: "https://test.com", metadata: { field1: z.string(), field2: z.number() }, allowUnknownMetadata: false }] } })

      const session = await av.createSession({ agent: "test", metadata: { field1: "A", field2: 0 }, endUserId: initEndUser1.id })
      
      const updated = await av.updateSession({ id: session.id, metadata: { field1: "B", field2: 1 } })
      expect(updated.metadata).toEqual({ field1: "B", field2: 1 })

      const fetched = await av.getSession({ id: session.id })
      expect(fetched.metadata).toEqual({ field1: "B", field2: 1 })
    })

    test("update metadata - partial update", async () => {
      await av.__updateConfig({ config: { agents: [{ name: "test", url: "https://test.com", metadata: { field1: z.string(), field2: z.number() }, allowUnknownMetadata: false }] } })

      const session = await av.createSession({ agent: "test", metadata: { field1: "A", field2: 0 }, endUserId: initEndUser1.id })
      
      const updated = await av.updateSession({ id: session.id, metadata: { field1: "B" } })
      expect(updated.metadata).toEqual({ field1: "B", field2: 0 })

      const fetched = await av.getSession({ id: session.id })
      expect(fetched.metadata).toEqual({ field1: "B", field2: 0 })
    })

    test("update metadata - make field null", async () => {
      await av.__updateConfig({ config: { agents: [{ name: "test", url: "https://test.com", metadata: { field1: z.string(), field2: z.number().nullable() }, allowUnknownMetadata: false }] } })

      const session = await av.createSession({ agent: "test", metadata: { field1: "A", field2: 0 }, endUserId: initEndUser1.id })
      
      const updated = await av.updateSession({ id: session.id, metadata: { field2: null } })
      expect(updated.metadata).toEqual({ field1: "A", field2: null })

      const fetched = await av.getSession({ id: session.id })
      expect(fetched.metadata).toEqual({ field1: "A", field2: null })
    })

    test("update metadata only - validation enforced", async () => {
      await av.__updateConfig({ config: { agents: [{ name: "test", url: "https://test.com", metadata: { product_id: z.string() }, allowUnknownMetadata: false }] } })

      const session = await av.createSession({ agent: "test", metadata: { product_id: "A" }, endUserId: initEndUser1.id })

      await expect(av.updateSession({ id: session.id, metadata: { wrong: "x" } })).rejects.toThrowError(expect.objectContaining({
        statusCode: 422,
        message: expect.any(String),
      }))
    })
  })

  // TODO - run scenarios:
  // - creating run `in_progress` - wrong / correct sessionId (do not explicitly give status, default is in progress)
  // - creating run `in_progress` - check `history`, `lastRun`, `state`
  // - creating run `in_progress` - no input item (error)
  // - creating run `in_progress` - check status after (in progress)
  // - creating run `in_progress` - metadata (scenarios from above like in session, literally identical)
  // - updating run while `in_progress` (with new items)
  // - updating run while `in_progress` - `state`
  // - updating run while `in_progress` (with updated metadata)
  // - closing run successfully
  // - closing run with failure (failReason, status)
  // - modifying run after completion (fail or complete): cannot add items, metadata CAN be updated, status can't be changed -> all the not allowed operations should be tested
  // - failReason can be only set on failed runs
  // - versioning tests!!! (all the scenarios)
  // - permissions (providing endUserToken which suggests the session is not owned by the user). It should be fail.
  // - items validation!!! (all the scenarios)

  // describe("runs", () => {
  //   const baseAgentConfig = {
  //     name: "test",
  //     url: "https://test.com",
  //     allowUnknownRuns: false,
  //     allowUnknownSteps: false,
  //     allowUnknownItemKeys: false,
  //     runs: [
  //       {
  //         input: { schema: { type: z.literal("message"), role: z.literal("user"), content: z.string() } },
  //         steps: [{ schema: { type: z.literal("reasoning"), content: z.string() } }],
  //         output: { schema: { type: z.literal("message"), role: z.literal("assistant"), content: z.string() } },
  //         metadata: { trace_id: z.string() },
  //         allowUnknownMetadata: false,
  //       }
  //     ]
  //   }

  //   const baseInput = { type: "message", role: "user", content: "Hello" }
  //   const baseOutput = { type: "message", role: "assistant", content: "Hi there" }
  //   const baseStep = { type: "reasoning", content: "Thinking..." }

  //   const updateConfig = async (agentOverrides: Partial<typeof baseAgentConfig> = {}) => {
  //     await av.__updateConfig({ config: { agents: [{ ...baseAgentConfig, ...agentOverrides }] } })
  //   }

  //   const createSession = async () => {
  //     return await av.createSession({ agent: "test", endUserId: initEndUser1.id })
  //   }

  //   test("creating run - wrong sessionId", async () => {
  //     await updateConfig()

  //     await expect(av.createRun({ sessionId: 'non-existing', items: [baseInput], version: "1.0.0" })).rejects.toThrowError(expect.objectContaining({
  //       statusCode: 404,
  //       message: expect.any(String),
  //     }))
  //   })

  //   test("creating run in progress populates history, lastRun and state", async () => {
  //     await updateConfig()
  //     const session = await createSession()

  //     const run = await av.createRun({ sessionId: session.id, items: [baseInput], version: "1.0.0", state: { step: 1 } })
  //     expect(run.status).toBe("in_progress")

  //     const fetched = await av.getSession({ id: session.id })
  //     const items = fetched.runs.flatMap((r) => r.items.map((i) => i.content))
  //     expect(items).toEqual([baseInput])
  //     expect(fetched.runs[fetched.runs.length - 1].id).toBe(run.id)
  //     expect(fetched.state).toEqual({ step: 1 })
  //   })

  //   test("creating run requires at least one item", async () => {
  //     await updateConfig()
  //     const session = await createSession()

  //     await expect(av.createRun({ sessionId: session.id, items: [], version: "1.0.0" })).rejects.toThrowError(expect.objectContaining({
  //       statusCode: 422,
  //       message: expect.any(String),
  //     }))
  //   })

  //   test("run defaults to in_progress status", async () => {
  //     await updateConfig()
  //     const session = await createSession()

  //     const run = await av.createRun({ sessionId: session.id, items: [baseInput], version: "1.0.0" })
  //     expect(run.status).toBe("in_progress")
  //   })

  //   test("run metadata validated and stored", async () => {
  //     await updateConfig()
  //     const session = await createSession()

  //     const run = await av.createRun({ sessionId: session.id, items: [baseInput], version: "1.0.0", metadata: { trace_id: "abc" } })
  //     expect(run.metadata).toEqual({ trace_id: "abc" })

  //     await expect(av.createRun({ sessionId: session.id, items: [baseInput], version: "1.0.0", metadata: { wrong: "x" } })).rejects.toThrowError(expect.objectContaining({
  //       statusCode: 422,
  //       message: expect.any(String),
  //     }))
  //   })

  //   test("updating in-progress run appends items and updates state/metadata", async () => {
  //     await updateConfig()
  //     const session = await createSession()

  //     const run = await av.createRun({ sessionId: session.id, items: [baseInput], version: "1.0.0", metadata: { trace_id: "abc" } })
  //     const updated = await av.updateRun({ id: run.id, items: [baseStep], state: { step: 2 }, metadata: { trace_id: "def" } })

  //     expect(updated.items.map((i) => i.content)).toEqual([baseInput, baseStep])
  //     expect(updated.metadata).toEqual({ trace_id: "def" })

  //     const fetched = await av.getSession({ id: session.id })
  //     expect(fetched.state).toEqual({ step: 2 })
  //   })

  //   test("closing run successfully", async () => {
  //     await updateConfig()
  //     const session = await createSession()

  //     const run = await av.createRun({ sessionId: session.id, items: [baseInput], version: "1.0.0" })
  //     const updated = await av.updateRun({ id: run.id, items: [baseOutput], status: "completed" })

  //     expect(updated.status).toBe("completed")
  //     expect(updated.finishedAt).toBeTruthy()
  //     expect(updated.items.map((i) => i.content)).toEqual([baseInput, baseOutput])
  //   })

  //   test("closing run with failure", async () => {
  //     await updateConfig()
  //     const session = await createSession()

  //     const run = await av.createRun({ sessionId: session.id, items: [baseInput], version: "1.0.0" })
  //     const updated = await av.updateRun({ id: run.id, status: "failed", failReason: { message: "boom" } })

  //     expect(updated.status).toBe("failed")
  //     expect(updated.failReason).toEqual({ message: "boom" })
  //     expect(updated.finishedAt).toBeTruthy()
  //   })

  //   test("cannot add items or change status after completion, metadata can be updated", async () => {
  //     await updateConfig()
  //     const session = await createSession()

  //     const run = await av.createRun({ sessionId: session.id, items: [baseInput], version: "1.0.0" })
  //     const completed = await av.updateRun({ id: run.id, items: [baseOutput], status: "completed", metadata: { trace_id: "abc" } })
  //     expect(completed.status).toBe("completed")

  //     await expect(av.updateRun({ id: run.id, items: [baseStep] })).rejects.toThrowError(expect.objectContaining({
  //       statusCode: 400,
  //       message: expect.any(String),
  //     }))

  //     await expect(av.updateRun({ id: run.id, status: "failed" })).rejects.toThrowError(expect.objectContaining({
  //       statusCode: 400,
  //       message: expect.any(String),
  //     }))

  //     const withMetadata = await av.updateRun({ id: run.id, metadata: { trace_id: "def" } })
  //     expect(withMetadata.metadata).toEqual({ trace_id: "def" })
  //   })

  //   test("failReason can be set only on failed runs", async () => {
  //     await updateConfig()
  //     const session = await createSession()

  //     const run = await av.createRun({ sessionId: session.id, items: [baseInput], version: "1.0.0" })

  //     await expect(av.updateRun({ id: run.id, items: [baseOutput], status: "completed", failReason: { message: "oops" } })).rejects.toThrowError(expect.objectContaining({
  //       statusCode: 400,
  //       message: expect.any(String),
  //     }))
  //   })

  //   test("version compatibility enforced", async () => {
  //     await updateConfig()
  //     const session = await createSession()

  //     const run1 = await av.createRun({ sessionId: session.id, items: [baseInput], version: "1.2.3" })
  //     await av.updateRun({ id: run1.id, items: [baseOutput], status: "completed" })

  //     // higher patch works
  //     const run2 = await av.createRun({ sessionId: session.id, items: [baseInput], version: "1.2.4" })
  //     await av.updateRun({ id: run2.id, items: [baseOutput], status: "completed" })

  //     // smaller patch fails
  //     await expect(av.createRun({ sessionId: session.id, items: [baseInput], version: "1.2.2" })).rejects.toThrowError(expect.objectContaining({
  //       statusCode: 400,
  //       message: expect.any(String),
  //     }))

  //     // different minor fails
  //     await expect(av.createRun({ sessionId: session.id, items: [baseInput], version: "1.3.0" })).rejects.toThrowError(expect.objectContaining({
  //       statusCode: 400,
  //       message: expect.any(String),
  //     }))
  //   })

  //   test("cannot create new run while previous is in progress", async () => {
  //     await updateConfig()
  //     const session = await createSession()

  //     await av.createRun({ sessionId: session.id, items: [baseInput], version: "1.0.0" })

  //     await expect(av.createRun({ sessionId: session.id, items: [baseInput], version: "1.0.0" })).rejects.toThrowError(expect.objectContaining({
  //       statusCode: 400,
  //       message: expect.any(String),
  //     }))
  //   })

  //   test("allows unknown runs/steps/items by default", async () => {
  //     await av.__updateConfig({ config: { agents: [{ name: "loose", url: "https://test.com" }] } })
  //     const session = await av.createSession({ agent: "loose", endUserId: initEndUser1.id })

  //     const run = await av.createRun({ sessionId: session.id, items: [{ foo: "bar" }], version: "9.9.9" })
  //     expect(run.status).toBe("in_progress")
  //   })

  //   test("endUserToken scoped permissions", async () => {
  //     await updateConfig()
  //     const session = await createSession()

  //     await expect(av.createRun({ sessionId: session.id, items: [baseInput], version: "1.0.0", endUserToken: initEndUser2.token })).rejects.toThrowError(expect.objectContaining({
  //       statusCode: 401,
  //       message: expect.any(String),
  //     }))
  //   })

  //   test("items validation respects schema", async () => {
  //     await updateConfig()
  //     const session = await createSession()

  //     // wrong input
  //     await expect(av.createRun({ sessionId: session.id, items: [{ type: "message", content: "no role" }], version: "1.0.0" })).rejects.toThrowError(expect.objectContaining({
  //       statusCode: 422,
  //       message: expect.any(String),
  //     }))

  //     const run = await av.createRun({ sessionId: session.id, items: [baseInput], version: "1.0.0" })

  //     // wrong step
  //     await expect(av.updateRun({ id: run.id, items: [{ type: "other", content: "fail" }] })).rejects.toThrowError(expect.objectContaining({
  //       statusCode: 422,
  //       message: expect.any(String),
  //     }))

  //     // wrong output
  //     await expect(av.updateRun({ id: run.id, items: [{ type: "message", role: "assistant", extra: "???", content: "ok" }], status: "completed" })).rejects.toThrowError(expect.objectContaining({
  //       statusCode: 422,
  //       message: expect.any(String),
  //     }))
  //   })

  //   describe("items validation with defaults (allow unknown)", () => {
  //     const looseConfig = {
  //       name: "loose",
  //       url: "https://test.com",
  //       runs: [
  //         {
  //           input: { schema: { type: z.literal("message"), role: z.literal("user"), content: z.string() } },
  //           steps: [{ schema: { type: z.literal("reasoning"), content: z.string() } }],
  //           output: { schema: { type: z.literal("message"), role: z.literal("assistant"), content: z.string() } },
  //         }
  //       ]
  //     };

  //     const input = { type: "message", role: "user", content: "hi" };

  //     test("unknown keys allowed but known keys still validated (input/step/output)", async () => {
  //       await av.__updateConfig({ config: { agents: [looseConfig] } })
  //       const session = await av.createSession({ agent: "loose", endUserId: initEndUser1.id })

  //       // wrong type for known key -> fail even though unknown allowed
  //       await expect(av.createRun({ sessionId: session.id, items: [{ ...input, content: 123 }], version: "1.0.0" })).rejects.toThrowError(expect.objectContaining({
  //         statusCode: 422,
  //         message: expect.any(String),
  //       }))

  //       // unknown key on input -> allowed
  //       const run = await av.createRun({ sessionId: session.id, items: [{ ...input, extra: "x" }], version: "1.0.0" })
  //       expect(run.items[0].content.extra).toBe("x")

  //       // unknown key on step -> allowed
  //       const runWithStep = await av.updateRun({ id: run.id, items: [{ type: "reasoning", content: "thinking", foo: "bar" }] })
  //       expect(runWithStep.items[1].content.foo).toBe("bar")

  //       // unknown key on output -> allowed
  //       const completed = await av.updateRun({ id: run.id, items: [{ type: "message", role: "assistant", content: "ok", bar: "baz" }], status: "completed" })
  //       expect(completed.items[2].content.bar).toBe("baz")
  //     })
  //   })

  //   describe("run metadata validation allowUnknownMetadata", () => {
  //     test("known key correct type passes, unknown key allowed by default", async () => {
  //       await av.__updateConfig({ config: { agents: [{ name: "meta", url: "https://test.com", runs: [{ input: { schema: {} }, output: { schema: {} } }], metadata: { trace_id: z.string() } }] } })
  //       const session = await av.createSession({ agent: "meta", endUserId: initEndUser1.id })

  //       const run = await av.createRun({ sessionId: session.id, items: [{ any: "thing" }], version: "1.0.0", metadata: { trace_id: "abc", extra: "x" } })
  //       expect(run.metadata).toEqual({ trace_id: "abc", extra: "x" })
  //     })

  //     test("unknown metadata key rejected when allowUnknownMetadata=false", async () => {
  //       await av.__updateConfig({ config: { agents: [{ name: "meta-strict", url: "https://test.com", allowUnknownMetadata: false, runs: [{ input: { schema: {} }, output: { schema: {} }, allowUnknownMetadata: false, metadata: { trace_id: z.string() } }] }] } })
  //       const session = await av.createSession({ agent: "meta-strict", endUserId: initEndUser1.id })

  //       await expect(av.createRun({ sessionId: session.id, items: [{ any: "thing" }], version: "1.0.0", metadata: { trace_id: "abc", extra: "x" } })).rejects.toThrowError(expect.objectContaining({
  //         statusCode: 422,
  //         message: expect.any(String),
  //       }))
  //     })
  //   })

  //   test("allowUnknownRuns true allows unmatched input", async () => {
  //     await av.__updateConfig({ config: { agents: [{ name: "unknown-runs", url: "https://test.com", allowUnknownRuns: true, runs: [{ input: { schema: { type: z.literal("message") } }, output: { schema: {} } }] }] } })
  //     const session = await av.createSession({ agent: "unknown-runs", endUserId: initEndUser1.id })

  //     const run = await av.createRun({ sessionId: session.id, items: [{ type: "not-matching" }], version: "1.0.0" })
  //     expect(run.status).toBe("in_progress")
  //   })

  //   test("allowUnknownSteps true allows unexpected step shapes", async () => {
  //     await av.__updateConfig({ config: { agents: [{ name: "unknown-steps", url: "https://test.com", runs: [{ input: { schema: { type: z.literal("message"), role: z.literal("user"), content: z.string() } }, steps: [{ schema: { type: z.literal("reasoning"), content: z.string() } }], output: { schema: { type: z.literal("message"), role: z.literal("assistant"), content: z.string() } } }] }] } })
  //     const session = await av.createSession({ agent: "unknown-steps", endUserId: initEndUser1.id })

  //     const run = await av.createRun({ sessionId: session.id, items: [baseInput], version: "1.0.0" })

  //     const updated = await av.updateRun({ id: run.id, items: [{ type: "custom_step", foo: "bar" }], status: "completed" })
  //     expect(updated.items[1].content.foo).toBe("bar")
  //   })
  // })
});
