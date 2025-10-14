export function ColorAvatar({ letter, color }: { letter: string, color: string, size?: number }) {
    const colorMap : Record<string, string> = {
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

    const bgClass = colorMap[color] ?? "bg-gray-100";

    return <div className={`relative size-[24px] ${bgClass} rounded-full flex justify-center items-center text-black `}>
        <span style={{ fontSize: "12px", lineHeight: 1, opacity: 0.8, marginTop: "1px" }}>
            {letter?.charAt(0).toUpperCase()}
        </span>
    </div>
}


// export function CustomPage() {
//     return <div className="flex-1">
//         <Header>
//             <HeaderTitle title={`Custom Page`} />
//         </Header>
//         <div className="p-6">

//             <div className="flex flex-row gap-2">
//                 {[
//                     { letter: "R", color: "bg-red-100" },
//                     { letter: "O", color: "bg-orange-100" },
//                     { letter: "A", color: "bg-amber-100" },
//                     { letter: "Y", color: "bg-yellow-100" },
//                     { letter: "L", color: "bg-lime-100" },
//                     { letter: "G", color: "bg-green-100" },
//                     { letter: "E", color: "bg-emerald-100" },
//                     { letter: "T", color: "bg-teal-100" },
//                     { letter: "C", color: "bg-cyan-100" },
//                     { letter: "S", color: "bg-sky-100" },
//                     { letter: "B", color: "bg-blue-100" },
//                     { letter: "I", color: "bg-indigo-100" },
//                     { letter: "V", color: "bg-violet-100" },
//                     { letter: "P", color: "bg-purple-100" },
//                     { letter: "F", color: "bg-fuchsia-100" },
//                     { letter: "K", color: "bg-pink-100" },
//                     { letter: "R", color: "bg-rose-100" },
//                     { letter: "S", color: "bg-slate-100" },
//                     { letter: "G", color: "bg-gray-100" },
//                     { letter: "Z", color: "bg-zinc-100" },
//                     { letter: "N", color: "bg-neutral-100" },
//                     { letter: "S", color: "bg-stone-100" },
//                 ].map((item, idx) => (
//                     <ColorAvatar key={idx} letter={item.letter} color={item.color} />
//                 ))}
            // </div>