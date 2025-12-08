import { envAllowedValues, type Env } from "./shared/apiTypes";
import { config } from "~/config";

export function getAgentParamAndCheckForRedirect(request: Request) {
    const url = new URL(request.url);
    let agent = url.searchParams.get('agent');
    let needsRedirect = false;
    if (!agent) {
        const defaultAgent = config.agents?.[0];
        if (!defaultAgent) {
            throw new Error(`[session list] no agents found`);
        }
        agent = defaultAgent.name;
        needsRedirect = true;
    }
    return { 
        agent, 
        needsRedirect,
        redirectUrl: needsRedirect ? applyParamsToUrl(url, { agent }) : undefined
    };
}

export function getListParamsAndCheckForRedirect(request: Request) {
    const url = new URL(request.url);

    let envParam = url.searchParams.get('env')
    let env: Env;
    let needsRedirect = false;

    if (!envParam) {
        envParam = "production";
        needsRedirect = true;
    }
    if (envParam === "production" || !envParam) {
        env = "production";
    }
    else if (envParam === "shared-playground") {
        env = "shared-playground";
    }
    else if (envParam === "playground") {
        env = "playground";
    }
    else {
        throw new Error(`[session list] invalid env: ${envParam}. Allowed envs are: ${envAllowedValues.join(", ")}`);
    }

    let agent = url.searchParams.get('agent');

    if (!agent) {
        const defaultAgent = config.agents?.[0];
        if (!defaultAgent) {
            throw new Error(`[session list] no agents found`);
        }
        agent = defaultAgent.name;
        needsRedirect = true;
    }

    const page = url.searchParams.get('page') ?? undefined
    const limit = url.searchParams.get('limit') ?? undefined

    const listParams = { env, agent, page, limit };

    return {
        listParams,
        needsRedirect,
        redirectUrl: needsRedirect ? applyParamsToUrl(url, listParams) : undefined
    }
}

export function getListParams(request: Request) {
    return getListParamsAndCheckForRedirect(request).listParams;
}

export function toQueryParams(obj: Record<string, any>) {
    const definedValues: Record<string, any> = {}
    for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
            definedValues[key] = value
        }
    }

    return new URLSearchParams(definedValues).toString();
}

export function applyParamsToUrl(url: URL, params: Record<string, any>) {
    for (const [key, value] of Object.entries(params)) {
        if (value === undefined) {
            url.searchParams.delete(key);
        }
        else {
            url.searchParams.set(key, value)
        }
    }
    return url;
}