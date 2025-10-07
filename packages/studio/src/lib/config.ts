import type { AgentViewConfig, AgentConfig, SessionItemConfig, RunConfig } from "~/types";

export function requireAgentConfig(config: AgentViewConfig, agentName: string) {
    const agentConfig = config.agents?.find((agent) => agent.name === agentName);
    if (!agentConfig) {
        throw new Error(`Agent config not found for agent '${agentName}'`);
    }
    return agentConfig;
}

export function findRunConfig(agentConfig: AgentConfig, type: string, role?: string | null) {
    for (const run of agentConfig.runs ?? []) {
        if (checkItemConfigMatch(run.input, type, role) || checkItemConfigMatch(run.output, type, role) || run.steps?.find((step) => checkItemConfigMatch(step, type, role))) {
            return run;
        }
    }
}

export function requireRunConfig(agentConfig: AgentConfig, type: string, role?: string | null) {
    const runConfig = findRunConfig(agentConfig, type, role);
    if (!runConfig) {
        throw new Error(`Run config not found for item (type: '${type}', role: '${role}') for agent '${agentConfig.name}'.`);
    }
    return runConfig;
}

export function findItemConfig(agentConfig: AgentConfig, type: string, role?: string | null, runItemType?: "input" | "output" | "step") {    
    const runConfig = findRunConfig(agentConfig, type, role);
    if (!runConfig) {
        return
    }

    if (!runItemType || runItemType === "input") {
        if (checkItemConfigMatch(runConfig.input, type, role)) {
            return runConfig.input
        }
    }
    if (!runItemType || runItemType === "output") {
        if (checkItemConfigMatch(runConfig.output, type, role)) {
            return runConfig.output
        }
    }
    if (!runItemType || runItemType === "step") {
        const result = runConfig.steps?.find((step) => checkItemConfigMatch(step, type, role))
        if (result) {
            return result;
        }
    }
}

export function requireItemConfig(agentConfig: AgentConfig, type: string, role?: string | null, runItemType?: "input" | "output" | "step") {
    const itemConfig = findItemConfig(agentConfig, type, role, runItemType);
    if (!itemConfig) {
        throw new Error(`Item config not found for item (type: '${type}', role: '${role}') for agent '${agentConfig.name}'. ${runItemType ? `For run item type: ${runItemType}` : ''}`);
    }
    return itemConfig;
}

function checkItemConfigMatch(itemConfig: SessionItemConfig, type: string, role?: string | null) {
    return itemConfig.type === type && (!itemConfig.role || itemConfig.role === role)
}