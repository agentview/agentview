import { AgentView } from 'agentview'
import { getAuthHeaders } from './agentview'
import { addKeyAlias, invalidateByPrefix, invalidateCache, swr } from './swr-cache'

// Cache key helpers
const keys = {
  session: (id: string) => `session:${id}`,
  sessions: (params: string) => `sessions:${params}`,
  sessionsStats: (params: string) => `sessions-stats:${params}`,
  environment: () => `environment`,
}

export class CachedAgentView extends AgentView {
  constructor() {
    super({ headers: getAuthHeaders })
  }

  // === CACHED READS ===

  override async getSession(...args: Parameters<AgentView['getSession']>) {
    const requestedId = args[0].id
    const session = await swr(keys.session(requestedId), () => super.getSession(...args))

    // Add aliases so both id and handle resolve to the cached entry
    if (session.id !== requestedId) {
      addKeyAlias(keys.session(requestedId), keys.session(session.id))
    }
    if (session.handle !== requestedId) {
      addKeyAlias(keys.session(requestedId), keys.session(session.handle))
    }

    return session
  }

  override async getSessions(...args: Parameters<AgentView['getSessions']>) {
    const paramKey = JSON.stringify(args[0] ?? {})
    return swr(keys.sessions(paramKey), () => super.getSessions(...args))
  }

  override async getSessionsStats(...args: Parameters<AgentView['getSessionsStats']>) {
    const paramKey = JSON.stringify(args[0] ?? {})
    return swr(keys.sessionsStats(paramKey), () => super.getSessionsStats(...args))
  }

  override async getEnvironment(...args: Parameters<AgentView['getEnvironment']>) {
    return swr(keys.environment(), () => super.getEnvironment(...args))
  }

  // === MUTATIONS (invalidate cache) ===

  override async createSession(...args: Parameters<AgentView['createSession']>) {
    const result = await super.createSession(...args)
    invalidateByPrefix('sessions')
    invalidateByPrefix('sessions-stats')
    return result
  }

  override async updateSession(...args: Parameters<AgentView['updateSession']>) {
    const result = await super.updateSession(...args)
    invalidateCache(keys.session(args[0].id))
    invalidateByPrefix('sessions')
    invalidateByPrefix('sessions-stats')
    return result
  }

  override async createRun(...args: Parameters<AgentView['createRun']>) {
    const result = await super.createRun(...args)
    invalidateCache(keys.session(args[0].sessionId))
    return result
  }

  // cached version of updateRun need extra param sessionId to invalidate the correct cache
  override async updateRun(options_: Parameters<AgentView['updateRun']>[0] & { sessionId: string }) {
    const { sessionId, ...options } = options_;
    const result = await super.updateRun(options)
    invalidateCache(keys.session(sessionId))
    return result
  }

  override async updateItemScores(...args: Parameters<AgentView['updateItemScores']>) {
    const result = await super.updateItemScores(...args)
    invalidateCache(keys.session(args[0]))
    return result
  }

  override async createItemComment(...args: Parameters<AgentView['createItemComment']>) {
    console.log('create item comment!');
    const result = await super.createItemComment(...args)
    invalidateCache(keys.session(args[0]))
    return result
  }

  override async updateItemComment(...args: Parameters<AgentView['updateItemComment']>) {
    const result = await super.updateItemComment(...args)
    invalidateCache(keys.session(args[0]))
    return result
  }

  override async deleteItemComment(...args: Parameters<AgentView['deleteItemComment']>) {
    const result = await super.deleteItemComment(...args)
    invalidateCache(keys.session(args[0]))
    return result
  }

  override async updateEnvironment(...args: Parameters<AgentView['updateEnvironment']>) {
    const result = await super.updateEnvironment(...args)
    invalidateCache(keys.environment())
    return result
  }

}
