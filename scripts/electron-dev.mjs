import { spawn, execSync } from 'child_process';
import { createServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

async function main() {
  console.log('[electron-dev] Compiling preload script...');
  execSync('npx tsc -p tsconfig.electron.json', { stdio: 'inherit' });

  console.log('[electron-dev] Starting Vite dev server...');
  const server = await createServer({ configFile: 'vite.config.ts' });
  await server.listen();

  const port = server.httpServer?.address()?.port || 5173;
  const address = `http://localhost:${port}`;
  console.log(`[electron-dev] Vite running at ${address}`);

  const electronBin = path.join(root, 'node_modules', '.bin', 'electron');
  const electron = spawn(`"${electronBin}"`, ['.'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, NODE_ENV: 'development', VITE_DEV_URL: address },
  });

  electron.on('close', () => {
    server.close();
    process.exit();
  });

  process.on('SIGINT', () => {
    electron.kill();
    server.close();
    process.exit();
  });
}

main();
