import { AgentView, AgentViewError } from 'agentview'
import { config } from '../config'
import { getEnv } from '../getEnv'

export function getAuthHeaders(): HeadersInit {
  return {
    'X-Organization-Id': config.organizationId,
    'X-Env': getEnv(),
    'Authorization': `Bearer ${localStorage.getItem("agentview_token") || ""}`,
  }
}

export function getAgentView(): AgentView {
  return new AgentView({
    headers: getAuthHeaders,
  })
}

// Convenience singleton for use in loaders/actions
export const agentview = getAgentView()

// Re-export AgentViewError for error handling
export { AgentViewError }

// Utility for actions that need { ok, error } pattern
export async function withErrorHandling<T>(
  fn: () => Promise<T>
): Promise<{ ok: true; data: T } | { ok: false; error: { message: string; statusCode: number; [key: string]: any } }> {
  try {
    return { ok: true, data: await fn() }
  } catch (error) {
    if (error instanceof AgentViewError) {
      return {
        ok: false,
        error: { message: error.message, statusCode: error.statusCode, ...error.details },
      }
    }
    throw error
  }
}
