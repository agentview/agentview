import { 
  type Session, 
  type User, 
  type UserCreate,
  type Run,
  type RunCreate,
  type RunUpdate,
  type SessionCreate,
  type SessionUpdate,
  type Config,
  type ConfigCreate,
  type SessionsGetQueryParams,
  type SessionsPaginatedResponse,
} from './apiTypes'

import { type AgentViewErrorBody, type AgentViewErrorDetails, AgentViewError } from './AgentViewError'
import { serializeConfig } from './configUtils'

import { enhanceSession } from './sessionUtils'

export interface AgentViewOptions {
  apiUrl: string
  apiKey: string
  userToken?: string
}

export class AgentView {
  private apiUrl: string
  private apiKey: string
  private userToken?: string

  constructor(options: AgentViewOptions) {
    this.apiUrl = options.apiUrl.replace(/\/$/, '') // remove trailing slash
    this.apiKey = options.apiKey
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

    if (this.userToken) {
      headers['X-User-Token'] = this.userToken;
    }

    headers['Authorization'] = `Bearer ${this.apiKey}`

    const response = await fetch(`${this.apiUrl}${path}`, {
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
    if (options) {
      const params = new URLSearchParams();
      if (options.agent) params.append('agent', options.agent);
      if (options.page) params.append('page', options.page.toString());
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.userId) params.append('userId', options.userId);
      if (options.list) params.append('list', options.list);
      const queryString = params.toString();
      if (queryString) {
        path += `?${queryString}`;
      }
    }
    return await this.request<SessionsPaginatedResponse>('GET', path, undefined)
  }

  async updateSession(options: { id: string } & SessionUpdate) {
    return enhanceSession(await this.request<Session>('PATCH', `/api/sessions/${options.id}`, options))
  }

  async createRun(options: RunCreate): Promise<Run> {
    return await this.request<Run>('POST', `/api/runs`, options)
  }

  async updateRun(options: RunUpdate & { id: string }): Promise<Run> {
    return await this.request<Run>('PATCH', `/api/runs/${options.id}`, options)
  }

  async createUser(options?: UserCreate): Promise<User> {
    return await this.request<User>('POST', `/api/users`, options ?? {})
  }

  async getUser(options?: { id: string } | { token: string } | { externalId: string } | undefined): Promise<User> {
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

  async __getConfig(): Promise<Config> {
    return await this.request<Config>('GET', `/api/config`)
  }

  async __updateConfig(body: ConfigCreate): Promise<Config> {
    return await this.request<Config>('PUT', `/api/config`, { ...body, config: serializeConfig(body.config) })
  }

  as(userOrToken: User | string) {
    const userToken = typeof userOrToken === 'string' ? userOrToken : userOrToken.token;

    return new AgentView({
      apiUrl: this.apiUrl,
      apiKey: this.apiKey,
      userToken,
    })
  }
}




export interface AgentViewClientOptions {
  apiUrl: string
  userToken: string
}

export class AgentViewClient {
  private apiUrl: string
  private userToken: string

  constructor(options: AgentViewClientOptions) {
    this.apiUrl = options.apiUrl.replace(/\/$/, '') // remove trailing slash
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

    const response = await fetch(`${this.apiUrl}${path}`, {
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
}
