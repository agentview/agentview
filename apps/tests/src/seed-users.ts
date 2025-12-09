import 'dotenv/config'
import { authClient, authHeaders, inviteMember } from './auth-client'

async function main() {
  // First sign up - admin user
  await authClient.signUp.email({
    email: "admin@acme.com",
    password: "blablabla",
    name: "Admin"
  });

  // Invite Bob and Alice
  const bobInvitation = await inviteMember("bob@acme.com", "user");
  const aliceInvitation = await inviteMember("alice@acme.com", "user");

  await authClient.signOut();

  // Register Bob
  await authClient.signUp.email({
    email: "bob@acme.com",
    password: "blablabla",
    name: "Bob",
      // @ts-ignore
    invitationId: bobInvitation.id
  });

  await authClient.signOut();

  // Register Alice
  await authClient.signUp.email({
    email: "alice@acme.com",
    password: "blablabla",
    name: "Alice",
      // @ts-ignore
    invitationId: aliceInvitation.id
  });
}

main().catch(console.error);