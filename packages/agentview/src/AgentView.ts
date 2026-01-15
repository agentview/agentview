import {
  type Session,
  type User,
  type UserCreate,
  type Run,
  type RunCreate,
  type RunUpdate,
  type SessionCreate,
  type SessionUpdate,
  type Environment,
  type EnvironmentCreate,
  type Space,
  type SessionsGetQueryParams,
  type SessionsPaginatedResponse,
  type PublicSessionsGetQueryParams,
} from './apiTypes.js'

import { type AgentViewErrorBody, AgentViewError } from './AgentViewError.js'
import { serializeConfig } from './configUtils.js'
import { enhanceSession } from './sessionUtils.js'
import type { InternalConfig } from './configTypes.js'
import { getApiUrl } from './urls.js'

export interface AgentViewOptions {
  apiKey?: string
  userToken?: string
  space?: Space
}

export const configDefaults: {
  __internal?: InternalConfig
} = { __internal: undefined }

export class AgentView {
  private apiKey: string
  private userToken?: string

  constructor(options?: AgentViewOptions) {
    const apiKey = options?.apiKey ?? process.env.AGENTVIEW_API_KEY
    if (!apiKey) {
      throw new Error("AgentView: Missing API Key. Set it either via apiKey property of AgentView constructor or via AGENTVIEW_API_KEY environment variable.")
    }

    this.apiKey = apiKey
    this.userToken = options?.userToken
  }

  private async request<T>(
    method: string,
    path: string,
    body?: any
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (this.userToken) {
      headers['X-User-Token'] = this.userToken;
    }

    headers['Authorization'] = `Bearer ${this.apiKey}`

    const response = await fetch(`${getApiUrl()}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const errorBody: AgentViewErrorBody = await response.json()
      const { message, ...details } = errorBody;
      throw new AgentViewError(message ?? "Unknown error", response.status, details)
    }

    return await response.json()
  }

  async createSession(options: SessionCreate) {
    return enhanceSession(await this.request<Session>('POST', `/api/sessions`, options))
  }

  async getSession(options: { id: string }) {
    return enhanceSession(await this.request<Session>('GET', `/api/sessions/${options.id}`, undefined))
  }

  async getSessions(options?: SessionsGetQueryParams) {
    let path = `/api/sessions`;
    const params = new URLSearchParams();

    if (options?.agent) params.append('agent', options.agent);
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.userId) params.append('userId', options.userId);
    if (options?.starred) params.append('starred', 'true');
    if (options?.space) params.append('space', options.space);

    const queryString = params.toString();
    if (queryString) {
      path += `?${queryString}`;
    }

    return await this.request<SessionsPaginatedResponse>('GET', path, undefined)
  }

  async updateSession(options: { id: string } & SessionUpdate) {
    return enhanceSession(await this.request<Session>('PATCH', `/api/sessions/${options.id}`, options))
  }

  async starSession(sessionId: string): Promise<{ starred: boolean }> {
    return await this.request<{ starred: boolean }>('PUT', `/api/sessions/${sessionId}/star`, undefined)
  }

  async unstarSession(sessionId: string): Promise<{ starred: boolean }> {
    return await this.request<{ starred: boolean }>('DELETE', `/api/sessions/${sessionId}/star`, undefined)
  }

  async isSessionStarred(sessionId: string): Promise<{ starred: boolean }> {
    return await this.request<{ starred: boolean }>('GET', `/api/sessions/${sessionId}/star`, undefined)
  }

  async createRun(options: RunCreate): Promise<Run> {
    return await this.request<Run>('POST', `/api/runs`, options)
  }

  async updateRun(options: RunUpdate & { id: string }): Promise<Run> {
    return await this.request<Run>('PATCH', `/api/runs/${options.id}`, options)
  }

  async keepAliveRun(options: { id: string }): Promise<{ expiresAt: string | null }> {
    return await this.request<{ expiresAt: string | null }>('POST', `/api/runs/${options.id}/keep-alive`, undefined)
  }

  async createUser(options?: UserCreate): Promise<User> {
    return await this.request<User>('POST', `/api/users`, options ?? {})
  }

  async getUser(options?: { id: string } | { token: string } | { externalId: string, space?: Space } | undefined): Promise<User> {
    if (!options) {
      return await this.request<User>('GET', `/api/users/me`)
    }
    if ('id' in options) {
      return await this.request<User>('GET', `/api/users/${options.id}`)
    }
    if ('token' in options) {
      if (this.userToken && this.userToken !== options.token) {
        throw new Error('Cannot get user with token when scoped with another user\'s token')
      }
      return await this.as(options.token).request<User>('GET', `/api/users/me`)
    }
    if ('externalId' in options) {
      return await this.request<User>('GET', `/api/users/by-external-id/${options.externalId}`)
    }
    throw new Error('Invalid options')
  }

  async updateUser(options: UserCreate & { id: string }): Promise<User> {
    return await this.request<User>('PATCH', `/api/users/${options.id}`, options)
  }

  async getEnvironment(): Promise<Environment> {
    return await this.request<Environment>('GET', `/api/environment`)
  }

  async updateEnvironment(body: EnvironmentCreate): Promise<Environment> {
    let config = body.config;

    if (configDefaults.__internal) {
      config = {
        ...config,
        __internal: {
          ...configDefaults.__internal,
          ...(config.__internal ?? {}),
        }
      }
    }

    return await this.request<Environment>('PATCH', `/api/environment`, { ...body, config: serializeConfig(config) })
  }

  as(userOrToken: User | string) {
    const userToken = typeof userOrToken === 'string' ? userOrToken : userOrToken.token;

    return new AgentView({
      apiKey: this.apiKey,
      userToken,
    })
  }
}






export interface PublicAgentViewOptions {
  userToken: string
}

export class PublicAgentView {
  private userToken: string

  constructor(options: PublicAgentViewOptions) {
    this.userToken = options.userToken
  }

  private async request<T>(
    method: string,
    path: string,
    body?: any
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    headers['X-User-Token'] = this.userToken;

    const response = await fetch(`${getApiUrl()}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const errorBody: AgentViewErrorBody = await response.json()
      const { message, ...details } = errorBody;
      throw new AgentViewError(message ?? "Unknown error", response.status, details)
    }

    return await response.json()
  }

  async getMe(): Promise<User> {
    return await this.request<User>('GET', `/api/public/me`)
  }

  async getSession(options: { id: string }) {
    return enhanceSession(await this.request<Session>('GET', `/api/public/sessions/${options.id}`))
  }

  async getSessions(options?: PublicSessionsGetQueryParams) {
    let path = `/api/public/sessions`;
    const params = new URLSearchParams();
    if (options?.agent) params.append('agent', options.agent);
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());

    const queryString = params.toString();
    if (queryString) {
      path += `?${queryString}`;
    }

    return await this.request<SessionsPaginatedResponse>('GET', path)
  }
}

type WithOptional<T, K extends keyof T> =
  Omit<T, K> & Partial<Pick<T, K>>;