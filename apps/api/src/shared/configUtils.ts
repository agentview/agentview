import type { BaseAgentViewConfig, BaseAgentConfig, BaseSessionItemConfig, BaseScoreConfig, SessionItemSchema, SessionItemSchemaKey } from "./configTypes";
import { z } from "zod";

export function requireAgentConfig<T extends BaseAgentViewConfig>(config: T, agentName: string): NonNullable<T["agents"]>[number] {
    const agentConfig = config.agents?.find((agent) => agent.name === agentName);
    if (!agentConfig) {
        throw new Error(`Agent config not found for agent '${agentName}'`);
    }
    return agentConfig;
}

export function findItemAndRunConfig<T extends BaseAgentConfig>(agentConfig: T, content: any, itemType?: "input" | "output" | "step") {
    type RunT = NonNullable<T["runs"]>[number];
    type ItemConfigT = RunT["output"] & { __type: "input" | "output" | "step" }; // output type is the same as step type, we also ignore input type difference for now 

    const matches : Array<{ 
        runConfig: RunT, 
        itemConfigs: ItemConfigT[]
    }> = []

    for (const runConfig of agentConfig.runs ?? []) {
        const availableItemConfigs: ItemConfigT[] = [];

        if (!itemType || itemType === "input") {
            availableItemConfigs.push({ ...runConfig.input, __type: "input" });
        }
        if (!itemType || itemType === "output") {
            availableItemConfigs.push({ ...runConfig.output, __type: "output" });
        }
        if (!itemType || itemType === "step") {
            availableItemConfigs.push(...(runConfig.steps?.map((step) => ({ ...step, __type: "step" as const })) ?? []));
        }

        const matchedItemConfigs = matchItemConfigs(availableItemConfigs, content);
        if (matchedItemConfigs.length > 0) {
            matches.push({
                runConfig,
                itemConfigs: matchedItemConfigs,
            });
        }
    }

    if (matches.length === 0) {
        return undefined;
    }
    else if (matches.length > 1) {
        console.warn(`More than 1 run was matched for the item content.`);
        console.warn('Item content', content);
        console.warn('Matches', matches)
        return undefined;
    }

    const runConfig = matches[0].runConfig;
    const itemConfigs = matches[0].itemConfigs;

    if (itemConfigs.length === 0) {
        return undefined;
    }
    else if (itemConfigs.length > 1) {
        console.warn(`More than 1 item was matched for the item content.`);
        console.warn('Item content', content);
        console.warn('Matches', matches[0])
        return undefined;
    }

    const { __type, ...itemConfig } = itemConfigs[0];
    return { runConfig, itemConfig, itemType: __type };
}

export function findItemConfig<T extends BaseAgentConfig>(agentConfig: T, content: any, itemType?: "input" | "output" | "step") {
    const result = findItemAndRunConfig(agentConfig, content, itemType);
    if (!result) {
        return undefined;
    }
    return result.itemConfig;
}

export function findRunConfig<T extends BaseAgentConfig>(agentConfig: T, content: any, itemType?: "input" | "output" | "step") {
    const result = findItemAndRunConfig(agentConfig, content, itemType);
    if (!result) {
        return undefined;
    }
    return result.runConfig;
}

export function requireItemConfig<T extends BaseAgentConfig>(agentConfig: T, content: any , itemType?: "input" | "output" | "step") {
    const result = findItemConfig(agentConfig, content, itemType);
    if (!result) {
        throw new Error(`Item config of type '${itemType}' not found for the item for agent '${agentConfig.name}'.`);
    }
    return result;
}

export function requireRunConfig<T extends BaseAgentConfig>(agentConfig: T, content: any , itemType?: "input" | "output" | "step") {
    const result = findRunConfig(agentConfig, content, itemType);
    if (!result) {
        throw new Error(`Run config of type '${itemType}' not found for the item for agent '${agentConfig.name}'.`);
    }
    return result;
}

