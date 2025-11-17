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

export interface CreateSessionOptions {
  metadata?: any
  endUserId?: string
  endUserExternalId?: string
  endUserToken?: string
  isShared?: boolean
}

export interface GetSessionOptions {
  id: string
  userToken?: string
}

export interface CreateRunOptions {
  items: any[]
  sessionId: string
  status?: 'in_progress' | 'completed' | 'failed'
  state?: any
  metadata?: any
  failReason?: any
}

export interface UpdateRunOptions {
  id: string
  items?: any[]
  status?: 'in_progress' | 'completed' | 'failed'
  failReason?: any
  metadata?: any
  state?: any
}

export interface CreateEndUserOptions {
  externalId?: string
  isShared?: boolean
}

export interface GetEndUserOptions {
  endUserId?: string
  endUserExternalId?: string
  endUserToken?: string
}

export interface UpdateEndUserOptions {
  endUserId: string
  externalId?: string
  isShared?: boolean
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
    body?: any
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
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

  async createSession(options: CreateSessionOptions = {}): Promise<Session> {
    // If endUserExternalId is provided, we need to find or create the end user
    let endUserId = options.endUserId
    if (options.endUserExternalId && !endUserId) {
      // Create a new end user if externalId is provided
      const endUser = await this.createEndUser({ externalId: options.endUserExternalId })
      endUserId = endUser.id
    }

    const body: SessionCreate = {
      agent: this.agent,
      metadata: options.metadata,
      endUserId,
      isShared: options.isShared,
    }

    const session = await this.request<Session>('POST', `/api/sessions`, body)
    return session
  }

  async getSession(options: GetSessionOptions): Promise<SessionWithCollaboration> {
    const session = await this.request<SessionWithCollaboration>(
      'GET',
      `/api/sessions/${options.id}`
    )
    return session
  }

  async createRun(options: CreateRunOptions): Promise<Run> {
    const body: RunCreate = {
      sessionId: options.sessionId,
      items: options.items,
      version: {
        version: this.version,
      },
      status: options.status,
      state: options.state,
      metadata: options.metadata,
      failReason: options.failReason,
    }

    const run = await this.request<Run>('POST', `/api/runs`, body)
    return run
  }

  async updateRun(options: UpdateRunOptions): Promise<Run> {
    const body: RunUpdate = {
      items: options.items,
      status: options.status,
      failReason: options.failReason,
      metadata: options.metadata,
      state: options.state,
    }

    const run = await this.request<Run>('PATCH', `/api/runs/${options.id}`, body)
    return run
  }

  async createEndUser(options: CreateEndUserOptions = {}): Promise<EndUser> {
    const body: EndUserCreate = {
      externalId: options.externalId,
      isShared: options.isShared,
    }

    const endUser = await this.request<EndUser>('POST', `/api/end-users`, body)
    return endUser
  }

  async getEndUser(options: GetEndUserOptions): Promise<EndUser> {
    if (options.endUserId) {
      return await this.request<EndUser>('GET', `/api/end-users/${options.endUserId}`)
    }

    // Note: The API doesn't currently support getting by externalId or token
    // This would need to be implemented on the server side
    if (options.endUserExternalId || options.endUserToken) {
      throw new AgentViewError(
        {
          message: 'Getting end user by externalId or token is not yet supported by the API',
        },
        501
      )
    }

    throw new AgentViewError(
      {
        message: 'Either endUserId, endUserExternalId, or endUserToken must be provided',
      },
      400
    )
  }

  async updateEndUser(options: UpdateEndUserOptions): Promise<EndUser> {
    const body: EndUserCreate = {
      externalId: options.externalId,
      isShared: options.isShared,
    }

    const endUser = await this.request<EndUser>(
      'PUT',
      `/api/end-users/${options.endUserId}`,
      body
    )
    return endUser
  }
}

