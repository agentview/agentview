// import { buildSchemaKey } from "./shared/configUtils";
// import { z } from "zod";



// console.log(buildSchemaKey({
//     type: "message",
//     role: "assistant"
// }));

// console.log(buildSchemaKey({
//     functionCall: z.object({
//         test: z.any(),
//         dupa: z.string()
//     })
// }));


function isSubset(a: any, b: any): boolean {
    if (a === b) return true;
    if (typeof a !== 'object' || typeof b !== 'object' || a == null || b == null)
      return false;
  
    return Object.keys(a).every(
      key => key in b && isSubset(a[key], b[key])
    );
  }

console.log(isSubset({
    a: {
    }
}, {
    a: {
        b: {
            c: 1,
            d: 2
        }
    }
}));