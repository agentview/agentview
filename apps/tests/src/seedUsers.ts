import 'dotenv/config'
import { authClient, inviteMember } from './authClient'
import { updateEnvFile } from './updateEnvFile'

async function main() {
  // First sign up - admin user
  await authClient.signUp.email({
    email: "admin@acme.com",
    password: "blablabla",
    name: "Admin"
  });

  // Create API key for admin user
  const { key } = await authClient.apiKey.create({
    name: "main"
  })

  // Let's write the API key to the .env file
  console.log('API Key: ' + key)
  updateEnvFile("AGENTVIEW_API_KEY", key);

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