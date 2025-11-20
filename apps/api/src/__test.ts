import "dotenv/config";
import { z } from "zod";
import { convertJsonSchemaToZod } from 'zod-from-json-schema';

const schema = z.looseObject({
  type: z.literal("test"),
  name: z.string(),
  age: z.number(),
  test: z.object({
    foo: z.string(),
    bar: z.number(),
  })
});

console.log(schema.shape);

// console.log(z.toJSONSchema(z.optional(z.string())));

// console.log(schema.parse({ name: "John", age: 30, test: { foo: "baz", bar: 123, xxx: 123 } }));

// const schema2 = convertJsonSchemaToZod(z.toJSONSchema(schema));

// console.log(schema2.parse({ name: "John", age: 30, test: { foo: "baz", bar: 123, xxx: 123 } }));

// const schema2 = convertJsonSchemaToZod(z.toJSONSchema(schema));


// console.log(z.toJSONSchema(convertJsonSchemaToZod(schema)))
// import { auth } from "./auth";

// const response = await auth.api.signInEmail({
//   returnHeaders: true,
//   body: {
//       email: "admin@admin.com",
//       password: "blablabla"
//   }
// })

// const cookie = response.headers.get("set-cookie")!.split(";")[0];
// const headers = new Headers();
// headers.set("Cookie", cookie);


// // const session = await auth.api.getSession({
// //   headers
// // })

// // console.log(session);

// // // const user = response.user;
// // // const userId = user.id;

// // const data = await auth.api.createApiKey({
// //   body: {
// //       name: 'xxx',
// //       expiresIn: 60 * 60 * 24 * 365
// //   },
// //   headers
// // });

// // console.log(data);


// const data2 = await auth.api.listApiKeys({
//   headers
// });

// console.log("--------------------------------");
// console.log(data2);

// const data3 = await auth.api.getApiKey({
//   query: {
//     id: data2[0].id, // required
//   },
//   headers
// })
// console.log("--------------------------------");

// console.log(data3);