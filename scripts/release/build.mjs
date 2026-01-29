#!/usr/bin/env node
import path from 'node:path';
import { REPO_ROOT, PACKAGES, run } from './utils.mjs';

export function buildPackages() {
  console.log('Building packages...\n');
  for (const rel of PACKAGES) {
    console.log(`Building ${rel}...`);
    run('npm run build', {
      cwd: path.join(REPO_ROOT, rel),
    });
  }
  console.log('\nAll packages built successfully.');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  buildPackages();
}
