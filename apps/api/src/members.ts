import { db } from "./db";
import { users } from "./schemas/auth-schema";
import { count } from "drizzle-orm";

export async function getTotalMemberCount() {
    const result = await db.select({ count: count() }).from(users);
    return result[0].count;
}