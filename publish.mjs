#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import path from 'node:path';

const REPO_ROOT = process.cwd();

// Packages whose versions should be kept in sync with the root version
const ALL_PACKAGES = [
  'apps/api',
  'apps/docs',
  'apps/tests',
  'packages/create-agentview',
  'packages/agentview',
];

// Packages to build and publish (npm)
const PACKAGES = [
  'packages/create-agentview',
  'packages/agentview',
];

function run(cmd, opts = {}) {
  return execSync(cmd, { stdio: 'inherit', ...opts });
}

function isRepoClean() {
  try {
    const out = execSync('git status --porcelain', { cwd: REPO_ROOT, stdio: ['ignore', 'pipe', 'pipe'] })
      .toString()
      .trim();
    return out.length === 0;
  } catch {
    return false;
  }
}

async function readJSON(filePath) {
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function writeJSON(filePath, data) {
  await writeFile(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function getDistTagFromVersion(version) {
  if (!version.includes('-')) return 'latest';
  const m = version.match(/^[0-9]+\.[0-9]+\.[0-9]+-([A-Za-z0-9]+)/);
  return m ? m[1] : 'latest';
}

function isPrerelease(version) {
  return version.includes('-');
}

function bumpRootVersion(bumpType, preid) {
  if (bumpType === 'prerelease' && !preid) {
    console.error('Prerelease requires a preid (e.g. beta, rc)');
    process.exit(1);
  }
  run(`npm version ${bumpType} --no-git-tag-version ${bumpType === 'prerelease' ? `--preid=${preid}` : ''}`, { cwd: REPO_ROOT });
}

async function getRootVersion() {
  const pkg = await readJSON(path.join(REPO_ROOT, 'package.json'));
  return pkg.version;
}

async function setPackagesVersion(version) {
  run(`pnpm -r exec -- npm version ${version} --no-git-tag-version`);
}

function buildPackages() {
  for (const rel of PACKAGES) {
    run('npm run build', {
      cwd: path.join(REPO_ROOT, rel),
    });
  }
}

async function gitCommitAndTag(version) {
  run(`git add -A`, { cwd: REPO_ROOT })
  run(`git commit -m "chore(release): v${version}"`, { cwd: REPO_ROOT });
  run(`git tag v${version}`, { cwd: REPO_ROOT });
}

async function publishPackages(version) {
  const tag = getDistTagFromVersion(version);
  for (const rel of PACKAGES) {
    run(`npm publish --tag ${tag}`, { cwd: path.join(REPO_ROOT, rel) });
  }
}

(async () => {
  if (!isRepoClean()) {
    console.error('Refusing to publish: repository has uncommitted changes. Commit or stash first.');
    process.exit(1);
  }

  // Parse arguments
  const bumpType = process.argv[2] || 'patch';
  const preid = process.argv[3];
  const valid = new Set(['patch', 'minor', 'major', 'prerelease']);
  if (!valid.has(bumpType)) {
    console.error('Usage: node publish.mjs [patch|minor|major|prerelease] [preid]');
    process.exit(1);
  }

  // Bump versions
  bumpRootVersion(bumpType, preid);
  const version = await getRootVersion();
  await setPackagesVersion(version);

  // Build API docker image
  process.env.AGENTVIEW_API_IMAGE = `rudzienki/agentview-api:${version}`;
  run(`docker build -t ${process.env.AGENTVIEW_API_IMAGE} -f apps/api/Dockerfile .`);


  // const command = `docker build -t ${process.env.AGENTVIEW_API_IMAGE} -f apps/api/Dockerfile .`;
  // run('npm run docker:build', {
  //   cwd: path.join(REPO_ROOT, 'apps/api'),
  // });



  // // Build packages (should be after AGENTVIEW_API_IMAGE is set, it's used in create-agentview)
  // buildPackages();

  // // Commit and tag
  // await gitCommitAndTag(version);

  // // Publish npm packages
  // await publishPackages(version);

  // // Publish docker image (longest so goes last)
  // run(`docker push ${process.env.AGENTVIEW_API_IMAGE}`);

  // console.log(`\nPublished v${version}`);
})();
