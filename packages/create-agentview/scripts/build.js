import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// import { execSync } from 'node:child_process';

function isExcluded(relativePath) {
  if (!relativePath || relativePath === '.') return false;

  const segs = relativePath.split(path.sep);
  if (segs.includes('node_modules')) return true;
  if (segs.includes('.react-router')) return true;
  if (segs[0] === 'build' || segs.includes('build')) return true;
  if (segs.includes('dist') || segs.includes('coverage')) return true;
  if (segs[segs.length - 1] === '.DS_Store') return true;
  if (segs[segs.length - 1] === 'package-lock.json') return true;
  return false;
}

function updateWorkspaceDependencies(packageJson, repoVersion) {
  const updatedPkg = { ...packageJson };
  const patchFields = ['dependencies', 'devDependencies'];
  const isWorkspaceDep = v => v === 'workspace:*' || v === 'workspace:^' || v === 'workspace:~';
  for (const field of patchFields) {
    if (updatedPkg[field]) {
      updatedPkg[field] = { ...updatedPkg[field] };
      for (const [depName, depVersion] of Object.entries(updatedPkg[field])) {
        if (isWorkspaceDep(depVersion)) {
          updatedPkg[field][depName] = `^${repoVersion}`;
        }
      }
    }
  }
  return updatedPkg;
}

async function getCurrentVersion() {
    // Read repo version for workspace dependency updates
    const repoPkgJsonPath = path.join(repoRoot, 'package.json');
    const repoPkgRaw = await readFile(repoPkgJsonPath, 'utf8');
    const repoPkg = JSON.parse(repoPkgRaw);
    const repoVersion = repoPkg.version;
    return repoVersion;
}

async function buildTemplate() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const packageDir = path.resolve(__dirname, '..');
  const repoRoot = path.resolve(packageDir, '..', '..');

  const exampleSrc = path.join(repoRoot, 'apps', 'examples', 'typescript-basic');
  const dockerComposeYmlSrc = path.join(repoRoot, 'docker-compose.dist.yml');
  const distDir = path.join(packageDir, 'dist/');
  const templateDir = path.join(packageDir, 'dist/template');

  // clean
  await rm(distDir, { recursive: true, force: true });
  await mkdir(templateDir, { recursive: true });

  // copy files
  await cp(exampleSrc, templateDir, {
    recursive: true,
    filter: (src) => {
      const rel = path.relative(exampleSrc, src);
      return !isExcluded(rel);
    },
  });

  // copy docker-compose.dist.yml
  await cp(dockerComposeYmlSrc, path.join(templateDir, 'docker-compose.yml'));

  // get current version
  const repoPkgJsonPath = path.join(repoRoot, 'package.json');
  const repoPkgRaw = await readFile(repoPkgJsonPath, 'utf8');
  const repoPkg = JSON.parse(repoPkgRaw);
  const version = repoPkg.version;

  // create a proper package.json
  const pkgJsonPath = path.join(templateDir, 'package.json');
  const pkgRaw = await readFile(pkgJsonPath, 'utf8');
  const pkg = JSON.parse(pkgRaw);
  
  const updatedPkg = updateWorkspaceDependencies(pkg, version);
  updatedPkg.name = 'my-agentview-app';
  updatedPkg.version = '0.0.1';
  if (updatedPkg.private) delete updatedPkg.private;
  await writeFile(pkgJsonPath, JSON.stringify(updatedPkg, null, 2) + '\n', 'utf8');

  // build .env
  if (!process.env.AGENTVIEW_API_IMAGE) {
    throw new Error('AGENTVIEW_API_IMAGE is not set');
  }

  const envContent = `AGENTVIEW_API_IMAGE=${process.env.AGENTVIEW_API_IMAGE}
AGENTVIEW_STUDIO_URL=http://localhost:1989
AGENTVIEW_API_PORT=1990
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=postgres
POSTGRES_HOST=postgres-db
POSTGRES_PORT=5432
`;

  await writeFile(path.join(templateDir, '.env'), envContent, 'utf8');
}

(async () => {
  await buildTemplate();
})();
