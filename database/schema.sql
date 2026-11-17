-- Build Butler schema.
-- Safe to re-run: drops everything first so a fresh setup is one command.

-- Hide the harmless "table does not exist, skipping" notices on the very first run
SET client_min_messages = warning;

DROP TABLE IF EXISTS installs, builds, machines, projects;

CREATE TABLE projects (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,  -- also used as the folder name under C:\Builds
  client      TEXT NOT NULL,
  engine      TEXT NOT NULL,
  setup_notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE builds (
  id         SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version    TEXT NOT NULL,
  file_url   TEXT NOT NULL,          -- relative URLs are resolved against the server URL by the agent
  notes      TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Registering the same version twice is almost always a mistake
  UNIQUE (project_id, version)
);

CREATE TABLE machines (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  gpu         TEXT NOT NULL,
  ram_gb      INTEGER NOT NULL CHECK (ram_gb > 0),
  network_tag TEXT NOT NULL,
  -- UNIQUE so a token always identifies exactly one machine
  agent_token TEXT NOT NULL UNIQUE,
  last_seen   TIMESTAMPTZ             -- NULL until the agent first checks in
);

CREATE TABLE installs (
  id         SERIAL PRIMARY KEY,     -- ids increase over time, so lowest pending id = oldest job
  machine_id INTEGER NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  build_id   INTEGER NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
  -- CHECK lets the database reject typos like 'sucess' instead of trusting the API
  status     TEXT NOT NULL DEFAULT 'pending'
             CHECK (status IN ('pending', 'installing', 'success', 'failed')),
  log        TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The status board and the agent both look up installs per machine
CREATE INDEX installs_machine_id_idx ON installs (machine_id);
