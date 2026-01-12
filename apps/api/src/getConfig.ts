import { configs } from "./schemas/schema";
import { eq, isNull, and } from "drizzle-orm";
import type { Transaction } from "./types";

/**
 * Get config row for a user.
 * - userId = null: production config (shared across org)
 * - userId = string: user's development config
 */
export async function getConfigRow(tx: Transaction, envId: string | null) { // envId is actually either null (production) or user id (user's dev environment). For now!
    const configRows = await tx
        .select()
        .from(configs)
        .where(envId === null ? isNull(configs.envId) : eq(configs.envId, envId))
        .limit(1);

    if (configRows.length === 0) {
        return undefined;
    }

    return configRows[0] ?? undefined;
}
