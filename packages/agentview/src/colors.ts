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
