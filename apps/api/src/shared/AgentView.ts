import { 
  type Session, 
  type SessionWithCollaboration, 
  type EndUser, 
  type EndUserCreate,
  type Run,
  type RunCreate,
  type RunUpdate,
  type SessionCreate,
  RunBodySchema,
} from './apiTypes'

import { type AgentViewErrorBody, type AgentViewErrorDetails, AgentViewError } from './AgentViewError'


export interface AgentViewOptions {
  apiUrl: string
  apiKey?: string
}

export type EndUserTokenOptions = {
  endUserToken?: string
}

export class AgentView {
  private apiUrl: string
  private apiKey?: string
  private endUserToken?: string

  constructor(options: AgentViewOptions) {
    this.apiUrl = options.apiUrl.replace(/\/$/, '') // remove trailing slash
    this.apiKey = options.apiKey

    if (!this.apiKey && !this.endUserToken) {
      throw new Error('Either apiKey or endUserToken must be provided')
    }
  }

  private async request<T>(
    method: string,
    path: string,
    body: any,
    endUserToken?: string
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (endUserToken) {
      headers['X-End-User-Token'] = endUserToken;
    }

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    } else if (this.endUserToken) {
      headers['Authorization'] = `Bearer ${this.endUserToken}`
    }

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

  async createSession(options: SessionCreate & EndUserTokenOptions): Promise<Session> {
    const { endUserToken, ...body } = options;
    return await this.request<Session>('POST', `/api/sessions`, body, endUserToken)
  }

  async getSession(options: { id: string } & EndUserTokenOptions): Promise<SessionWithCollaboration> {
    const { endUserToken, id } = options;
    return await this.request<SessionWithCollaboration>('GET', `/api/sessions/${id}`, undefined, endUserToken)
  }

  async createRun(options: RunCreate & EndUserTokenOptions): Promise<Run> {
    const { endUserToken, ...body } = options;
    return await this.request<Run>('POST', `/api/runs`, body, endUserToken)
  }

  async updateRun(options: RunUpdate & EndUserTokenOptions & { id: string }): Promise<Run> {
    const { endUserToken, id, ...body } = options;
    return await this.request<Run>('PATCH', `/api/runs/${id}`, body, endUserToken)
  }

  async createEndUser(options: EndUserCreate & EndUserTokenOptions): Promise<EndUser> {
    const { endUserToken, ...body } = options;
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
}

