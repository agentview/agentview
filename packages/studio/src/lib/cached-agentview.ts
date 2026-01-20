import { AgentView } from 'agentview'
import { getAuthHeaders } from './agentview'
import { addCacheDependency, addKeyAlias, invalidateByPrefix, invalidateCache, swr } from './swr-cache'

// Cache key helpers
const keys = {
  session: (id: string) => `session:${id}`,
  sessionScores: (id: string) => `session-scores:${id}`,
  sessionComments: (id: string) => `session-comments:${id}`,
  sessions: (params: string) => `sessions:${params}`,
  sessionsStats: (params: string) => `sessions-stats:${params}`,
  user: (id: string) => `user:${id}`,
  environment: () => `environment`,
}

export class CachedAgentView extends AgentView {
  constructor() {
    super({ headers: getAuthHeaders })
  }

  // === CACHED READS ===

  override async getSession(...args: Parameters<AgentView['getSession']>) {
    const requestedId = args[0].id
    const cacheKey = keys.session(requestedId)
    const session = await swr(cacheKey, () => super.getSession(...args))

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

  override async getSessionComments(...args: Parameters<AgentView['getSessionComments']>) {
    return swr(keys.sessionComments(args[0].id), () => super.getSessionComments(...args))
  }

  override async getSessionScores(...args: Parameters<AgentView['getSessionScores']>) {
    return swr(keys.sessionScores(args[0].id), () => super.getSessionScores(...args))
  }

  override async updateItemScores(...args: Parameters<AgentView['updateItemScores']>) {
    const result = await super.updateItemScores(...args)

    invalidateCache(keys.sessionScores(args[0]))
    invalidateCache(keys.sessionComments(args[0]))

    return result
  }

  override async createItemComment(...args: Parameters<AgentView['createItemComment']>) {
    const result = await super.createItemComment(...args)
    
    invalidateCache(keys.sessionScores(args[0]))
    invalidateCache(keys.sessionComments(args[0]))

    return result
  }

  override async updateItemComment(...args: Parameters<AgentView['updateItemComment']>) {
    const result = await super.updateItemComment(...args)
    
    invalidateCache(keys.sessionScores(args[0]))
    invalidateCache(keys.sessionComments(args[0]))

    return result
  }

  override async deleteItemComment(...args: Parameters<AgentView['deleteItemComment']>) {
    const result = await super.deleteItemComment(...args)
    
    invalidateCache(keys.sessionScores(args[0]))
    invalidateCache(keys.sessionComments(args[0]))

    return result
  }

  override async updateEnvironment(...args: Parameters<AgentView['updateEnvironment']>) {
    const result = await super.updateEnvironment(...args)
    invalidateCache(keys.environment())
    return result
  }

  override async updateUser(...args: Parameters<AgentView['updateUser']>) {
    const result = await super.updateUser(...args)

    // .user is part of session list and also single session object. That's why we literally nuke cache here. Good for now.
    invalidateByPrefix('session');
    invalidateByPrefix('sessions');
    invalidateByPrefix('sessions-stats')
    return result
  }
  
  override async markSessionSeen(...args: Parameters<AgentView['markSessionSeen']>) {
    const result = await super.markSessionSeen(...args)
    invalidateByPrefix('sessions-stats')
    return result
  }

  override async markItemSeen(...args: Parameters<AgentView['markItemSeen']>) {
    const result = await super.markItemSeen(...args)
    invalidateByPrefix('sessions-stats')
    return result
  }
}
