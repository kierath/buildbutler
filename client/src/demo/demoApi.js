// A stand-in for the Express API, used only by the hosted demo build (npm run build:demo).
// It answers the same requests with the same shapes, but keeps everything in memory,
// so visitors can try every feature and a page reload puts the sample data back.

import { projects, builds, machines, installs } from './demoData.js';

let nextId = 1000;

// Each route mirrors one Express route in server/routes/.
const ROUTES = {
  'GET projects': () => [...projects].sort((a, b) => a.name.localeCompare(b.name)),
  'GET builds': () => builds.map(withProjectName).sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id),
  'GET machines': () => machines.map(statusRow).sort((a, b) => a.name.localeCompare(b.name)),
  'POST builds': addBuild,
  'PUT builds/:id': editBuild,
  'POST machines': addMachine,
  'PUT machines/:id': editMachine,
  'POST deploy': deploy,
};

export function demoRequest(method, path, body) {
  // "/api/builds/3" -> resource "builds", id "3"
  const [, , resource, id] = path.split('/');
  const handler = ROUTES[`${method} ${resource}${id ? '/:id' : ''}`];
  if (!handler) return Promise.reject(new Error(`Not available in the demo: ${method} ${path}`));
  try {
    const result = handler(body, Number(id));
    // A short delay and a copy make it behave like a real network call.
    return new Promise((resolve) => setTimeout(() => resolve(structuredClone(result)), 150));
  } catch (err) {
    return Promise.reject(err);
  }
}

// ---------- Reads ----------

function withProjectName(build) {
  return { ...build, project_name: projects.find((p) => p.id === build.project_id).name };
}

// Same idea as the LATERAL query in server/routes/machines.js:
// "latest" install drives the badge, latest "success" is what's installed.
function statusRow(machine) {
  const mine = installs.filter((i) => i.machine_id === machine.id).sort((a, b) => b.id - a.id);
  const latest = mine[0];
  const installed = mine.filter((i) => i.status === 'success')
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
  const buildOf = (install) => install && withProjectName(builds.find((b) => b.id === install.build_id));
  const latestBuild = buildOf(latest);
  const installedBuild = buildOf(installed);

  return {
    ...machine,
    latest_install_id: latest?.id ?? null,
    latest_status: latest?.status ?? null,
    latest_log: latest?.log ?? null,
    latest_updated_at: latest?.updated_at ?? null,
    latest_project: latestBuild?.project_name ?? null,
    latest_version: latestBuild?.version ?? null,
    current_project: installedBuild?.project_name ?? null,
    current_version: installedBuild?.version ?? null,
  };
}

// ---------- Writes ----------

function rejectDuplicate(isDuplicate) {
  if (isDuplicate) throw new Error('That already exists');
}

function addBuild({ project_id, version, file_url, notes = '' }) {
  rejectDuplicate(builds.some((b) => b.project_id === project_id && b.version === version.trim()));
  const build = { id: nextId++, project_id, version: version.trim(), file_url: file_url.trim(), notes, created_at: new Date().toISOString() };
  builds.push(build);
  return build;
}

function editBuild({ version, file_url, notes = '' }, id) {
  const build = builds.find((b) => b.id === id);
  rejectDuplicate(builds.some((b) => b.id !== id && b.project_id === build.project_id && b.version === version.trim()));
  Object.assign(build, { version: version.trim(), file_url: file_url.trim(), notes });
  return build;
}

function addMachine({ name, gpu, ram_gb, network_tag }) {
  rejectDuplicate(machines.some((m) => m.name === name.trim()));
  const machine = { id: nextId++, name: name.trim(), gpu: gpu.trim(), ram_gb, network_tag: network_tag.trim(), last_seen: null };
  machines.push(machine);
  // Token is only returned here, exactly like the real API.
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const agent_token = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return { ...machine, agent_token };
}

function editMachine({ name, gpu, ram_gb, network_tag }, id) {
  rejectDuplicate(machines.some((m) => m.id !== id && m.name === name.trim()));
  const machine = machines.find((m) => m.id === id);
  Object.assign(machine, { name: name.trim(), gpu: gpu.trim(), ram_gb, network_tag: network_tag.trim() });
  return machine;
}

function deploy({ build_id, machine_ids }) {
  const ids = [...new Set(machine_ids)];
  // Skip machines already waiting on this build, like the NOT EXISTS check on the server.
  const waiting = (id) => installs.some((i) => i.machine_id === id && i.build_id === build_id
    && ['pending', 'installing'].includes(i.status));
  const created = ids.filter((id) => !waiting(id)).map((machine_id) => {
    const install = { id: nextId++, machine_id, build_id, status: 'pending', log: '', updated_at: new Date().toISOString() };
    installs.push(install);
    return install;
  });
  return { created, skipped: ids.length - created.length };
}
