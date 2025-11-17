import type { 
  Session, 
  SessionWithCollaboration, 
  EndUser, 
  EndUserCreate,
  Run,
  RunCreate,
  RunUpdate,
  SessionCreate,
} from './apiTypes'

export interface AgentViewErrorResponse {
  message: string
  code?: string
  details?: any
  [key: string]: any
}

export class AgentViewError extends Error {
  body: AgentViewErrorResponse
  statusCode: number

  constructor(body: AgentViewErrorResponse, statusCode: number) {
    super(body.message)
    this.name = 'AgentViewError'
    this.body = body
    this.statusCode = statusCode
  }
}

export interface AgentViewOptions {
  apiUrl: string
  apiKey?: string
  endUserToken?: string
  agent: string
  version: string
}

export type EndUserTokenOptions = {
    endUserToken?: string
}

export class AgentView {
  private apiUrl: string
  private apiKey?: string
  private endUserToken?: string
  private agent: string
  private version: string

  constructor(options: AgentViewOptions) {
    this.apiUrl = options.apiUrl.replace(/\/$/, '') // remove trailing slash
    this.apiKey = options.apiKey
    this.endUserToken = options.endUserToken
    this.agent = options.agent
    this.version = options.version

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
      let errorBody: AgentViewErrorResponse
      try {
        errorBody = await response.json()
      } catch {
        errorBody = {
          message: `HTTP ${response.status}: ${response.statusText}`,
        }
      }
      throw new AgentViewError(errorBody, response.status)
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

  async createRun(options: Omit<RunCreate, 'version'> & EndUserTokenOptions): Promise<Run> {
    const { endUserToken, ...body } = options;
    return await this.request<Run>('POST', `/api/runs`, { ...body, version: { version: this.version } }, endUserToken)
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

  async updateEndUser(options: EndUserCreate & EndUserTokenOptions & { id: string }): Promise<EndUser> {
    const { endUserToken, id, ...body } = options;
    return await this.request<EndUser>('PUT', `/api/end-users/${id}`, body, endUserToken)
  }
}

