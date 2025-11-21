import type { Run, Session } from "./apiTypes";
import type { BaseAgentViewConfig, BaseAgentConfig, BaseSessionItemConfig, BaseScoreConfig, Metadata, BaseRunConfig } from "./configTypes";
import { z, ZodString } from "zod";
import { getAllSessionItems } from "./sessionUtils";
import { AgentViewError } from "./AgentViewError";

export function requireAgentConfig<T extends BaseAgentViewConfig>(config: T, agentName: string): NonNullable<T["agents"]>[number] {
    const agentConfig = config.agents?.find((agent) => agent.name === agentName);
    if (!agentConfig) {
        throw new Error(`Agent config not found for agent '${agentName}'`);
    }
    return agentConfig;
}


export function findMatchingRunConfigs<T extends BaseAgentConfig>(agentConfig: T, inputItemContent: any) {
    let matchingRunConfigs: BaseRunConfig[] = [];

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

export function findItemConfig<RunT extends BaseRunConfig>(runConfig: RunT, items: any[], contentOrId: string | Record<string, any>, itemType?: "input" | "output" | "step") : { itemConfig: RunT["output"], content: any, toolCallContent?: any } | undefined {
    // console.log("--------------------------------")
    // type RunT = NonNullable<T["runs"]>[number];
    type ItemConfigT = RunT["output"] & SessionItemExtension; // output type is the same as step type, we also ignore input type difference for now 

    // existing session id
    let newContent: Record<string, any>;
    let prevContent: Record<string, any>[]

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

    const matches = matchItemConfigs(availableItemConfigs, newContent, prevContent);

    if (matches.length === 0) {
        return undefined;
    }
    else if (matches.length > 1) {
        console.warn(`More than 1 run was matched for the item content.`);
        console.warn('Item content', newContent);
        console.warn('Matches', matches)
        return undefined;
    }

    const { __type, content, toolCallContent, ...itemConfig } = matches[0];
    return { itemConfig, content, toolCallContent };
}


function getCallIdKey(inputSchema: z.ZodType): any | undefined {
    const shape = inputSchema.shape;

    for (const [key, value] of Object.entries(shape)) {
        const meta = value.meta(); // fixme: it could be any type, even without shape

        // @ts-ignore
        if (meta?.callId === true) {
            return key;
        }
    }
    return undefined;
}

function matchItemConfigs<T extends BaseSessionItemConfig & SessionItemExtension>(itemConfigs: T[], content: Record<string, any>, prevItems: Record<string, any>[]): T[] {
    const matches: T[] = [];

    for (const itemConfig of itemConfigs) {
        const { success, data } = itemConfig.schema.safeParse(content);
        if (success) {
            matches.push({ ...itemConfig, content: data });
        }
        
        if (itemConfig.callResult) {
            if (!itemConfig.callResult.schema.safeParse(content).success) {
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

                const { success, data } = itemConfig.schema.safeParse(prevItem);
                if (success && prevItem[callIdKey] === content[resultIdKey]) { // if both keys are `undefined`, first match.
                    matches.push({
                        ...itemConfig.callResult,
                        content: data,
                        toolCallContent: prevItem,
                    } as T);
                    break;
                }
            }
        }
    }

    return matches;
}

// export function metadataToSchema(metadata?: Metadata, allowUnknownKeys: boolean = true): z.ZodObject {
//     let schema = z.object(metadata ?? {});

//     if (allowUnknownKeys) {
//         return schema.loose();
//     }
//     else {
//         return schema.strict();
//     }
// }




// export function normalizeExtendedSchema(extendedSchema?: ExtendedSchema, looseMatching: boolean = true): z.ZodObject {
//     let schema: z.ZodObject;

//     if (!extendedSchema) {
//         schema = z.object({});
//     }
//     else if (extendedSchema instanceof z.ZodType && extendedSchema instanceof z.ZodObject) {
//         schema = extendedSchema;
//     }
//     else if (typeof extendedSchema === "object" && extendedSchema !== null && !Array.isArray(extendedSchema)) {
//         const shape: Record<string, any> = {};
//         for (const [key, val] of Object.entries(extendedSchema)) {
//             if (val instanceof z.ZodType) {
//                 shape[key] = val;
//             }
//             else if (typeof val === "string") {
//                 shape[key] = z.literal(val);
//             }
//             else if (typeof val === "number" || typeof val === "boolean" || val === null) {
//                 shape[key] = z.literal(val);
//             }
//             else {
//                 shape[key] = z.any();
//             }
//         }
//         schema = z.object(shape);
//     }
//     else {
//         throw new Error("Invalid schema, must be z.ZodObject or object");
//     }

//     if (looseMatching) {
//         return schema.loose();
//     }
//     else {
//         return schema.strict();
//     }
// }

// 1. remove functions and react components
// 2. convert zod schemas to json schemas
export function makeObjectSerializable(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }
  
    // Handle Zod schemas
    if (obj instanceof z.ZodType) {
      return z.toJSONSchema(obj);
    }
  
    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map(makeObjectSerializable);
    }
  
    // Handle objects
    if (typeof obj === "object") {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (isFunction(value) || isReactComponent(value)) {
          continue;
        }
        result[key] = makeObjectSerializable(value);
      }
      return result;
    }
  
    // Primitives
    return obj;
  }
  
  // Helper function to check if a value is a React component
  function isReactComponent(value: any): boolean {
    return typeof value === 'function' && (
      value.displayName ||
      value.name?.startsWith('React') ||
      value.$$typeof === Symbol.for('react.element') ||
      value.$$typeof === Symbol.for('react.memo') ||
      value.$$typeof === Symbol.for('react.forward_ref')
    );
  }
  
  // Helper function to check if a value is a function (excluding React components)
  function isFunction(value: any): boolean {
    return typeof value === 'function' && !isReactComponent(value);
  }
  
