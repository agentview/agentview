export const colorValues = [
    "red",
    "orange",
    "amber",
    "yellow",
    "lime",
    "green",
    "emerald",
    "teal",
    "cyan",
    "sky",
    "blue",
    "indigo",
    "violet",
    "purple",
    "fuchsia",
    "pink",
    "rose",
    "slate", // "gray" almost identical so dismissed
    "zinc", // "neutral" almost identical so dismissed
    "stone",
] as const;

export type Color = typeof colorValues[number];

export const Colors: Record<Color, string> = {
    red: "var(--color-red-100)",
    orange: "var(--color-orange-100)",
    amber: "var(--color-amber-100)",
    yellow: "var(--color-yellow-100)",
    lime: "var(--color-lime-100)",
    green: "var(--color-green-100)",
    emerald: "var(--color-emerald-100)",
    teal: "var(--color-teal-100)",
    cyan: "var(--color-cyan-100)",
    sky: "var(--color-sky-100)",
    blue: "var(--color-blue-100)",
    indigo: "var(--color-indigo-100)",
    violet: "var(--color-violet-100)",
    purple: "var(--color-purple-100)",
    fuchsia: "var(--color-fuchsia-100)",
    pink: "var(--color-pink-100)",
    rose: "var(--color-rose-100)",
    slate: "var(--color-slate-100)",
    zinc: "var(--color-zinc-100)",
    stone: "var(--color-stone-100)",
}