function matchItemConfigs<T extends BaseSessionItemConfig>(itemConfigs: T[], content: any): T[] {
    const matches: T[] = [];
    for (const itemConfig of itemConfigs) {
        if (normalizeItemSchema(itemConfig.schema).safeParse(content).success) {
            matches.push(itemConfig);
        }
    }
    return matches;
}

// function matchItemConfigs<T extends BaseSessionItemConfig>(itemConfigs: T[], content: any): T[] {
//     console.log("<<<<< MATCH ITEM CONFIGS >>>>>")
//     console.log("CONTENT:", content)
//     // return matchItemConfigsRaw(itemConfigs, content);

//      // find all matching items first
//     const rawMatches = matchItemConfigsRaw(itemConfigs, content);

//     // split them into normal matches and call results
//     const normalMatches = rawMatches.filter(c => !c.resultOf);
//     const callResultMatches = rawMatches.filter(c => c.resultOf);

//     const matches: T[] = normalMatches;

//     // for call results we must check caller match too
//     for (const itemConfig of callResultMatches) {
        


//         const callItemConfigs = itemConfigs.filter(c => {
//             if (c.resultOf) {
//                 return false;
//             }
//             console.log('---');
//             console.log('key1', getSchemaKey(c.schema));
//             console.log('key2', getSchemaKey(itemConfig.resultOf!));
//             const result = keysMatch(getSchemaKey(c.schema), getSchemaKey(itemConfig.resultOf!))
//             console.log('result: ', result);
//             return result;
//         });
//         console.log('num: ', callItemConfigs.length);

//         if (callItemConfigs.length === 0) {
//             console.warn("resultOf error: no call matched");
//         }
//         else if (callItemConfigs.length > 1) {
//             console.warn("resultOf error: more than 1 call matched");
//         }
//         else {
//             matches.push({
//                 ...itemConfig,
//                 call: callItemConfigs[0],
//             });
//         }
//     }

//     console.log("MATCHES", matches)

//     return matches;
// }

// function matchItemConfigsRaw<T extends BaseSessionItemConfig>(itemConfigs: T[], content: any): T[] {
//     const matches: T[] = [];
//     for (const itemConfig of itemConfigs) {
//         if (normalizeItemSchema(itemConfig.schema).safeParse(content).success) {
//             matches.push(itemConfig);
//         }
//     }
//     return matches;
// }


export function normalizeItemSchema(schema: SessionItemSchema): z.ZodObject {
    if (schema instanceof z.ZodType) {
        if (schema instanceof z.ZodObject) {
            return schema;
        }
    }
    else if (typeof schema === "object") {
        const shape: Record<string, any> = {};
        for (const [key, val] of Object.entries(schema)) {
            if (typeof val === "string") {
                shape[key] = z.literal(val);
            } else {
                shape[key] = val;
            }
        }
        return z.object(shape);
    }
    throw new Error("Invalid schema, must be z.ZodObject or object");
}


export function getSchemaKey(schema: SessionItemSchema): SessionItemSchemaKey {
    const normalizedSchema = normalizeItemSchema(schema);

    const result: SessionItemSchemaKey = {};
    
    for (const [key, value] of Object.entries(normalizedSchema.shape)) {
        if (value instanceof z.ZodOptional) {
            continue;
        }

        if (value instanceof z.ZodLiteral && typeof value.value === "string") {
            result[key] = value.value;
        }
        else if (value instanceof z.ZodObject) {
            result[key] = getSchemaKey(value.shape);
        }
        else {
            result[key] = null;
        }
    }
    
    return result;
}


function keysMatch(schemaKey1: SessionItemSchemaKey, schemaKey2: SessionItemSchemaKey): boolean {
    for (const [key, value] of Object.entries(schemaKey2)) {
        if (schemaKey1[key] === undefined) {
            return false;
        }

        if (typeof value === "object" && value !== null && typeof schemaKey1[key] === "object" && schemaKey1[key] !== null) {
            if (!keysMatch(schemaKey1[key], value)) {
                return false;
            }
        }
        else if (value !== schemaKey1[key]) {
            return false;
        }
    }
    return true;
}
