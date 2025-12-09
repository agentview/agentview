import "dotenv/config";
import { auth } from "../src/auth";

const result = await auth.api.signUpEmail({
    body: {
        name: "Admin 2",
        email: "admin2@admin.com",
        password: "blablabla"
    }
})

console.log(result)