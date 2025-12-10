import type { z } from 'zod';

/**
 * 
 * Explanation from Codex:
 * 
 * @hono/zod-openapi augments ZodType to add an openapi(...) method. TypeScript only sees that augmentation on the exact zod package instance where the types are loaded.
 * The workspace had two zod type sources in play: the app’s apps/api/node_modules/zod (augmented by zod-to-openapi) and another copy resolved via workspace packages. The schemas coming from the un-augmented zod copy lacked openapi, so every place createRoute/response_data/body expected an augmented ZodType blew up with “Property 'openapi' is missing…”. The mismatched types also made the checker churn for ~90s.
 * 
 * Why the fix works:
 * apps/api/tsconfig.json now pins resolution of "zod" to the app’s own node_modules via baseUrl + paths, so all imports (including those from workspace packages) share the augmented ZodType.
 * tsconfig.json also explicitly loads @asteasolutions/zod-to-openapi types, and src/types/zod-openapi.d.ts adds a local augmentation fallback, so the openapi member is always on ZodType.
 * With a single, augmented zod view, the type expectations line up and the deep instantiation stops thrashing. npx tsc --noEmit now finishes cleanly in ~2s instead of timing out with the missing openapi errors.
 */
declare module 'zod' {
  interface ZodType<Output = unknown, Def extends z.ZodTypeDef = z.ZodTypeDef, Input = Output> {
    openapi(metadata?: unknown, options?: unknown): this;
    openapi(refId: string, metadata?: unknown, options?: unknown): this;
  }
}
