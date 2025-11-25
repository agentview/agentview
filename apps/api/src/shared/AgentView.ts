import { 
  type Session, 
  type EndUser, 
  type EndUserCreate,
  type Run,
  type RunCreate,
  type RunUpdate,
  type SessionCreate,
  type SessionUpdate,
  RunBodySchema,
  type Config,
  type ConfigCreate,
} from './apiTypes'

import { type AgentViewErrorBody, type AgentViewErrorDetails, AgentViewError } from './AgentViewError'
import { serializeConfig } from './configUtils'

import { enhanceSession } from './sessionUtils'


export interface AgentViewOptions {
  apiUrl: string
  apiKey: string
}

export type EndUserTokenOptions = {
  endUserToken?: string
}

export class AgentView {
  private apiUrl: string
  private apiKey: string

  constructor(options: AgentViewOptions) {
    this.apiUrl = options.apiUrl.replace(/\/$/, '') // remove trailing slash
    this.apiKey = options.apiKey
  }

  private async request<T>(
    method: string,
    path: string,
    body?: any,
    endUserToken?: string
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (endUserToken) {
      headers['X-End-User-Token'] = endUserToken;
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

  async createSession(options: SessionCreate & EndUserTokenOptions) {
    const { endUserToken, ...body } = options;
    return enhanceSession(await this.request<Session>('POST', `/api/sessions`, body, endUserToken))
  }

  async getSession(options: { id: string } & EndUserTokenOptions) {
    const { endUserToken, id } = options;
    return enhanceSession(await this.request<Session>('GET', `/api/sessions/${id}`, undefined, endUserToken))
  }

  async updateSession(options: { id: string } & SessionUpdate & EndUserTokenOptions) {
    const { endUserToken, id, ...body } = options;
    return enhanceSession(await this.request<Session>('PATCH', `/api/sessions/${id}`, body, endUserToken))
  }

  async createRun(options: RunCreate & EndUserTokenOptions): Promise<Run> {
    const { endUserToken, ...body } = options;
    return await this.request<Run>('POST', `/api/runs`, body, endUserToken)
  }

  async updateRun(options: RunUpdate & EndUserTokenOptions & { id: string }): Promise<Run> {
    const { endUserToken, id, ...body } = options;
    return await this.request<Run>('PATCH', `/api/runs/${id}`, body, endUserToken)
  }

  async createEndUser(options?: EndUserCreate & EndUserTokenOptions): Promise<EndUser> {
    const { endUserToken, ...body } = options ?? {};
    return await this.request<EndUser>('POST', `/api/end-users`, body, endUserToken)
  }

  async getEndUser(options: { id: string } & EndUserTokenOptions): Promise<EndUser> {
    const { endUserToken, id } = options;
    return await this.request<EndUser>('GET', `/api/end-users/${id}`, undefined, endUserToken)
  }

  async getEndUserByExternalId(options: { externalId: string } & EndUserTokenOptions): Promise<EndUser> {
    const { endUserToken, externalId } = options;
    return await this.request<EndUser>('GET', `/api/end-users/by-external-id/${externalId}`, undefined, endUserToken)
  }

  async getEndUserMe(options: {} & EndUserTokenOptions): Promise<EndUser> {
    const { endUserToken } = options;
    return await this.request<EndUser>('GET', `/api/end-users/me`, undefined, endUserToken)
  }

  async updateEndUser(options: EndUserCreate & EndUserTokenOptions & { id: string }): Promise<EndUser> {
    const { endUserToken, id, ...body } = options;
    return await this.request<EndUser>('PUT', `/api/end-users/${id}`, body, endUserToken)
  }

  async __getConfig(): Promise<Config> {
    return await this.request<Config>('GET', `/api/config`)
  }

  async __updateConfig(body: ConfigCreate): Promise<Config> {
    return await this.request<Config>('PUT', `/api/config`, { ...body, config: serializeConfig(body.config) })
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
