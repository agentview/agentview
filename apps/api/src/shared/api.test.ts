import { describe, it, expect } from 'vitest'
import { AgentView } from './AgentView'

const av = new AgentView({
  apiUrl: 'http://localhost:8080',
  apiKey: 'cTlvHJzNQqFwgUaXJwhQCgnxUaYPYrgnjLDkapomgcAHRKoyutJpvVJACaBCUWoT',
})

describe('api', () => {

  it('should handle end users', async () => {
    const EXTERNAL_ID_1 = Math.random().toString(36).slice(2)
    const EXTERNAL_ID_2 = Math.random().toString(36).slice(2)


    // Creating users
    let endUser1 = await av.createEndUser({ externalId: EXTERNAL_ID_1 })
    expect(endUser1).toBeDefined()
    expect(endUser1.externalId).toBe(EXTERNAL_ID_1)

    let endUser2 = await av.createEndUser({ externalId: EXTERNAL_ID_2, })
    expect(endUser2).toBeDefined()
    expect(endUser2.externalId).toBe(EXTERNAL_ID_2)

    // verify whther you can't create another one with the same external id
    await expect(av.createEndUser({
      externalId: EXTERNAL_ID_1,
    })).rejects.toThrowError(expect.objectContaining({
      statusCode: 400,
      message: expect.any(String),
    }))

    // does get by id work
    endUser1 = await av.getEndUser({ id: endUser1.id })
    expect(endUser1).toBeDefined()
    expect(endUser1.externalId).toBe(EXTERNAL_ID_1)

    endUser2 = await av.getEndUser({ id: endUser2.id })
    expect(endUser2).toBeDefined()
    expect(endUser2.externalId).toBe(EXTERNAL_ID_2)

    await expect(av.getEndUser({ id: randomUUID() })).rejects.toThrowError(expect.objectContaining({
      statusCode: 404,
      message: expect.any(String),
    }))

    await expect(av.getEndUser({ id: 'xxx' })).rejects.toThrowError(expect.objectContaining({
      statusCode: 422,
      message: expect.any(String),
    }))

    // does get by external id work
    endUser1 = await av.getEndUserByExternalId({ externalId: EXTERNAL_ID_1 })
    expect(endUser1).toBeDefined()
    expect(endUser1.externalId).toBe(EXTERNAL_ID_1)

    endUser2 = await av.getEndUserByExternalId({ externalId: EXTERNAL_ID_2 })
    expect(endUser2).toBeDefined()
    expect(endUser2.externalId).toBe(EXTERNAL_ID_2)

    await expect(av.getEndUserByExternalId({ externalId: 'unknown_external_id' })).rejects.toThrowError(expect.objectContaining({
      statusCode: 404,
      message: expect.any(String),
    }))


    // With end user token, user only have access to his own...
    endUser1 = await av.getEndUser({
      id: endUser1.id,
      endUserToken: endUser1.token,
    })

    expect(endUser1).toBeDefined()
    expect(endUser1.externalId).toBe(EXTERNAL_ID_1)

    // ...but not someone else
    await expect(av.getEndUser({
      id: endUser2.id,
      endUserToken: endUser1.token,
    })).rejects.toThrowError(expect.objectContaining({
      statusCode: 401,
      message: expect.any(String),
    }))

    // get "me" works
    endUser1 = await av.getEndUserMe({ endUserToken: endUser1.token })
    expect(endUser1).toBeDefined()
    expect(endUser1.externalId).toBe(EXTERNAL_ID_1)

    endUser2 = await av.getEndUserMe({ endUserToken: endUser2.token })
    expect(endUser2).toBeDefined()
    expect(endUser2.externalId).toBe(EXTERNAL_ID_2)

    await expect(av.getEndUserMe({ // throws for bad token
      endUserToken: 'xxx',
    })).rejects.toThrowError(expect.objectContaining({
      statusCode: 404,
      message: expect.any(String),
    }))
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