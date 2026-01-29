#!/usr/bin/env node
import { REPO_ROOT, run, isRepoClean, getRootVersion } from './utils.mjs';

const VALID_BUMP_TYPES = new Set(['patch', 'minor', 'major', 'prerelease']);

function bumpRootVersion(bumpType, preid) {
  if (bumpType === 'prerelease' && !preid) {
    console.error('Error: Prerelease requires a preid (e.g. beta, rc)');
    process.exit(1);
  }
  const preidFlag = bumpType === 'prerelease' ? `--preid=${preid}` : '';
  run(`npm version ${bumpType} --no-git-tag-version ${preidFlag}`, { cwd: REPO_ROOT });
}

function setPackagesVersion(version) {
  run(`pnpm -r exec -- npm version ${version} --no-git-tag-version`);
}

async function gitCommitAndTag(version) {
  run(`git add -A`, { cwd: REPO_ROOT });
  run(`git commit -m "chore(release): v${version}"`, { cwd: REPO_ROOT });
  run(`git tag v${version}`, { cwd: REPO_ROOT });
}

export async function bumpVersion(bumpType, preid) {
  if (!VALID_BUMP_TYPES.has(bumpType)) {
    console.error(`Error: Invalid bump type "${bumpType}". Must be one of: patch, minor, major, prerelease`);
    process.exit(1);
  }

  if (!isRepoClean()) {
    console.error('Error: Repository has uncommitted changes. Commit or stash first.');
    process.exit(1);
  }

  console.log(`Bumping version (${bumpType})...`);

  // Bump root version
  bumpRootVersion(bumpType, preid);
  const version = await getRootVersion();
  console.log(`New version: ${version}`);

  // Sync version to all packages
  console.log('Syncing version to packages...');
  setPackagesVersion(version);

  // Commit and tag
  console.log('Committing and tagging...');
  await gitCommitAndTag(version);

  console.log(`\nVersion bumped to v${version} and tagged.`);
  return version;
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const bumpType = process.argv[2] || 'patch';
  const preid = process.argv[3];

  if (process.argv[2] === '--help' || process.argv[2] === '-h') {
    console.log('Usage: node version.mjs [patch|minor|major|prerelease] [preid]');
    console.log('\nExamples:');
    console.log('  node version.mjs patch');
    console.log('  node version.mjs minor');
    console.log('  node version.mjs prerelease beta');
    process.exit(0);
  }

  bumpVersion(bumpType, preid);
}
