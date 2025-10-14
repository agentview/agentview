export const colorMap : Record<string, string> = {
    "red": "bg-red-100",
    "orange": "bg-orange-100",
    "amber": "bg-amber-100",
    "yellow": "bg-yellow-100",
    "lime": "bg-lime-100",
    "green": "bg-green-100",
    "emerald": "bg-emerald-100",
    "teal": "bg-teal-100",
    "cyan": "bg-cyan-100",
    "sky": "bg-sky-100",
    "blue": "bg-blue-100",
    "indigo": "bg-indigo-100",
    "violet": "bg-violet-100",
    "purple": "bg-purple-100",
    "fuchsia": "bg-fuchsia-100",
    "pink": "bg-pink-100",
    "rose": "bg-rose-100",
    "slate": "bg-slate-100",
    "gray": "bg-gray-100",
    "zinc": "bg-zinc-100",
    "neutral": "bg-neutral-100",
    "stone": "bg-stone-100",
}

function getRandomColor() {
    return Object.keys(colorMap)[Math.floor(Math.random() * Object.keys(colorMap).length)];
}