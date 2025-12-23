import '@agentview/utils/loadEnv'
import { authClient } from './authClient'
import { updateEnv } from '@agentview/utils/updateEnv'

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
  updateEnv("AGENTVIEW_API_KEY", key);

  // Create organization (for now this way)
  const organization = await authClient.organization.create({
    name: "Acme",
    slug: "acme"
  })
  console.log('Organization id: ' + organization.id)
  updateEnv("AGENTVIEW_ORGANIZATION_ID", organization.id);
  

  // Invite Bob and Alice
  const bobInvitation = await authClient.organization.inviteMember({
    email: "bob@acme.com",
    role: "member",
    organizationId: organization.id
  })

  const aliceInvitation = await authClient.organization.inviteMember({
    email: "alice@acme.com",
    role: "member",
    organizationId: organization.id
  })

  await authClient.signOut();

  // Register Bob
  await authClient.signUp.email({
    email: "bob@acme.com",
    password: "blablabla",
    name: "Bob"
  });

  await authClient.organization.acceptInvitation({
    invitationId: bobInvitation.id
  }) // accept invitation

  await authClient.signOut();

  // Register Alice
  await authClient.signUp.email({
    email: "alice@acme.com",
    password: "blablabla",
    name: "Alice"
  });

  await authClient.organization.acceptInvitation({
    invitationId: aliceInvitation.id
  }) // accept invitation

  await authClient.signOut();


  // const bobInvitation = await inviteMember("bob@acme.com", "user");
  // const aliceInvitation = await inviteMember("alice@acme.com", "user");

  // await authClient.signOut();

  // // Register Bob
  // await authClient.signUp.email({
  //   email: "bob@acme.com",
  //   password: "blablabla",
  //   name: "Bob",
  //     // @ts-ignore
  //   invitationId: bobInvitation.id
  // });

  // await authClient.signOut();

  // // Register Alice
  // await authClient.signUp.email({
  //   email: "alice@acme.com",
  //   password: "blablabla",
  //   name: "Alice",
  //     // @ts-ignore
  //   invitationId: aliceInvitation.id
  // });
}

main().catch(console.error);