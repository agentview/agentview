import type { BaseError } from "./errors";
import { config } from "~/config";

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

export async function apiFetch<T = any>(endpoint: string, options: APIOptions = { method: 'GET', body: undefined }): Promise<APIResponse<T>> {
    const url = new URL(endpoint, config.baseUrl).toString();

    const response = await fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
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
                message: body?.message || "Unknown error",
                data: body?.data || null,
            }
        }
    }

    return {
        ...response,
        ok: true,
        data: body,
    }
}

