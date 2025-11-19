import type { Session } from "./apiTypes";
import type { BaseAgentViewConfig, BaseAgentConfig, BaseSessionItemConfig, BaseScoreConfig, ExtendedSchema, Metadata } from "./configTypes";
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

type SessionItemExtension = { __type: "input" | "output" | "step", toolCallContent?: any }

export function findItemAndRunConfig<T extends BaseAgentConfig, SessionT extends Session>(agentConfig: T, session: SessionT, contentOrId: string | Record<string, any>, itemType?: "input" | "output" | "step") {
    // console.log("--------------------------------")
    type RunT = NonNullable<T["runs"]>[number];
    type ItemConfigT = RunT["output"] & SessionItemExtension; // output type is the same as step type, we also ignore input type difference for now 

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

    const { __type, toolCallContent, ...itemConfig } = itemConfigs[0];
    return { runConfig, itemConfig, itemType: __type, toolCallContent };
}


export function findItemConfig<T extends BaseAgentConfig, SessionT extends Session>(agentConfig: T, session: SessionT, contentOrId: string | object, itemType?: "input" | "output" | "step") {
    const result = findItemAndRunConfig(agentConfig, session, contentOrId, itemType);
    if (!result) {
        return undefined;
    }
    return result.itemConfig;
}


function getCallIdKey(inputSchema: ExtendedSchema): any | undefined {
    const schema = normalizeExtendedSchema(inputSchema);
    const shape = schema.shape;
    for (const [key, value] of Object.entries(shape)) {
        const meta = value.meta();

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
        const schema = normalizeExtendedSchema(itemConfig.schema);

        if (schema.safeParse(content).success) {
            matches.push(itemConfig);
        }
        
        if (itemConfig.callResult) {
            const callResultSchema = normalizeExtendedSchema(itemConfig.callResult.schema);
            if (!callResultSchema.safeParse(content).success) {
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

                if (schema.safeParse(prevItem).success && prevItem[callIdKey] === content[resultIdKey]) { // if both keys are `undefined`, first match.
                    matches.push({
                        ...itemConfig.callResult,
                        toolCallContent: prevItem,
                    } as T);
                    break;
                }
            }
        }
    }

    return matches;
}

export function metadataToSchema(metadata?: Metadata, allowUnknownKeys: boolean = true): z.ZodObject {
    let schema = z.object(metadata ?? {});

    if (allowUnknownKeys) {
        return schema.loose();
    }
    else {
        return schema.strict();
    }
}

export function parseMetadata(metadataConfig: Metadata | undefined, allowUnknownKeys: boolean = true, inputMetadata: Record<string, any>, existingMetadata: Record<string, any> | undefined | null) : any {
    let schema = z.object(metadataConfig ?? {});
    if (allowUnknownKeys) {
        schema = schema.loose();
    }

    const metadata = {
        ...(existingMetadata ?? {}),
        ...(inputMetadata ?? {}),
    }

    // delete old values
    for (const [key, value] of Object.entries(metadata)) {
        if (value === null || value === undefined) {
            delete metadata[key];
        }
    }

    return schema.safeParse(metadata);
}







export function normalizeExtendedSchema(extendedSchema?: ExtendedSchema, allowUnknownKeys: boolean = true): z.ZodObject {
    let schema: z.ZodObject;

    if (!extendedSchema) {
        schema = z.object({});
    }
    else if (extendedSchema instanceof z.ZodType && extendedSchema instanceof z.ZodObject) {
        schema = extendedSchema;
    }
    else if (typeof extendedSchema === "object" && extendedSchema !== null && !Array.isArray(extendedSchema)) {
        const shape: Record<string, any> = {};
        for (const [key, val] of Object.entries(extendedSchema)) {
            if (val instanceof z.ZodType) {
                shape[key] = val;
            }
            else if (typeof val === "string") {
                shape[key] = z.literal(val);
            }
            else if (typeof val === "number" || typeof val === "boolean" || val === null) {
                shape[key] = z.literal(val);
            }
            else {
                shape[key] = z.any();
            }
        }
        schema = z.object(shape);
    }
    else {
        throw new Error("Invalid schema, must be z.ZodObject or object");
    }

    if (allowUnknownKeys) {
        return schema.loose();
    }
    else {
        return schema.strict();
    }
}

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
  
