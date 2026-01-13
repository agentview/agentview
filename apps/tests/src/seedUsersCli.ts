import { updateEnv } from '@agentview/utils/updateEnv'
import { seedUsers } from './seedUsers';

async function main() {
  const { apiKeyDev, organization } = await seedUsers("acme");

  console.log('Organization id: ' + organization.id)
  updateEnv("AGENTVIEW_ORGANIZATION_ID", organization.id, { includeExamples: false });
  updateEnv("VITE_AGENTVIEW_ORGANIZATION_ID", organization.id, { includeRoot: false });

  // Let's write the API key to the .env file
  console.log('API Key: ' + apiKeyDev.key)
  updateEnv("AGENTVIEW_API_KEY", apiKeyDev.key);
}

main().catch(console.error);