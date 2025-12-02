import { 
  type Session, 
  type EndUser, 
  type EndUserCreate,
  type Run,
  type RunCreate,
  type RunUpdate,
  type SessionCreate,
  type SessionUpdate,
  type Config,
  type ConfigCreate,
} from './apiTypes'

import { type AgentViewErrorBody, type AgentViewErrorDetails, AgentViewError } from './AgentViewError'
import { serializeConfig } from './configUtils'

import { enhanceSession } from './sessionUtils'

export interface AgentViewOptions {
  apiUrl: string
  apiKey: string
  endUserToken?: string
}

export class AgentView {
  private apiUrl: string
  private apiKey: string
  private endUserToken?: string

  constructor(options: AgentViewOptions) {
    this.apiUrl = options.apiUrl.replace(/\/$/, '') // remove trailing slash
    this.apiKey = options.apiKey
    this.endUserToken = options.endUserToken
  }

  private async request<T>(
    method: string,
    path: string,
    body?: any
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (this.endUserToken) {
      headers['X-End-User-Token'] = this.endUserToken;
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

  async updateSession(options: { id: string } & SessionUpdate) {
    return enhanceSession(await this.request<Session>('PATCH', `/api/sessions/${options.id}`, options))
  }

  async createRun(options: RunCreate): Promise<Run> {
    return await this.request<Run>('POST', `/api/runs`, options)
  }

  async updateRun(options: RunUpdate & { id: string }): Promise<Run> {
    return await this.request<Run>('PATCH', `/api/runs/${options.id}`, options)
  }

  async createEndUser(options?: EndUserCreate): Promise<EndUser> {
    return await this.request<EndUser>('POST', `/api/end-users`, options ?? {})
  }

  async getEndUser(options?: { id: string } | { token: string } | { externalId: string } | undefined): Promise<EndUser> {
    if (!options) {
      return await this.request<EndUser>('GET', `/api/end-users/me`)
    }
    if ('id' in options) {
      return await this.request<EndUser>('GET', `/api/end-users/${options.id}`)
    }
    if ('token' in options) {
      if (this.endUserToken && this.endUserToken !== options.token) {
        throw new Error('Cannot get end user with token when scoped with another user\'s token')
      }
      return await this.as(options.token).request<EndUser>('GET', `/api/end-users/me`)
    }
    if ('externalId' in options) {
      return await this.request<EndUser>('GET', `/api/end-users/by-external-id/${options.externalId}`)
    }
    throw new Error('Invalid options')
  }

  // async getEndUserByExternalId(options: { externalId: string }): Promise<EndUser> {
  //   return await this.request<EndUser>('GET', `/api/end-users/by-external-id/${options.externalId}`, undefined)
  // }

  // async getEndUserMe(): Promise<EndUser> {
  //   return await this.request<EndUser>('GET', `/api/end-users/me`)
  // }

  async updateEndUser(options: EndUserCreate & { id: string }): Promise<EndUser> {
    return await this.request<EndUser>('PUT', `/api/end-users/${options.id}`, options)
  }

  async __getConfig(): Promise<Config> {
    return await this.request<Config>('GET', `/api/config`)
  }

  async __updateConfig(body: ConfigCreate): Promise<Config> {
    return await this.request<Config>('PUT', `/api/config`, { ...body, config: serializeConfig(body.config) })
  }

  as(endUserOrToken: EndUser | string) {
    const endUserToken = typeof endUserOrToken === 'string' ? endUserOrToken : endUserOrToken.token;

    return new AgentView({
      apiUrl: this.apiUrl,
      apiKey: this.apiKey,
      endUserToken,
    })
  }
}




export interface AgentViewClientOptions {
  apiUrl: string
  endUserToken: string
}

export class AgentViewClient {
  private apiUrl: string
  private endUserToken: string

  constructor(options: AgentViewClientOptions) {
    this.apiUrl = options.apiUrl.replace(/\/$/, '') // remove trailing slash
    this.endUserToken = options.endUserToken
  }

  private async request<T>(
    method: string,
    path: string,
    body?: any
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    headers['X-End-User-Token'] = this.endUserToken;

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

  async getMe(): Promise<EndUser> {
    return await this.request<EndUser>('GET', `/api/public/me`)
  }

  async getSession(options: { id: string }) {
    return enhanceSession(await this.request<Session>('GET', `/api/public/sessions/${options.id}`))
  }
}
