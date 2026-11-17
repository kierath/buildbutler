# Build Butler

A small internal tool that tracks game builds, deploys them to test PCs automatically, and shows which machine has which build.

> **Demo project.** All studios, games and machines in the sample data are made up.

**Live demo:** _link coming soon_. The live demo is the same React front end built with sample data inside it, so it runs as plain files with no server. You can register builds, deploy and edit machines; changes stay in your browser and reset when you reload. The full app runs on Node.js and PostgreSQL: see [Run it locally](#run-it-locally).

## The problem

At my last studio, the client sent a new game build every week. During the Thursday stand-up I installed each one by hand on colleagues' PCs with a `.bat` script, typing the admin password again and again. Nobody could see which machine had which build, so "is your PC on the new one?" was a regular question.

Build Butler replaces that routine:

- **Register** each build once, when it arrives.
- **Deploy** it to any set of PCs with a checklist.
- A small **agent** on each PC installs it on Thursday at 09:00, with no password typing.
- A **status board** shows every PC's build and whether the last install worked.

## Features

- **Status board.** One row per PC: GPU, network tag, current build, a coloured status badge (green success, amber pending/installing, red failed) and when its agent was last seen. Click a row to read the step-by-step install log. Refreshes every 10 seconds.
- **Builds.** Newest first, with a "Register build" form, an "Edit" button to fix a version, zip URL or notes, and a "Deploy" checklist. Deploy flags PCs already on that build and skips PCs that already have it queued.
- **Machines.** Add a PC and get its agent token, shown once with a copy button. Edit a PC's name, GPU, RAM or network tag at any time without changing its token.
- **Project notes.** Each project's builds and setup notes (drivers, launch flags, save locations) in one place.
- **Windows agent.** A PowerShell script that downloads the zip, replaces the old build folder, unzips the new one and reports back. A one-time installer registers it as a scheduled task.

## Screenshots

<!-- Replace with real screenshots, e.g. docs/screenshots/status-board.png -->
_Status board: screenshot coming soon_

_Builds and the Deploy checklist: screenshot coming soon_

_Machines and the one-time token: screenshot coming soon_

## How it works

```
 React website ──► Express API ──► PostgreSQL
                      ▲
 PowerShell agent ────┘  (one per test PC, asks "any job for me?")
```

1. **Deploy** creates an `installs` row with status `pending` for each chosen PC.
2. On Thursday at 09:00 each PC's agent calls `GET /api/agent/next` with its token in the `X-Agent-Token` header.
3. The server replies with the oldest pending job, or `204 No Content` if there's nothing to do.
4. The agent reports `installing`, does the work, then reports `success` or `failed` with a log.
5. The status board shows the result on its next refresh.

The server never connects to the PCs. Each agent pulls its own work, so the server needs no admin rights on any machine.

## Tech stack

| Part | Choice | Why |
|---|---|---|
| Front end | React + Vite, plain CSS | No UI library, so every style is visible and easy to change |
| API | Node.js + Express 5 | Express 5 sends errors from `async` routes to one error handler |
| Database | PostgreSQL with `pg` and plain SQL | No ORM, so every query is readable as-is |
| Agent | Windows PowerShell 5.1 | Built into every Windows PC, nothing to install |

Runtime dependencies: `express`, `pg`, `react`, `react-dom`. Dev-only: `vite`, `@vitejs/plugin-react`. Node's built-in `--env-file`, `--watch` and `crypto` replace `dotenv`, `nodemon` and `uuid`.

## Project structure

```
build-butler/
├── database/     schema.sql (4 tables) and seed.sql (demo data)
├── server/       Express API, routes/, check-api.js smoke test, public/builds/ dummy zips
├── client/       React app: pages/ (4 pages), components/ (badge, modal, forms), demo/ (sample data for the static demo)
└── agent/        agent.ps1, install-agent.ps1, config.example.json
```

## Run it locally

**You need:** Node.js 20.11 or newer (built with Node 26) and PostgreSQL (built with 16).

On macOS with Homebrew:

```bash
brew install postgresql@16
brew services start postgresql@16
```

**1. Create the database**

```bash
createdb build_butler
psql -d build_butler -f database/schema.sql -f database/seed.sql
```

**2. Start the API** (first terminal window)

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

You should see `Build Butler API on http://localhost:3001`. Edit `.env` if your Postgres needs a username or password.

**3. Start the website** (second terminal window)

```bash
cd client
npm install
npm run dev
```

Open **http://localhost:5173**. Vite forwards `/api` requests to the API, so no CORS setup is needed.

**4. Check the API** (optional, any spare terminal window, with the API running)

```bash
cd server
npm run check
```

This resets the demo data and runs 13 checks, printing ✅ or ❌ for each. Run `npm run db:reset` any time to go back to clean demo data.

**5. Build the static demo** (optional, for hosting on a plain web host)

```bash
cd client
npm run build:demo
```

This builds the website into `client/dist` with sample data inside it, using `client/src/demo/` instead of the API. Upload the contents of `dist` to any static host. No server or database is needed.

## Install the agent on a Windows PC

1. On the **Machines** page, add the PC and copy its agent token.
2. Copy the `agent` folder to the PC, for example to `C:\BuildButler\agent`. The scheduled task runs the script from wherever it is, so choose a permanent place.
3. Open **PowerShell as administrator** in that folder and run:

   ```powershell
   .\install-agent.ps1 -ServerUrl http://<server-ip>:3001 -Token <token>
   ```

   Use the IP address of the computer running the API, not `localhost`. On a Mac, `ipconfig getifaddr en0` shows it. Allow incoming connections for Node if the firewall asks.

The installer:
- writes `config.json` and limits it to SYSTEM and Administrators, because it holds the token
- checks the server accepts the token
- registers the **Build Butler Agent** scheduled task, which runs every Thursday at 09:00 as SYSTEM with highest privileges, and runs late if the PC was switched off at 09:00

**Run now** (for example, right after a deploy):

```powershell
Start-ScheduledTask -TaskName 'Build Butler Agent'
```

**See what happened:** the agent writes `agent.log` next to `agent.ps1`, and every install log also appears on the status board.

**Uninstall:**

```powershell
Unregister-ScheduledTask -TaskName 'Build Butler Agent' -Confirm:$false
```

Then delete the agent folder.

**Safety:** builds install into `C:\Builds\<project>`. The installer's `-InstallRoot` option changes the base folder. The agent strips anything except letters, numbers, spaces, `_` and `-` from project names before deleting a folder, so a name like `..\Windows` can never point outside the builds folder.

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/projects` | All projects |
| GET | `/api/builds` | All builds, newest first |
| POST | `/api/builds` | Register a build `{ project_id, version, file_url, notes }` |
| PUT | `/api/builds/:id` | Edit a build `{ version, file_url, notes }` (the project can't change) |
| GET | `/api/machines` | Status board data (never includes tokens) |
| POST | `/api/machines` | Add a machine; the response is the only place its token appears |
| PUT | `/api/machines/:id` | Edit `{ name, gpu, ram_gb, network_tag }`; the token is never changed or returned |
| POST | `/api/deploy` | `{ build_id, machine_ids[] }` creates pending installs, skips duplicates |
| GET | `/api/agent/next` | Header `X-Agent-Token`. Oldest pending job or `204`. Updates `last_seen` |
| POST | `/api/agent/report` | Header `X-Agent-Token`. `{ install_id, status, log }`, only for this machine's installs |

## Security notes and limits

This is an MVP for a portfolio. It is **not ready for a real network** as it stands:

- **There is no login.** Anyone who can reach the website can register builds, deploy and add machines. A real deployment needs authentication, ideally the studio's existing single sign-on, plus roles such as "can deploy".
- **Agent tokens are stored as plain text** in the database. They should be hashed, the same way passwords are.
- **Everything runs over HTTP.** A real deployment should use HTTPS so tokens can't be read on the network.
- **The agent has been tested end to end with PowerShell 7 on macOS**: it fetched a queued job, downloaded and unzipped the build, reported success with its log, and the status board turned green. **It hasn't yet been run on a real Windows PC**, so `install-agent.ps1` (the scheduled task and file permissions) and Windows PowerShell 5.1 are still to test.

What already holds up:
- No admin password is typed or stored anywhere.
- Tokens are shown once and never returned again.
- An agent can only fetch and report its own installs.
- The database rejects invalid statuses.

## What I'd add next

- **Notifications:** a Slack or Teams message when a build is registered and when an install fails.
- **UE5 packaging with RunUAT:** build and package Unreal projects with `RunUAT BuildCookRun`, so a new build is registered automatically instead of uploaded by hand.
- **Login:** authentication and roles, as described above.
- **Rollback:** keep the previous build folder and add a one-click "go back to the last good build".
- **Edit project notes in the UI:** today notes are changed with SQL or in `seed.sql`.

## How I built this

I designed Build Butler from a real problem at my last studio and built it with an AI coding assistant, one step at a time: database, API, website, then the agent. I wrote the brief, made the design decisions, and tested each part before moving on, including running the real agent end to end.
