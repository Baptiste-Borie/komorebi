/**
 * Komorebi review finalizer. Called AUTOMATICALLY after a successful review.
 * Checks build, stages game sources + curated CC0 assets (never reviews),
 * commits and pushes main. Push failures propagate; no fake success log.
 */
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const cwd = resolve('.');
function git(...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
function run(command, args) {
  execFileSync(command, args, { cwd, stdio: 'inherit' });
}
function isSensitive(path) {
  return /(^|\/)(\.env(?:\..+)?|\.npmrc|id_rsa|id_ed25519|credentials(?:\.[^/]*)?|secrets?(?:\.[^/]*)?|[^/]+\.(?:pem|key|p12|pfx))$/i.test(path);
}
/** Build gate & one-pass git commit+push. Caller must run a real review first. */
export async function autoCommitAndPush({ label = 'review' } = {}) {
  if (process.env.KOMOREBI_NO_AUTO_PUSH === '1') {
    console.log('Auto-push désactivé explicitement (KOMOREBI_NO_AUTO_PUSH=1).');
    return;
  }
  const branch = git('branch', '--show-current');
  if (branch !== 'main') throw new Error(`Auto-push bloqué : branche ${branch || '(HEAD détachée)'} au lieu de main.`);
  const remote = git('remote', 'get-url', 'origin');
  if (!/(?:github\.com[:/])Baptiste-Borie\/komorebi(?:\.git)?$/i.test(remote))
    throw new Error(`Auto-push bloqué : origin inattendu (${remote}).`);
  const unfinished = ['MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'REBASE_HEAD'];
  for (const marker of unfinished) {
    if (git('rev-parse', '--git-path', marker)) {
      // rev-parse returns a path even if it does not exist; handled by Git's index lock.
    }
  }
  console.log('Validation avant push : npm run build');
  run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build']);
  // Never accidentally stage generated review imagery. Other ignored caches are
  // excluded by .gitignore. Stage real code/GLBs, including existing tracked files.
  git('add', '-A');
  // Do not publish tracked review artifacts accidentally; working files are left untouched.
  git('reset', '-q', 'HEAD', '--', 'reviews', 'review-staging', 'review-temp');
  const paths = execFileSync('git', ['diff', '--cached', '--name-only', '-z'], {cwd}).toString('utf8').split('\0').filter(Boolean);
  const unsafe = paths.filter(isSensitive);
  if (unsafe.length) {
    throw new Error('Fichiers sensibles détectés dans la sélection Git : '+ unsafe.join(', ') + '. Vérifie ton .gitignore et désindexe-les avant de relancer.');
  }
  if (paths.length) {
    const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const message = `komorebi: ${label} (${stamp} UTC)`;
    run('git', ['commit', '-m', message]);
  } else console.log('Aucun nouveau fichier à committer.');
  console.log('Push automatique : git push origin main');
  run('git', ['push', 'origin', 'main']);
  console.log('✓ Commit et push GitHub terminés.');
}

// CLI for main garden reviews: automatically called by npm scripts.
if (process.argv[1] && import.meta.url === new URL('file://' + resolve(process.argv[1])).href) {
  try { await autoCommitAndPush({ label: process.argv[2] || 'review' }); }
  catch (error) { console.error('Auto-push échoué :', error.message); process.exitCode = 1; }
}
