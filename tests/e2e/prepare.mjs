import { existsSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

// `platform.env` in preview comes from getPlatformProxy, which reads `.dev.vars`
// and ignores process.env — so Playwright's `env` block never reaches Better Auth.
// `.dev.vars` and `.wrangler/` are both gitignored, so CI starts without either:
// no OAuth clientId (500 on POST /login) and no tables. A real `.dev.vars` is
// left alone.
if (!existsSync('.dev.vars')) {
  writeFileSync(
    '.dev.vars',
    [
      'BETTER_AUTH_SECRET=e2e-only-not-a-real-secret-0123456789abcdef',
      'BETTER_AUTH_URL=http://localhost:4173',
      'GITHUB_CLIENT_ID=e2e',
      'GITHUB_CLIENT_SECRET=e2e',
      'GOOGLE_CLIENT_ID=e2e',
      'GOOGLE_CLIENT_SECRET=e2e',
      '',
    ].join('\n'),
  );
}

execFileSync('npm', ['run', 'db:migrate:local'], { stdio: 'inherit' });
