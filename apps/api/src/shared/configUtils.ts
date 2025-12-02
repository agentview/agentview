import type { SessionItem } from "./apiTypes";
import type { BaseAgentViewConfig, BaseAgentConfig, BaseSessionItemConfig, BaseScoreConfig, Metadata, BaseRunConfig } from "./configTypes";
import { z } from "zod";
import { AgentViewError } from "./AgentViewError";
import { convertJsonSchemaToZod } from 'zod-from-json-schema';


// Register `callId` meta for zod schemas
declare module "zod" {
    interface GlobalMeta {
        callId?: boolean;
    }
}

z.string().register(z.globalRegistry, {
    callId: true
});

export function requireAgentConfig<T extends BaseAgentViewConfig>(config: T, agentName: string): NonNullable<T["agents"]>[number] {
    const agentConfig = config.agents?.find((agent) => agent.name === agentName);
    if (!agentConfig) {
        throw new Error(`Agent config not found for agent '${agentName}'`);
    }
    return agentConfig;
}


export function findMatchingRunConfigs<T extends BaseAgentConfig>(agentConfig: T, inputItemContent: any) {
    let matchingRunConfigs: NonNullable<T["runs"]>[number][] = [];

    for (const runConfig of agentConfig.runs ?? []) {
        if (runConfig.input.schema.safeParse(inputItemContent).success) {
            matchingRunConfigs.push(runConfig);
        }
    }

    return matchingRunConfigs;
}

export function requireRunConfig<T extends BaseAgentConfig>(agentConfig: T, inputItemContent: any) {
    const matchingRunConfigs = findMatchingRunConfigs(agentConfig, inputItemContent);
    if (matchingRunConfigs.length === 0) {
        throw new AgentViewError(`No run config found for input item content.`, 422, { item: inputItemContent });
    }
    else if (matchingRunConfigs.length > 1) {
        throw new AgentViewError(`More than 1 run config found for input item content.`, 422, { item: inputItemContent });
    }

    return matchingRunConfigs[0]
}


// two possible inputs:
// - session (items history) + new item (not yet in session) -> we assume it goes last, all items are previous items
// - session (items history) + item id -> concrete item, we find it and try to find the config

type SessionItemExtension = { __type: "input" | "output" | "step", content?: any, toolCallContent?: any }

// export function findItemConfigByIndex<RunT extends BaseRunConfig>(runConfig: RunT, items: any[], index: number) : { itemConfig: RunT["output"], content: any, toolCallContent?: any } | undefined {
//     const item = items[index];
//     return findItemConfig(runConfig, items, item, item.__type);
// }

export function findItemConfigById<RunT extends BaseRunConfig>(runConfig: RunT, sessionItems: SessionItem[], itemId: string, itemType?: "input" | "output" | "step"): { itemConfig: RunT["output"], content: any, toolCallContent?: any, type: "input" | "output" | "step" } | undefined {
    const previousItems = [];
    let newItem = undefined;

    for (const sessionItem of sessionItems) {
        if (sessionItem.id === itemId) {
            newItem = sessionItem.content;
            break;
        }
        else {
            previousItems.push(sessionItem.content);
        }
    }

    if (!newItem) {
        return undefined;
    }

    return findItemConfig(runConfig, previousItems, newItem, itemType);
}

export function findItemConfig<RunT extends BaseRunConfig>(runConfig: RunT, items: any[], newItem: Record<string, any>, itemType?: "input" | "output" | "step"): { itemConfig: RunT["output"], content: any, toolCallContent?: any, type: "input" | "output" | "step" } | undefined {
    type ItemConfigT = RunT["output"] & SessionItemExtension; // output type is the same as step type, we also ignore input type difference for now 

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

    const matches = matchItemConfigs(availableItemConfigs, newItem, items);

    if (matches.length === 0) {
        return undefined;
    }
    else if (matches.length > 1) {
        console.warn(`More than 1 run was matched for the item content.`);
        console.warn('Item content', newItem);
        console.warn('Matches', matches)
        return undefined;
    }

    const { __type, content, toolCallContent, ...itemConfig } = matches[0];
    return { itemConfig, content, toolCallContent, type: __type };
}


function getCallIdKey(inputSchema: z.ZodType): any | undefined {
    if (inputSchema instanceof z.ZodObject) {
        const shape = inputSchema.shape;

        for (const [key, value] of Object.entries(shape)) {
            const meta = value.meta(); // fixme: it could be any type, even without shape

            if (meta?.callId === true) {
                return key;
            }
        }
    }
    return undefined;
}


