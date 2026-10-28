import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '..');
const frontendRoot = path.resolve(backendRoot, '../frontend');
const distTarget = path.resolve(backendRoot, 'dist');

console.log('[build] Building frontend...');
execSync('npm run build', { cwd: frontendRoot, stdio: 'inherit' });

const frontendDist = path.resolve(frontendRoot, 'dist');
if (!fs.existsSync(frontendDist)) {
  throw new Error('Frontend dist/ not found after build');
}

fs.rmSync(distTarget, { recursive: true, force: true });
fs.cpSync(frontendDist, distTarget, { recursive: true });
console.log(`[build] Copied frontend/dist → backend/dist`);
