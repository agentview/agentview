import { describe, it, test, expect, beforeAll } from 'vitest'
import { AgentView, AgentViewClient } from './AgentView'
import type { EndUser, Run } from './apiTypes';
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


  const baseInput = { type: "message", role: "user", content: "Hello" }
  const baseOutput = { type: "message", role: "assistant", content: "Hi there" }
  const baseStep = { type: "reasoning", content: "Thinking..." }

  const baseInputExt = { type: "message", role: "user", content: "Hello", __extraField: "extra" }
  const baseOutputExt = { type: "message", role: "assistant", content: "Hi there", __extraField: "extra" }
  const baseStepExt = { type: "reasoning", content: "Thinking...", __extraField: "extra" }

  const wrongInput = { type: "message", role: "user", content: 100 }
  const wrongStep = { type: "reasoning", content: 100 }
  const wrongOutput = { type: "message", role: "assistant", content: 100 }

  const updateConfig = async (options: { strictMatching?: boolean, runMetadata?: Record<string, z.ZodType>, allowUnknownMetadata?: boolean } = {}) => {

    let inputSchema = z.looseObject({ type: z.literal("message"), role: z.literal("user"), content: z.string() })
    let stepSchema = z.looseObject({ type: z.literal("reasoning"), content: z.string() })
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
          url: "https://test.com",
          runs: [
            {
              input: { schema: inputSchema },
              steps: [{ schema: stepSchema }],
              output: { schema: outputSchema },
              metadata: options.runMetadata,
              allowUnknownMetadata: options.allowUnknownMetadata,
            }
          ]
        }
      ]
    }

    await av.__updateConfig({ config })
  }

  async function createSession() {
    return await av.createSession({ agent: "test", endUserId: initEndUser1.id })
  }

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



    test.only("history and lastRun are generated correctly as new runs are created", async () => {
      await updateConfig()
      
      let session = await createSession()
      expect(session.history).toEqual([])
      expect(session.lastRun).toBeUndefined()

      // First run, check 
      let run1 = await av.createRun({ sessionId: session.id, items: [baseInput], version: "1.0.0" })
      session = await av.getSession({ id: session.id })
      expect(session.history).toEqual([baseInput])
      expect(session.lastRun?.id).toBe(run1.id)

      run1 = await av.updateRun({ id: run1.id, items: [baseOutput], status: "completed" })
      session = await av.getSession({ id: session.id })
      expect(session.history).toEqual([baseInput, baseOutput])
      expect(session.lastRun?.id).toBe(run1.id)

      // Second run, failed, but items in the history
      let run2 = await av.createRun({ sessionId: session.id, items: [baseInput, baseStep, baseOutput], status: "failed", version: "1.0.0" })
      session = await av.getSession({ id: session.id })
      expect(session.history).toEqual([baseInput, baseOutput, baseInput, baseStep, baseOutput])
      expect(session.lastRun?.id).toBe(run2.id)

      // Retry, successful
      let run3 = await av.createRun({ sessionId: session.id, items: [baseInput, baseStep, baseOutput], status: "completed", version: "1.0.0" })
      session = await av.getSession({ id: session.id })
      expect(session.history).toEqual([baseInput, baseOutput, baseInput, baseStep, baseOutput])
      expect(session.lastRun?.id).toBe(run3.id)


      // first run failed
      // const run2 = await av.createRun({ sessionId: session.id, items: [baseStep], version: "1.0.0" })
      // session = await av.getSession({ id: session.id })
      // expect(session.history).toEqual([baseInput])
      // expect(session.lastRun?.id).toBe(run2.id)



      // run = await av.updateRun({ id: run.id, items: [baseOutput], status: "completed" })
      // session = await av.getSession({ id: session.id })
      // expect(session.history).toEqual([run])
      // expect(session.lastRun).toBe(run)

      // expect(run.status).toBe("in_progress")
    })



    // METADATA TESTS

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

  // TODO:
  // - do state, and check it properly (shoudl be in enhanced session):
  // - tool calls (fix configUtils.test)
  // - validateSteps
  // - test history and lastRun (whether history keeps only items from valid runs)

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
        statusCode: 400,
        message: expect.any(String),
      }))
    })



    /** 
     * RUN STATES TESTS 
     * 
     * This is automated set of test cases where we test different scenarios of runs.
     **/

    const baseTestCases : Array<{ title: string, scenarios: any[], lastRunStatus: ("in_progress" | "completed" | "failed" | undefined)[], error?: number | null, validateItems?: boolean, strictMatching?: boolean }> = [
      {
        title: "just input & output",
        scenarios: [
          [ [baseInput, baseOutput] ],
          [ [baseInput], [baseOutput] ]
        ],
        lastRunStatus: ["completed", "failed"],
        error: null
      },
      {
        title: "input, 2 items, output",
        scenarios: [
          [ [baseInput, baseStep, baseStep, baseOutput] ],
          [ [baseInput], [baseStep], [baseStep], [baseOutput] ],
          [ [baseInput], [baseStep, baseStep], [baseOutput] ],
          [ [baseInput], [baseStep, baseStep, baseOutput] ],
        ],
        lastRunStatus: ["completed", "failed"],
        error: null
      },
      {
        title: "input, 2 items, output",
        scenarios: [
          [ [baseInput, baseStep, baseStep, baseOutput] ],
          [ [baseInput], [baseStep], [baseStep], [baseOutput] ],
          [ [baseInput], [baseStep, baseStep], [baseOutput] ],
          [ [baseInput], [baseStep, baseStep, baseOutput] ],
        ],
        lastRunStatus: [undefined],
        error: 422
      },
      {
        title: "input, 2 steps, no output",
        scenarios: [
          [ [baseInput, baseStep, baseStep] ],
          [ [baseInput], [baseStep], [baseStep] ],
          [ [baseInput], [baseStep, baseStep] ],
        ],
        lastRunStatus: ["failed"],
        error: null
      },
      {
        title: "input, 2 items, no output",
        scenarios: [
          [ [baseInput, baseStep, baseStep] ],
          [ [baseInput], [baseStep], [baseStep] ],
          [ [baseInput], [baseStep, baseStep] ],
        ],
        lastRunStatus: ["completed"],
        error: 422
      },
      {
        title: "single item",
        scenarios: [
          [ [baseInput] ],
        ],
        lastRunStatus: ["completed"],
        error: 422
      },
      {
        title: "single item",
        scenarios: [
          [ [baseInput] ],
        ],
        lastRunStatus: ["failed"],
        error: null
      },

      // Validation
      {
        title: "loose matching -> extra fields saved",
        scenarios: [
          [ [baseInputExt, baseStepExt, baseStepExt, baseOutputExt] ],
          [ [baseInputExt], [baseStepExt], [baseStepExt], [baseOutputExt] ],
          [ [baseInputExt], [baseStepExt, baseStepExt], [baseOutputExt] ],
          [ [baseInputExt], [baseStepExt, baseStepExt, baseOutputExt] ],
        ],
        lastRunStatus: ["completed", "failed"],
        error: null
      },
      {
        title: "strict matching -> extra fields trimmed",
        strictMatching: true,
        scenarios: [
          [ [baseInputExt, baseOutputExt] ],
          [ [baseInput], [baseStep, baseStep], [baseOutputExt] ],
          [ [baseInput, baseStep, baseStep, baseOutputExt] ],
        ],
        lastRunStatus: ["completed"],
        error: null
      },
      {
        title: "incorrect input item",
        scenarios: [
          [ [wrongInput] ],
          [ [wrongInput, baseStep] ],
          [ [wrongInput, baseStep, baseStep, baseOutput] ]
        ],
        lastRunStatus: ["completed", "failed"],
        error: 422
      },
      {
        title: "incorrect output item",
        scenarios: [
          [ [baseInput, baseStep, wrongOutput] ],
          [ [baseInput], [baseStep], [wrongOutput] ],
          [ [baseInput], [baseStep, wrongOutput] ],
        ],
        lastRunStatus: ["completed"],
        error: 422
      },
      {
        title: "incorrect output item",
        scenarios: [
          [ [baseInput, baseStep, wrongOutput] ],
          [ [baseInput], [baseStep], [wrongOutput] ],
          [ [baseInput], [baseStep, wrongOutput] ],
        ],
        lastRunStatus: ["failed"],
        error: null // when there is no step validation and status becomes "failed", we don't know if the last item was output or step
      }
    ]

    for (const testCase of baseTestCases) {
      let counter = 0;
      for (const scenario of testCase.scenarios) {
        counter++;

        for (const lastRunStatus of testCase.lastRunStatus) {
          const title = `${testCase.title} / run ${counter} / ${lastRunStatus} -> ${testCase.error ? `error ${testCase.error}` : "ok"}`

          test(title, async () => {
            await updateConfig({ strictMatching: testCase.strictMatching });

            const session = await createSession()

            let run: Run | undefined;
            let expected_history : any[] = [];

            for (const iteration of scenario) {
              const isLast = iteration === scenario[scenario.length - 1];
              const isFirst = iteration === scenario[0];

              let expectedStatus : string;
              let expectedHasFinishedAt : boolean;
              let promise: any;

              if (isFirst && isLast) {
                promise = av.createRun({ sessionId: session.id, items: iteration, version: "1.0.0", status: lastRunStatus });
                expectedStatus = lastRunStatus ?? "in_progress";
                expectedHasFinishedAt = true;
              } else if (isFirst) {
                promise = av.createRun({ sessionId: session.id, items: iteration, version: "1.0.0" })
                expectedStatus = "in_progress";
                expectedHasFinishedAt = false;
              } else if (isLast) {
                promise = av.updateRun({ id: run!.id, items: iteration, status: lastRunStatus })
                expectedStatus = lastRunStatus ?? "in_progress";
                expectedHasFinishedAt = true;
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

                const { history, lastRun } = await av.getSession({ id: session.id });
                expect(deepCompare(history, expected_history)).toBe(true)

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

                const { lastRun, history } = await av.getSession({ id: session.id });
                expect(deepCompare(history, expected_history)).toBe(true)

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
        statusCode: 400,
        message: expect.any(String),
      }))

      await expect(av.updateRun({ id: run.id, status: "failed" })).rejects.toThrowError(expect.objectContaining({
        statusCode: 400,
        message: expect.any(String),
      }))

    })

    test("failReason can be set only on failed runs", async () => {
      await updateConfig()
      const session = await createSession()

      const run = await av.createRun({ sessionId: session.id, items: [baseInput], version: "1.0.0" })

      const failReason = { message: "oops" }

      await expect(av.updateRun({ id: run.id, items: [baseStep], failReason })).rejects.toThrowError(expect.objectContaining({statusCode: 400,
        message: expect.any(String),
      }))
      
      await expect(av.updateRun({ id: run.id, items: [baseOutput], failReason, status: "completed" })).rejects.toThrowError(expect.objectContaining({statusCode: 400,
        message: expect.any(String),
      }))

      const updated = await av.updateRun({ id: run.id, items: [baseOutput], status: "failed", failReason })
      expect(updated.failReason).toEqual(failReason)
    })

    test("version compatibility enforced", async () => {
      await updateConfig()
      const session = await createSession()

      const run1 = await av.createRun({ sessionId: session.id, items: [baseInput], version: "1.2.3" })
      await av.updateRun({ id: run1.id, items: [baseOutput], status: "completed" })

      // higher patch works
      const run2 = await av.createRun({ sessionId: session.id, items: [baseInput], version: "1.2.4" })
      await av.updateRun({ id: run2.id, items: [baseOutput], status: "completed" })

      // smaller patch fails
      await expect(av.createRun({ sessionId: session.id, items: [baseInput], version: "1.2.2" })).rejects.toThrowError(expect.objectContaining({
        statusCode: 400,
        message: expect.any(String),
      }))

      // different minor fails
      await expect(av.createRun({ sessionId: session.id, items: [baseInput], version: "1.3.0" })).rejects.toThrowError(expect.objectContaining({
        statusCode: 400,
        message: expect.any(String),
      }))
    })

    test("endUserToken scoped permissions", async () => {
      await updateConfig()
      const session = await createSession()

      await expect(av.createRun({ sessionId: session.id, items: [baseInput], version: "1.0.0", endUserToken: initEndUser2.token })).rejects.toThrowError(expect.objectContaining({
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
