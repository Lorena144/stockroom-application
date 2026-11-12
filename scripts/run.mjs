import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { spawn } from 'node:child_process';
if (existsSync('.env.local')) loadEnvFile('.env.local');
if (!existsSync('.local/demo-accounts.txt'))
  throw new Error('Run npm run setup before starting Stockroom.');
const origin = new URL(process.env.APP_ORIGIN ?? 'http://127.0.0.1:3000');
if (origin.hostname !== '127.0.0.1' || origin.protocol !== 'http:')
  throw new Error(
    'This local launcher supports http://127.0.0.1 only. Hosting needs a separate HTTPS deployment configuration.',
  );
if (!['dev', 'start'].includes(process.argv[2])) throw new Error('Choose dev or start.');
const child = spawn(
  process.execPath,
  [
    'node_modules/next/dist/bin/next',
    process.argv[2],
    '--hostname',
    '127.0.0.1',
    '--port',
    origin.port || '3000',
  ],
  {
    stdio: 'inherit',
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
    windowsHide: true,
  },
);
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', (code) => process.exit(code ?? 1));
