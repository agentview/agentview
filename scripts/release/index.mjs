#!/usr/bin/env node
import { isRepoClean, parseArgs } from './utils.mjs';
import { buildPackages } from './build.mjs';
import { bumpVersion } from './version.mjs';
import { publishPackages } from './publish.mjs';

const VALID_BUMP_TYPES = new Set(['patch', 'minor', 'major', 'prerelease']);

function printUsage() {
  console.log('Usage: node index.mjs [patch|minor|major|prerelease] [preid] [options]');
  console.log('\nOptions:');
  console.log('  --skip-build     Skip the build step');
  console.log('  --skip-publish   Stop after version bump (no publish)');
  console.log('\nExamples:');
  console.log('  node index.mjs patch');
  console.log('  node index.mjs minor');
  console.log('  node index.mjs prerelease beta');
  console.log('  node index.mjs patch --skip-publish');
  console.log('  node index.mjs patch --skip-build');
}

async function release() {
  const args = parseArgs(process.argv.slice(2));
  const bumpType = args.bumpType || 'patch';

  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  if (!VALID_BUMP_TYPES.has(bumpType)) {
    console.error(`Error: Invalid bump type "${bumpType}". Must be one of: patch, minor, major, prerelease`);
    printUsage();
    process.exit(1);
  }

  // Check for clean repo early (before any work)
  if (!isRepoClean()) {
    console.error('Error: Repository has uncommitted changes. Commit or stash first.');
    process.exit(1);
  }

  console.log('=== Release Flow ===\n');

  // Step 1: Build
  if (!args.skipBuild) {
    console.log('Step 1: Build\n');
    buildPackages();
    console.log('');
  } else {
    console.log('Step 1: Build (skipped)\n');
  }

  // Step 2: Version
  console.log('Step 2: Version\n');
  const version = await bumpVersion(bumpType, args.preid);
  console.log('');

  // Step 3: Publish
  if (!args.skipPublish) {
    console.log('Step 3: Publish\n');
    await publishPackages();
    console.log('');
  } else {
    console.log('Step 3: Publish (skipped)\n');
    console.log(`To publish later, run: pnpm release:publish`);
  }

  console.log(`=== Release v${version} complete ===`);
}

release();
