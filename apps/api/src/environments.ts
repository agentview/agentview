import { environments } from "./schemas/schema";
import { eq, isNull, and } from "drizzle-orm";
import type { Transaction } from "./types";
import { HTTPException } from "hono/http-exception";

export type ProdEnv = {
    type: 'prod'
}

export type DevEnv = {
    type: 'dev',
    memberId: string
}

export type Env = ProdEnv | DevEnv;


/**
 * Get config row for a user.
 * - userId = null: production config (shared across org)
 * - userId = string: user's development config
 */
export async function getEnvironment(tx: Transaction, env: Env) { // envId is actually either null (production) or user id (user's dev environment). For now!
    const configRows = await tx
        .select()
        .from(environments)
        .where(env.type === 'prod' ? isNull(environments.userId) : eq(environments.userId, env.memberId))
        .limit(1);

    if (configRows.length === 0) {
        return undefined;
    }

    return configRows[0] ?? undefined;
}

export async function requireEnvironment(tx: Transaction, env: Env) {
    const environment = await getEnvironment(tx, env);
    if (!environment) {
        throw new HTTPException(404, { message: "Environment not found" });
    }
    return environment;
}