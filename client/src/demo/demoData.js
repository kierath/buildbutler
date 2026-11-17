// Sample data for the hosted demo. It mirrors database/seed.sql so the demo
// looks the same as a local install. Times are relative to "now" so it always looks recent.

const MINUTE = 60_000;
const ago = (minutes) => new Date(Date.now() - minutes * MINUTE).toISOString();

export const projects = [
  { id: 1, name: 'Driftwood', client: 'Moonmoth Studios', engine: 'Unreal Engine 5',
    setup_notes: 'Needs the latest NVIDIA Studio driver. Run once with -dx12 to build the shader cache (about 4 minutes). Saves live in %LOCALAPPDATA%\\Driftwood.' },
  { id: 2, name: 'Kestrel', client: 'Copperkite Games', engine: 'Unity 2022 LTS',
    setup_notes: 'Controller required for the menu flow. Delete %USERPROFILE%\\AppData\\LocalLow\\Copperkite before each new build to clear old saves.' },
  { id: 3, name: 'Bramble', client: 'Moonmoth Studios', engine: 'Unreal Engine 5',
    setup_notes: 'Pre-production. No builds yet; first playable expected next sprint.' },
];

export const builds = [
  { id: 1, project_id: 1, version: '0.4.2', file_url: '/builds/driftwood-0.4.2.zip', notes: 'Weekly build. Fixes the harbour level crash.', created_at: ago(8 * 24 * 60) },
  { id: 2, project_id: 2, version: '1.2.0', file_url: '/builds/kestrel-1.2.0.zip', notes: 'Release candidate for the publisher demo.', created_at: ago(2 * 24 * 60) },
  { id: 3, project_id: 1, version: '0.4.3', file_url: '/builds/driftwood-0.4.3.zip', notes: 'Weekly build. New fishing minigame.', created_at: ago(24 * 60) },
];

export const machines = [
  { id: 1, name: 'QA-PC-01', gpu: 'RTX 2070', ram_gb: 16, network_tag: 'QA Lab', last_seen: ago(3) },
  { id: 2, name: 'QA-PC-02', gpu: 'RTX 3070', ram_gb: 32, network_tag: 'QA Lab', last_seen: ago(60) },
  { id: 3, name: 'ART-PC-01', gpu: 'RTX 3080', ram_gb: 32, network_tag: 'Art Floor', last_seen: ago(2 * 24 * 60) },
  { id: 4, name: 'DEV-PC-01', gpu: 'RTX 4080', ram_gb: 64, network_tag: 'Dev Desk', last_seen: ago(1) },
];

const successLog = (file, project, version) =>
  `[1/4] Downloading ${file}... OK\n[2/4] Removing C:\\Builds\\${project}... OK\n` +
  `[3/4] Extracting to C:\\Builds\\${project}... OK\n[4/4] Done. ${project} ${version} installed.`;

export const installs = [
  { id: 1, machine_id: 1, build_id: 1, status: 'success', log: successLog('driftwood-0.4.2.zip', 'Driftwood', '0.4.2'), updated_at: ago(7 * 24 * 60) },
  { id: 2, machine_id: 1, build_id: 3, status: 'pending', log: '', updated_at: ago(20) },
  { id: 3, machine_id: 2, build_id: 3, status: 'success', log: successLog('driftwood-0.4.3.zip', 'Driftwood', '0.4.3'), updated_at: ago(60) },
  { id: 4, machine_id: 3, build_id: 2, status: 'failed',
    log: '[1/4] Downloading kestrel-1.2.0.zip... OK\n[2/4] Removing C:\\Builds\\Kestrel... FAILED\nERROR: The process cannot access the file because it is being used by another process.',
    updated_at: ago(2 * 24 * 60) },
  { id: 5, machine_id: 4, build_id: 1, status: 'success', log: successLog('driftwood-0.4.2.zip', 'Driftwood', '0.4.2'), updated_at: ago(7 * 24 * 60) },
  { id: 6, machine_id: 4, build_id: 2, status: 'installing',
    log: '[1/4] Downloading kestrel-1.2.0.zip... OK\n[2/4] Removing C:\\Builds\\Kestrel... OK\n[3/4] Extracting to C:\\Builds\\Kestrel...',
    updated_at: ago(1) },
];
