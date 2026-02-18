import { describe, test, expect, beforeAll } from 'vitest'
import { AgentView, configDefaults } from 'agentview'
import type { Channel } from 'agentview'
import { seedUsers } from './seedUsers'

configDefaults.__internal = {
  disableSummaries: true,
}

describe('Channels', () => {
  let av: AgentView
  let avProd: AgentView
  let environmentId: string
  let channel: Channel

  beforeAll(async () => {
    const orgSlug = 'channels-test-' + Math.random().toString(36).slice(2)
    const result = await seedUsers(orgSlug)

    av = new AgentView({ apiKey: result.apiKeyDev.key })
    avProd = new AgentView({ apiKey: result.apiKeyProd.key })

    // Set up production environment with an agent
    const env = await avProd.updateEnvironment({
      config: {
        agents: [{ name: 'support-agent' }],
        __internal: { disableSummaries: true },
      },
    })
    environmentId = env.id

    // Create a test channel
    channel = await av.createChannel({
      type: 'email',
      name: 'Test Channel',
      address: `test@${orgSlug}.com`,
    })
  })

  test('create channel', () => {
    expect(channel.id).toBeDefined()
    expect(channel.type).toBe('email')
    expect(channel.name).toBe('Test Channel')
    expect(channel.status).toBe('active')
    expect(channel.environmentId).toBeNull()
    expect(channel.agent).toBeNull()
  })

  test('list channels includes new fields', async () => {
    const channels = await av.getChannels()
    expect(channels.length).toBeGreaterThanOrEqual(1)
    const found = channels.find(c => c.id === channel.id)
    expect(found).toBeDefined()
    expect(found!.environmentId).toBeNull()
    expect(found!.agent).toBeNull()
  })

  test('update channel with environmentId + agent', async () => {
    const updated = await av.updateChannel(channel.id, {
      environmentId,
      agent: 'support-agent',
    })

    expect(updated.environmentId).toBe(environmentId)
    expect(updated.agent).toBe('support-agent')
    expect(updated.status).toBe('active')
  })

  test('update channel - invalid environment returns 422', async () => {
    await expect(
      av.updateChannel(channel.id, {
        environmentId: '00000000-0000-0000-0000-000000000000',
        agent: 'support-agent',
      })
    ).rejects.toThrowError(
      expect.objectContaining({ statusCode: 422 })
    )
  })

  test('update channel - invalid agent returns 422', async () => {
    await expect(
      av.updateChannel(channel.id, {
        environmentId,
        agent: 'nonexistent-agent',
      })
    ).rejects.toThrowError(
      expect.objectContaining({ statusCode: 422 })
    )
  })

  test('archive channel via PATCH', async () => {
    const updated = await av.updateChannel(channel.id, {
      status: 'archived',
    })
    expect(updated.status).toBe('archived')

    // Re-activate
    const reactivated = await av.updateChannel(channel.id, {
      status: 'active',
    })
    expect(reactivated.status).toBe('active')
  })

  test('update nonexistent channel returns 404', async () => {
    await expect(
      av.updateChannel('00000000-0000-0000-0000-000000000000', {
        status: 'archived',
      })
    ).rejects.toThrowError(
      expect.objectContaining({ statusCode: 404 })
    )
  })
})
