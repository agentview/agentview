import type { Session } from "./apiTypes";
import type { BaseAgentViewConfig, BaseAgentConfig, BaseSessionItemConfig, BaseScoreConfig, SessionItemSchema, SessionItemSchemaKey } from "./configTypes";
import { z, ZodString } from "zod";
import { getAllSessionItems } from "./sessionUtils";

export function requireAgentConfig<T extends BaseAgentViewConfig>(config: T, agentName: string): NonNullable<T["agents"]>[number] {
    const agentConfig = config.agents?.find((agent) => agent.name === agentName);
    if (!agentConfig) {
        throw new Error(`Agent config not found for agent '${agentName}'`);
    }
    return agentConfig;
}

// two possible inputs:
// - session (items history) + new item (not yet in session) -> we assume it goes last, all items are previous items
// - session (items history) + item id -> concrete item, we find it and try to find the config
export function findItemAndRunConfig<T extends BaseAgentConfig, SessionT extends Session>(agentConfig: T, session: SessionT, contentOrId: string | Record<string, any>, itemType?: "input" | "output" | "step") {
    console.log("--------------------------------")
    type RunT = NonNullable<T["runs"]>[number];
    type ItemConfigT = RunT["output"] & { __type: "input" | "output" | "step" }; // output type is the same as step type, we also ignore input type difference for now 

    // existing session id
    let newContent: Record<string, any>;
    let prevContent: Record<string, any>[]
    
    const items = getAllSessionItems(session, { activeOnly: true });

    if (typeof contentOrId === "string") {
        const itemIndex = items.findIndex((item) => item.id === contentOrId);
        if (itemIndex === -1) {
            return undefined;
        }

        newContent = items[itemIndex].content;
        prevContent = items.slice(0, itemIndex).map((item) => item.content);
    }
    else {
        newContent = contentOrId;
        prevContent = items.map((item) => item.content);
    }

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

        const matchedItemConfigs = matchItemConfigs(availableItemConfigs, newContent, prevContent);
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
        console.warn('Item content', newContent);
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
        console.warn('Item content', newContent);
        console.warn('Matches', matches[0])
        return undefined;
    }

    const { __type, ...itemConfig } = itemConfigs[0];
    return { runConfig, itemConfig, itemType: __type };
}


export function findItemConfig<T extends BaseAgentConfig, SessionT extends Session>(agentConfig: T, session: SessionT, contentOrId: string | object, itemType?: "input" | "output" | "step") {
    const result = findItemAndRunConfig(agentConfig, session, contentOrId, itemType);
    if (!result) {
        return undefined;
    }
    return result.itemConfig;
}

function matchItemConfigs<T extends BaseSessionItemConfig>(itemConfigs: T[], content: Record<string, any>, prevItems: object[]): T[] {
    const matches: T[] = [];
    console.log('#####')
    console.log(content, prevItems);

    for (const itemConfig of itemConfigs) {
        const schema = normalizeItemSchema(itemConfig.schema);

        // // first pass (without hasMatchingItem)
        // if (!normalizeItemSchema(itemConfig.schema).safeParse(content).success) {
        //     continue;
        // }

        const shape = schema.shape;

        // scan for hasMatchingItem
        Object.entries(shape).forEach(([key, field]) => {
            if (field instanceof ZodString) {
                const hasMatchingItem = field.meta()?.hasMatchingItem as Record<string, string> | undefined;

                console.log('hasMatchingItem', hasMatchingItem);

                // hasMatchingItem must be object
                if (typeof hasMatchingItem !== "object" || hasMatchingItem === null) {
                    return;
                }

                console.log('refining');
                    
                shape[key] = field.refine((value) => {
                    const matchingItem = { ...hasMatchingItem };
                    for (const key in matchingItem) {
                        if (matchingItem[key] === "$this") {
                            matchingItem[key] = value;
                        }
                    }

                    const matchingItemSchema = normalizeItemSchema(matchingItem);
                    console.log('matchingItem', matchingItem);
                    const result = prevItems.some((prevItem) => matchingItemSchema.safeParse(prevItem).success);
                    console.log('result', result);
                    return result
                });
            }
          })

        const refinedSchema = z.object(shape);
        if (refinedSchema.safeParse(content).success) {
            matches.push(itemConfig);
        }

        //   if (!wasHasMatchingItemUsed) {
        //     matches.push(itemConfig);
        //   }
        
        
        // hasMatchingItem: { type: "function_call", name: "weather_tool", callId: "$this" }



        
        // if (normalizeItemSchema(itemConfig.schema).safeParse(content).success) {
        //     matches.push(itemConfig);
        // }
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


// export function getSchemaKey(schema: SessionItemSchema): SessionItemSchemaKey {
//     const normalizedSchema = normalizeItemSchema(schema);

//     const result: SessionItemSchemaKey = {};
    
//     for (const [key, value] of Object.entries(normalizedSchema.shape)) {
//         if (value instanceof z.ZodOptional) {
//             continue;
//         }

//         if (value instanceof z.ZodLiteral && typeof value.value === "string") {
//             result[key] = value.value;
//         }
//         else if (value instanceof z.ZodObject) {
//             result[key] = getSchemaKey(value.shape);
//         }
//         else {
//             result[key] = null;
//         }
//     }
    
//     return result;
// }


// function keysMatch(schemaKey1: SessionItemSchemaKey, schemaKey2: SessionItemSchemaKey): boolean {
//     for (const [key, value] of Object.entries(schemaKey2)) {
//         if (schemaKey1[key] === undefined) {
//             return false;
//         }

//         if (typeof value === "object" && value !== null && typeof schemaKey1[key] === "object" && schemaKey1[key] !== null) {
//             if (!keysMatch(schemaKey1[key], value)) {
//                 return false;
//             }
//         }
//         else if (value !== schemaKey1[key]) {
//             return false;
//         }
//     }
//     return true;
// }
