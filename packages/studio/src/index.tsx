import type { RunBody } from "./lib/shared/apiTypes";

export { defineConfig } from "./defineConfig";
export { renderStudio } from "./renderStudio";
export * from "./types";

// export type * from "./types";

export * from "./lib/shared/apiTypes";
// export type * from "./lib/shared/apiTypes"; // fixme: this doesn't work

// export type { RunBody } from "./lib/shared/apiTypes";
// export { RunBodySchema } from "./lib/shared/apiTypes";

export function parseBody(body: any): RunBody & { items: any[] } {
    const bodyTyped: RunBody = body;
    return {
        ...bodyTyped,
        items: bodyTyped.session.runs.flatMap(run => run.items).map(item => item.content),
    }
}