import type { AgentViewConfig, AgentConfig, SessionItemConfig, RunConfig } from "~/types";
import { normalizeItemSchema } from "./shared/sessionUtils";

export function requireAgentConfig(config: AgentViewConfig, agentName: string) {
    const agentConfig = config.agents?.find((agent) => agent.name === agentName);
    if (!agentConfig) {
        throw new Error(`Agent config not found for agent '${agentName}'`);
    }
    return agentConfig;
}

export function findRunConfig(agentConfig: AgentConfig, content: any) {
    for (const run of agentConfig.runs ?? []) {
        if (checkItemConfigMatch(run.input, content) || checkItemConfigMatch(run.output, content) || run.steps?.find((step) => checkItemConfigMatch(step, content))) {
            return run;
        }
    }
}

export function requireRunConfig(agentConfig: AgentConfig, content: any) {
    const runConfig = findRunConfig(agentConfig, content);
    if (!runConfig) {
        throw new Error(`Run config not found for item for agent '${agentConfig.name}'.`);
    }
    return runConfig;
}

export function findItemConfig(agentConfig: AgentConfig, content: any, runItemType?: "input" | "output" | "step") {    
    const runConfig = findRunConfig(agentConfig, content);
    if (!runConfig) {
        return
    }

    if (!runItemType || runItemType === "input") {
        if (checkItemConfigMatch(runConfig.input, content)) {
            return runConfig.input
        }
    }
    if (!runItemType || runItemType === "output") {
        if (checkItemConfigMatch(runConfig.output, content)) {
            return runConfig.output
        }
    }
    if (!runItemType || runItemType === "step") {
        const result = runConfig.steps?.find((step) => checkItemConfigMatch(step, content))
        if (result) {
            return result;
        }
    }
}

export function requireItemConfig(agentConfig: AgentConfig, content: any, itemType?: "input" | "output" | "step") {
    const itemConfig = findItemConfig(agentConfig, content, itemType);
    if (!itemConfig) {
        throw new Error(`Item config not found for the item for agent '${agentConfig.name}'. ${itemType ? `For run item type: ${itemType}` : ''}`);
    }
    return itemConfig;
}

function checkItemConfigMatch(itemConfig: SessionItemConfig, content: any) {
    const schema = normalizeItemSchema(itemConfig.schema);
    return schema.safeParse(content).success;
    // return itemConfig.type === type && (!itemConfig.role || itemConfig.role === role)
}