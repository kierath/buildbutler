// Runs every API check in one go and prints a tick or cross for each.
// Expects fresh seed data and the server running: `npm run check` resets the data first.

const API = 'http://localhost:3001/api';
let failures = 0;

function check(label, passed) {
  console.log(`${passed ? '✅' : '❌'} ${label}`);
  if (!passed) failures++;
}

async function call(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['X-Agent-Token'] = token;
  const res = await fetch(API + path, { method, headers, body: body && JSON.stringify(body) });
  const data = res.status === 204 ? null : await res.json();
  return { status: res.status, data };
}

async function main() {
  const machines = await call('/machines');
  // Stop early with a clear message rather than a confusing pile of failures.
  if (machines.status !== 200) throw new Error(`GET /machines returned ${machines.status}: ${JSON.stringify(machines.data)}`);
  check('Status board lists the 4 machines', machines.data.length === 4);
  check('Status board never shows agent tokens', machines.data.every((m) => !('agent_token' in m)));

  const builds = await call('/builds');
  check('Builds are newest first (Driftwood 0.4.3 on top)', builds.data[0].version === '0.4.3');

  const added = await call('/machines', {
    method: 'POST',
    body: { name: 'QA-PC-03', gpu: 'RTX 4070', ram_gb: 32, network_tag: 'QA Lab' },
  });
  check('Adding a machine gives it a random token', added.status === 201 && added.data.agent_token.length === 48);

  const deploy = await call('/deploy', { method: 'POST', body: { build_id: 3, machine_ids: [1, 3] } });
  check('Deploy queues new installs and skips duplicates', deploy.data.created.length === 1 && deploy.data.skipped === 1);

  const qa1 = 'demo-token-qa-pc-01';
  const job = await call('/agent/next', { token: qa1 });
  check('Agent gets its oldest pending job', job.status === 200 && job.data.version === '0.4.3');

  const report = await call('/agent/report', {
    method: 'POST', token: qa1, body: { install_id: job.data.install_id, status: 'success', log: 'Done.' },
  });
  check('Agent can report success', report.status === 200);

  const empty = await call('/agent/next', { token: qa1 });
  check('Agent gets 204 when there is nothing left', empty.status === 204);

  const sneaky = await call('/agent/report', {
    method: 'POST', token: 'demo-token-qa-pc-02', body: { install_id: job.data.install_id, status: 'failed' },
  });
  check("One machine can't report on another machine's install", sneaky.status === 404);

  const noToken = await call('/agent/next');
  check('Agent requests without a token are rejected', noToken.status === 401);

  const editedMachine = await call('/machines/1', {
    method: 'PUT', body: { name: 'QA-PC-01', gpu: 'RTX 2080', ram_gb: 32, network_tag: 'QA Lab' },
  });
  check('Editing a machine saves it and never returns its token',
    editedMachine.status === 200 && editedMachine.data.gpu === 'RTX 2080' && !('agent_token' in editedMachine.data));

  const editedBuild = await call('/builds/1', {
    method: 'PUT', body: { version: '0.4.2', file_url: '/builds/driftwood-0.4.2.zip', notes: 'Edited.' },
  });
  check('Editing a build saves it', editedBuild.status === 200 && editedBuild.data.notes === 'Edited.');

  const missing = await call('/builds/9999', { method: 'PUT', body: { version: '1', file_url: '/x.zip' } });
  check('Editing a build that does not exist gives 404', missing.status === 404);

  console.log(failures === 0 ? '\nAll checks passed 🎉' : `\n${failures} check(s) failed`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error('❌ The API is not working. Is `npm run dev` running in another window, with no errors?\n', err.message);
  process.exitCode = 1;
});
