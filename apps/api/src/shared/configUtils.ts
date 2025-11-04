import type { BaseAgentViewConfig, BaseAgentConfig, BaseSessionItemConfig } from "./configTypes";
import { normalizeItemSchema } from "./sessionUtils";

export function requireAgentConfig<T extends BaseAgentViewConfig>(config: T, agentName: string) {
    const agentConfig = config.agents?.find((agent) => agent.name === agentName);
    if (!agentConfig) {
        throw new Error(`Agent config not found for agent '${agentName}'`);
    }
    return agentConfig;
}

export function findRunConfig<T extends BaseAgentConfig>(agentConfig: T, content: any) {
    for (const run of agentConfig.runs ?? []) {
        if (checkItemConfigMatch(run.input, content) || checkItemConfigMatch(run.output, content) || run.steps?.find((step) => checkItemConfigMatch(step, content))) {
            return run;
        }
    }
}

export function requireRunConfig<T extends BaseAgentConfig>(agentConfig: T, content: any) {
    const runConfig = findRunConfig(agentConfig, content);
    if (!runConfig) {
        throw new Error(`Run config not found for item for agent '${agentConfig.name}'.`);
    }
    return runConfig;
}

export function findItemConfig<T extends BaseAgentConfig>(agentConfig: T, content: any, runItemType?: "input" | "output" | "step") {    
    const runConfig = findRunConfig(agentConfig, content);
    if (!runConfig) {
        return
    }
    
    const foundItems : Exclude<T["runs"], undefined>[number]["input"][] = [];

    if (!runItemType || runItemType === "input") {
        if (checkItemConfigMatch(runConfig.input, content)) {
            foundItems.push(runConfig.input)
        }
    }
    if (!runItemType || runItemType === "output") {
        if (checkItemConfigMatch(runConfig.output, content)) {
            foundItems.push(runConfig.output)
        }
    }
    if (!runItemType || runItemType === "step") {
        for (const step of runConfig.steps ?? []) {
            if (checkItemConfigMatch(step, content)) {
                foundItems.push(step);
            }
        }
    }
    
    if (foundItems.length === 0) {
        return undefined;
    }

    if (foundItems.length > 1) {
        console.warn(`More than 1 item schemas were matched with a content for agent '${agentConfig.name}'.`);
        console.warn('Content', content);
        console.warn('Found items', foundItems.map((item) => item.schema));
        return undefined;
    }

    return foundItems[0];
}

export function requireItemConfig<T extends BaseAgentConfig>(agentConfig: T, content: any, itemType?: "input" | "output" | "step") {
    const itemConfig = findItemConfig(agentConfig, content, itemType);
    if (!itemConfig) {
        throw new Error(`Item config not found for the item for agent '${agentConfig.name}'. ${itemType ? `For run item type: ${itemType}` : ''}`);
    }
    return itemConfig;
}

function checkItemConfigMatch<T extends BaseSessionItemConfig>(itemConfig: T, content: any) {
    const schema = normalizeItemSchema(itemConfig.schema);
    return schema.safeParse(content).success;
}
