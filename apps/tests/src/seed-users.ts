import 'dotenv/config'
import { authClient } from './auth-client'

async function main() {
  const result = await authClient.signUp.email({
    email: "admin@admin.com",
    password: "blablabla",
    name: "Admin"
  })

  console.log(result);
}

main().catch(console.error);

