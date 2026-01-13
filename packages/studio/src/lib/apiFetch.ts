import type { BaseError } from "./errors";
import { config } from "../config";
import { getEnv } from "../getEnv";

type APISuccessResponse<T> = Response & {
    ok: true;
    data: T;
}

type APIErrorResponse = Response & {
    ok: false;
    error: BaseError;
}

type APIResponse<T> = APISuccessResponse<T> | APIErrorResponse;

type APIOptions = {
    method?: RequestInit['method'];
    body?: any
}

export function getAuthHeaders(): HeadersInit {
    return {
        'X-Organization-Id': config.organizationId,
        'X-Env': getEnv(),
        'Authorization': `Bearer ${localStorage.getItem("agentview_token") || ""}`,
    }
}

export async function apiFetch<T = any>(endpoint: string, options: APIOptions = { method: 'GET', body: undefined }): Promise<APIResponse<T>> {
    const url = new URL(endpoint, import.meta.env.VITE_AGENTVIEW_API_URL).toString();

    const response = await fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
    });

    let body: any;

    try {
        body = await response.json();
    } catch (error) {
        body = null;
    }

    if (!response.ok) {
        return {
            ...response,
            ok: false,
            error: {
                ...body,
                message: body?.message || "Unknown error",
            }
        }
    }

    return {
        ...response,
        ok: true,
        data: body,
    }
}

