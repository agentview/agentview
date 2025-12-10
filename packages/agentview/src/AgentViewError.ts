export interface AgentViewErrorDetails {
    cause?: any
    code?: "parse.schema"
    [key: string]: any
}

export class AgentViewError extends Error {
    details?: AgentViewErrorDetails
    statusCode: number

    constructor(message: string, statusCode: number, details?: AgentViewErrorDetails) {
        super(message)
        this.name = 'AgentViewError'
        this.statusCode = statusCode
        this.details = details
    }

    toString() {
        return `AgentViewError: ${this.message} (status: ${this.statusCode})${this.details ? `, details: ${JSON.stringify(this.details)}` : ''}`;
    }
}

export type AgentViewErrorBody = AgentViewErrorDetails & {
    message: string
}