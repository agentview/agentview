import type { SessionItemConfig } from "~/types";
import { normalizeExtendedSchema } from "./shared/configUtils";
import { z } from "zod";

export function runDefaultName(itemConfig: SessionItemConfig) {
    const schema = normalizeExtendedSchema(itemConfig.schema);
    
    // Get the shape of the schema to inspect field definitions
    const shape = schema.shape;
    
    // Check if fields are string literals (z.literal instances)
    const hasTypeLiteral = shape.type instanceof z.ZodLiteral;
    const hasNameLiteral = shape.name instanceof z.ZodLiteral;
    const hasRoleLiteral = shape.role instanceof z.ZodLiteral;
    
    // Get the literal values if they exist
    const typeValue = hasTypeLiteral ? shape.type._def.value : undefined;
    const nameValue = hasNameLiteral ? shape.name._def.value : undefined;
    const roleValue = hasRoleLiteral ? shape.role._def.value : undefined;
    
    // Apply the rules for default name generation
    if (typeValue && nameValue) {
        return `${typeValue} / ${nameValue}`;
    }
    
    if (typeValue && roleValue && !nameValue) {
        return `${typeValue} / ${roleValue}`;
    }
    
    if (!typeValue) {
        if (nameValue) {
            return nameValue;
        }
        if (roleValue) {
            return roleValue;
        }
    }
    
    // Otherwise return undefined
    return undefined;
}   