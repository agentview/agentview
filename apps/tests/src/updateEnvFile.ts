import { writeFileSync, existsSync, readFileSync } from 'fs';

export function updateEnvFile(key: string, value: string) {
  const envFilePath = '.env';
  let envContents = '';
  if (existsSync(envFilePath)) {
    envContents = readFileSync(envFilePath, 'utf8');
    // Remove existing key line if present
    // Escape special regex characters in the key
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const keyPattern = new RegExp(`^${escapedKey}\\s*=`);
    envContents = envContents
      .split('\n')
      .filter(line => !keyPattern.test(line))
      .join('\n');
    if (envContents.length > 0 && !envContents.endsWith('\n')) {
      envContents += '\n';
    }
  }

  envContents += `${key}=${value}\n`;
  writeFileSync(envFilePath, envContents, 'utf8');
}
