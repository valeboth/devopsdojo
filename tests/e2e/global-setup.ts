import { execFileSync } from 'node:child_process';

// `.wrangler/` is gitignored, so CI and fresh clones start with a D1 that has no
// tables and every auth write 500s. Apply the migrations before the suite runs.
export default function globalSetup() {
  execFileSync('npm', ['run', 'db:migrate:local'], { stdio: 'inherit' });
}