function matchItemConfigs<T extends BaseSessionItemConfig & SessionItemExtension>(itemConfigs: T[], content: Record<string, any>, prevItems: Record<string, any>[]): T[] {
    const matches: T[] = [];

    for (const itemConfig of itemConfigs) {
        const itemParseResult = itemConfig.schema.safeParse(content);
        if (itemParseResult.success) {
            matches.push({ ...itemConfig, content: itemParseResult.data });
        }

        if (itemConfig.callResult) {
            const toolResultParseResult = itemConfig.callResult.schema.safeParse(content);

            if (!toolResultParseResult.success) {
                continue;
            }

            const callIdKey = getCallIdKey(itemConfig.schema);
            const resultIdKey = getCallIdKey(itemConfig.callResult.schema);

            if (!callIdKey || !resultIdKey) {
                console.warn('Both callIdKey and resultIdKey must be defined for result');
                break;
            }

            for (let i = prevItems.length - 1; i >= 0; i--) {
                const prevItem = prevItems[i];

                // if (callResultSchema.safeParse(prevItem).success) { // If we encounter *any* matching result in previous items that already looks like matching response, then we stop looking. 
                //     break;
                // }

                const toolCallParseResult = itemConfig.schema.safeParse(prevItem);

                if (toolCallParseResult.success && prevItem[callIdKey] === content[resultIdKey]) { // if both keys are `undefined`, first match.
                    matches.push({
                        ...itemConfig.callResult,
                        content: toolResultParseResult.data,
                        toolCallContent: prevItem,
                    } as T);
                    break;
                }
            }
        }
    }

    return matches;
}



// // 1. remove functions and react components
// // 2. convert zod schemas to json schemas
// export function makeObjectSerializable(obj: any, path?: string): any {
//     if (obj === null || obj === undefined) {
//         return obj;
//     }

//     // Handle Zod schemas
//     if (obj instanceof z.ZodType) {
//         return z.toJSONSchema(obj);
//     }

//     // Handle arrays
//     if (Array.isArray(obj)) {
//         return obj.map((value, index) => makeObjectSerializable(value, path ? `${path}[${index}]` : index.toString()));
//     }

//     // Handle objects
//     if (typeof obj === "object") {
//         const result: any = {};
//         for (const [key, value] of Object.entries(obj)) {
//             console.log('key-value', path + "." + key);
//             if (isFunction(value) || isReactComponent(value)) {
//                 continue;
//             }
//             result[key] = makeObjectSerializable(value, path ? `${path}.${key}` : key);
//         }
//         return result;
//     }

//     // Primitives
//     return obj;
// }

// // Helper function to check if a value is a React component
// function isReactComponent(value: any): boolean {
//     return typeof value === 'function' && (
//         value.displayName ||
//         value.name?.startsWith('React') ||
//         value.$$typeof === Symbol.for('react.element') ||
//         value.$$typeof === Symbol.for('react.memo') ||
//         value.$$typeof === Symbol.for('react.forward_ref')
//     );
// }

// // Helper function to check if a value is a function (excluding React components)
// function isFunction(value: any): boolean {
//     return typeof value === 'function' && !isReactComponent(value);
// }




const JsonSchema = z.record(z.string(), z.any()).refine((value) => isJSONSchema(value), {
    message: "Invalid JSON Schema format",
});

const JsonSchemaToZod = JsonSchema.transform((schema) => convertJsonSchemaToZod(schema))

const ZodToJsonSchema = z.any()
    .refine((value) => {
        try {
            z.toJSONSchema(value);
            return true;
        }
        catch (error) {
            return false;
        }
    }, {
        message: "must be correct Zod schema",
    })
    .transform((schema) => z.toJSONSchema(schema))


function baseConfigSchema<T extends z.ZodType>(jsonSchemaSchema: T) {
    // const ExtendedSchema = z.union([
    //     jsonSchemaSchema,
    //     z.record(z.string(), z.union([jsonSchemaSchema, z.string()]))
    // ]);

    const BaseSessionItemConfigSchema = z.object({
        schema: jsonSchemaSchema,
        scores: z.array(z.object({
            name: z.string(),
            schema: jsonSchemaSchema,
        })).optional(),
    });

    const BaseSessionItemConfigSchemaWithTools = BaseSessionItemConfigSchema.extend({
        callResult: BaseSessionItemConfigSchema.optional(),
    });

    return z.object({
        agents: z.array(z.object({
            name: z.string(),
            metadata: z.record(z.string(), jsonSchemaSchema).optional(),
            allowUnknownMetadata: z.boolean().optional(),
            runs: z.array(z.object({
                input: BaseSessionItemConfigSchema,
                output: BaseSessionItemConfigSchema,
                steps: z.array(BaseSessionItemConfigSchemaWithTools).optional(),
                metadata: z.record(z.string(), jsonSchemaSchema).optional(),
                allowUnknownMetadata: z.boolean().optional(),
            })).optional(),
        })).optional(),
    })
}

export const BaseConfigSchema = baseConfigSchema(JsonSchema)
export const BaseConfigSchemaToZod = baseConfigSchema(JsonSchemaToZod)
export const BaseConfigSchemaZodToJsonSchema = baseConfigSchema(ZodToJsonSchema)


function isJSONSchema(value: any): boolean { // temporarily simple check
    return typeof value === 'object' && value !== null && '$schema' in value;
}


export function serializeConfig(config: any) {    
    console.log('xconfig', config);

    const { data, success, error } = BaseConfigSchemaZodToJsonSchema.safeParse(config);
    if (!success) {
        throw new Error("Invalid config", { cause: error.issues });
    }
    return data;
}