import { config } from "../config";

function isValidAgent(agent: string) {
    return config.agents?.some((a) => a.name === agent);
}

export function getCurrentAgent(request: Request) {
    const url = new URL(request.url);
    let agent: string | undefined = undefined;

    const searchParamsAgent = url.searchParams.get('agent');
    const localStorageAgent = window.localStorage.getItem('agent');

    if (searchParamsAgent) {
        if (!isValidAgent(searchParamsAgent)) {
            throw new Error(`search param agent is invalid: "${searchParamsAgent}"`);
        }
        agent = searchParamsAgent;
    }
    else if (localStorageAgent && isValidAgent(localStorageAgent)) {
        agent = localStorageAgent;
    }
    else {
        const defaultAgent = config.agents?.[0];
        if (!defaultAgent) {
            throw new Error(`[session list] no agents found`);
        }
        agent = defaultAgent.name;
    }

    window.localStorage.setItem('agent', agent);
    return agent;
}