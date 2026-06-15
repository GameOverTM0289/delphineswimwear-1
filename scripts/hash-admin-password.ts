// Generate a bcrypt hash for ADMIN_PASSWORD_HASH.
//
// Usage:
//   npm run admin:hash -- "your-strong-password"
// or interactively:
//   npm run admin:hash
//   (enter password when prompted; not echoed)
//
// Paste the output into Vercel:
//   Settings → Environment Variables → ADMIN_PASSWORD_HASH

import bcrypt from 'bcryptjs';
import readline from 'readline';

async function readSecret(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    // Disable echo so the typed password isn't visible.
    const stdin = process.stdin as NodeJS.ReadStream & { setRawMode?: (m: boolean) => void };
    stdin.setRawMode?.(true);
    process.stdout.write(prompt);
    let buf = '';
    stdin.on('data', (b) => {
      const ch = b.toString('utf8');
      if (ch === '\r' || ch === '\n' || ch === '\u0004') {
        process.stdout.write('\n');
        stdin.setRawMode?.(false);
        rl.close();
        resolve(buf);
      } else if (ch === '\u0003') {
        process.exit(1);
      } else if (ch === '\u007f') {
        buf = buf.slice(0, -1);
      } else {
        buf += ch;
      }
    });
  });
}

async function main() {
  const arg = process.argv[2];
  const password = arg ?? (await readSecret('Password: '));
  if (!password || password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, 12);
  console.log('\nADMIN_PASSWORD_HASH=' + hash + '\n');
  console.log('Paste this into your Vercel project env (Production scope).');
  console.log('Then redeploy. You can remove ADMIN_PASSWORD if it was set.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
