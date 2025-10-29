#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import path from 'node:path';

const REPO_ROOT = process.cwd();

// Packages whose versions should be kept in sync with the root version
const ALL_PACKAGES = [
  'apps/studio',
  'apps/api',
  'packages/create-agentview',
];

// Packages to build and publish (npm)
const PACKAGES = [
  'packages/create-agentview',
  'packages/studio',
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

// async function ensureRootPackageJson() {
//   const rootPkgPath = path.join(REPO_ROOT, 'package.json');
//   let rootPkg;
//   try {
//     rootPkg = await readJSON(rootPkgPath);
//   } catch {
//     rootPkg = { name: 'agentview-monorepo', private: true, version: '0.0.0', scripts: { publish: 'node ./publish.mjs' } };
//     await writeJSON(rootPkgPath, rootPkg);
//   }
//   if (!rootPkg.scripts) rootPkg.scripts = {};
//   if (!rootPkg.scripts.publish) rootPkg.scripts.publish = 'node ./publish.mjs';
//   await writeJSON(rootPkgPath, rootPkg);
//   return rootPkgPath;
// }

function bumpRootVersion(bumpType, preid) {
  if (bumpType === 'prerelease' && !preid) {
    throw new Error('Prerelease requires a preid (e.g. beta, rc)');
  }
  run(`npm version ${bumpType} --no-git-tag-version ${bumpType === 'prerelease' ? `--preid=${preid}` : ''}`, { cwd: REPO_ROOT });
}

async function getRootVersion() {
  const pkg = await readJSON(path.join(REPO_ROOT, 'package.json'));
  return pkg.version;
}

async function setPackagesVersion(version) {
  for (const rel of ALL_PACKAGES) {
    const pkgPath = path.join(REPO_ROOT, rel, 'package.json');
    try {
      const pkg = await readJSON(pkgPath);
      pkg.version = version;
      await writeJSON(pkgPath, pkg);
    } catch {}
  }
}

function buildPackages() {
  for (const rel of PACKAGES) {
    run('npm run build', {
      cwd: path.join(REPO_ROOT, rel),
    });
  }
  
  // run('npm run build', {
  //   cwd: path.join(REPO_ROOT, 'packages/create-agentview'),
  //   // env: { ...process.env, AGENTVIEW_API_IMAGE: `${apiImageRepo}:${version}` },
  // });
  
  // // Build packages/studio
  // const studioCwd = path.join(REPO_ROOT, 'packages/studio');
  // run('npm run build', {
  //   cwd: studioCwd,
  // });
}

// function buildApiDockerImage() {
//   // const apiDir = path.join(REPO_ROOT, 'apps/api');
  
//   console.log(`\nBuilding API Docker image with npm run docker:build`);
//   run('npm run docker:build', {
//     cwd: path.join(REPO_ROOT, 'apps/api'),
//     // env: { ...process.env, AGENTVIEW_API_IMAGE: `${apiImageRepo}:${version}` },
//   });

//   run(`docker push ${process.env.AGENTVIEW_API_IMAGE}`);
  
//   // console.log(`\nPublishing API Docker image`);
//   // run('npm run docker:publish', {
//   //   cwd: apiDir,
//   // });
// }

async function gitCommitAndTag(version) {
  const filesToAdd = ['package.json', ...ALL_PACKAGES.map(p => path.join(p, 'package.json'))];
  for (const f of filesToAdd) {
    try { run(`git add ${f}`, { cwd: REPO_ROOT }); } catch {}
  }
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

  // Docker
  process.env.AGENTVIEW_API_IMAGE = `rudzienki/agentview-api:${version}`;
  run('npm run docker:build', {
    cwd: path.join(REPO_ROOT, 'apps/api'),
  });

  // Build packages (should be after AGENTVIEW_API_IMAGE is set)
  buildPackages();

  // Publish docker image
  run(`docker push ${process.env.AGENTVIEW_API_IMAGE}`);

  // Commit and tag
  await gitCommitAndTag(version);

  // Publish npm packages
  await publishPackages(version);

  console.log(`\nPublished v${version}`);

  // // run('npm run docker:build', {
  // //   cwd: path.join(REPO_ROOT, 'apps/api'),
  // //   // env: { ...process.env, AGENTVIEW_API_IMAGE: `${apiImageRepo}:${version}` },
  // // });
  // // // Set AGENTVIEW_API_IMAGE environment variable (used by docker:build, create-agentview template, etc.)
  // // process.env.AGENTVIEW_API_IMAGE = `rudzienki/agentview-api:${version}`;
  // // if (!isPrerelease(version)) {
  // //   process.env.AGENTVIEW_API_IMAGE_LATEST = `rudzienki/agentview-api:latest`;
  // // }

  // // Build and publish API Docker image
  // buildApiDockerImage(apiImageRepo, version);

  // // Commit and tag
  // await gitCommitAndTag(version);

  // // Publish npm packages
  // await publishPackages(version);

  // console.log(`\nPublished v${version}`);
})();
