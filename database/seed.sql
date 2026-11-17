-- Build Butler demo data. All names are made up.
-- RESTART IDENTITY resets ids to 1, so the ids used below are predictable on every re-run.

TRUNCATE installs, builds, machines, projects RESTART IDENTITY CASCADE;

-- Projects: ids 1-3
INSERT INTO projects (name, client, engine, setup_notes) VALUES
  ('Driftwood', 'Moonmoth Studios', 'Unreal Engine 5',
   'Needs the latest NVIDIA Studio driver. Run once with -dx12 to build the shader cache (about 4 minutes). Saves live in %LOCALAPPDATA%\Driftwood.'),
  ('Kestrel', 'Copperkite Games', 'Unity 2022 LTS',
   'Controller required for the menu flow. Delete %USERPROFILE%\AppData\LocalLow\Copperkite before each new build to clear old saves.'),
  ('Bramble', 'Moonmoth Studios', 'Unreal Engine 5',
   'Pre-production. No builds yet; first playable expected next sprint.');

-- Builds: ids 1-3. Times are relative to now() so the demo always looks recent.
INSERT INTO builds (project_id, version, file_url, notes, created_at) VALUES
  (1, '0.4.2', '/builds/driftwood-0.4.2.zip', 'Weekly build. Fixes the harbour level crash.', now() - interval '8 days'),
  (2, '1.2.0', '/builds/kestrel-1.2.0.zip',  'Release candidate for the publisher demo.',   now() - interval '2 days'),
  (1, '0.4.3', '/builds/driftwood-0.4.3.zip', 'Weekly build. New fishing minigame.',          now() - interval '1 day');

-- Machines: ids 1-4. Tokens are fixed demo values so you can test the agent API with curl.
-- Real machines get a random token from POST /api/machines instead.
INSERT INTO machines (name, gpu, ram_gb, network_tag, agent_token, last_seen) VALUES
  ('QA-PC-01',  'RTX 2070', 16, 'QA Lab',    'demo-token-qa-pc-01',  now() - interval '3 minutes'),
  ('QA-PC-02',  'RTX 3070', 32, 'QA Lab',    'demo-token-qa-pc-02',  now() - interval '1 hour'),
  ('ART-PC-01', 'RTX 3080', 32, 'Art Floor', 'demo-token-art-pc-01', now() - interval '2 days'),
  ('DEV-PC-01', 'RTX 4080', 64, 'Dev Desk',  'demo-token-dev-pc-01', now() - interval '40 seconds');

-- Installs: a mix of every status so each badge colour shows on the board.
INSERT INTO installs (machine_id, build_id, status, log, updated_at) VALUES
  -- QA-PC-01: has 0.4.2, and 0.4.3 is waiting for Thursday
  (1, 1, 'success',
'[1/4] Downloading driftwood-0.4.2.zip... OK
[2/4] Removing C:\Builds\Driftwood... OK
[3/4] Extracting to C:\Builds\Driftwood... OK
[4/4] Done. Driftwood 0.4.2 installed.', now() - interval '7 days'),
  (1, 3, 'pending', '', now() - interval '20 minutes'),

  -- QA-PC-02: already on the newest Driftwood
  (2, 3, 'success',
'[1/4] Downloading driftwood-0.4.3.zip... OK
[2/4] Removing C:\Builds\Driftwood... OK
[3/4] Extracting to C:\Builds\Driftwood... OK
[4/4] Done. Driftwood 0.4.3 installed.', now() - interval '1 hour'),

  -- ART-PC-01: failed. Same format the real agent writes: the failing step, then Windows' error.
  -- (Here: the game was still running, so Windows wouldn't let the old folder be deleted.)
  (3, 2, 'failed',
'[1/4] Downloading kestrel-1.2.0.zip... OK
[2/4] Removing C:\Builds\Kestrel... FAILED
ERROR: The process cannot access the file because it is being used by another process.', now() - interval '2 days'),

  -- DEV-PC-01: has Driftwood, Kestrel install currently running
  (4, 1, 'success',
'[1/4] Downloading driftwood-0.4.2.zip... OK
[2/4] Removing C:\Builds\Driftwood... OK
[3/4] Extracting to C:\Builds\Driftwood... OK
[4/4] Done. Driftwood 0.4.2 installed.', now() - interval '7 days'),
  (4, 2, 'installing',
'[1/4] Downloading kestrel-1.2.0.zip... OK
[2/4] Removing C:\Builds\Kestrel... OK
[3/4] Extracting to C:\Builds\Kestrel...', now() - interval '1 minute');
