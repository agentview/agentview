import '@agentview/utils/loadEnv'
// import { authClient } from './authClient'
import { updateEnv } from '@agentview/utils/updateEnv'
import { seedUsers } from './seedUsers';

async function main() {
  const { apiKey, organization } = await seedUsers("acme");

  console.log('Organization id: ' + organization.id)
  updateEnv("AGENTVIEW_ORGANIZATION_ID", organization.id);
  updateEnv("VITE_AGENTVIEW_ORGANIZATION_ID", organization.id);

  // Let's write the API key to the .env file
  console.log('API Key: ' + apiKey.key)
  updateEnv("AGENTVIEW_API_KEY", apiKey.key);
}

main().catch(console.error);