import express from 'express';
import path from 'node:path';
import projectsRouter from './routes/projects.js';
import buildsRouter from './routes/builds.js';
import machinesRouter from './routes/machines.js';
import deployRouter from './routes/deploy.js';
import agentRouter from './routes/agent.js';

const app = express();
app.use(express.json());

// Serves the dummy build zips. A real studio would point file_url at a file share or storage bucket.
app.use('/builds', express.static(path.join(import.meta.dirname, 'public', 'builds')));

app.use('/api/projects', projectsRouter);
app.use('/api/builds', buildsRouter);
app.use('/api/machines', machinesRouter);
app.use('/api/deploy', deployRouter);
app.use('/api/agent', agentRouter);

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Express 5 forwards errors from async route handlers here, so routes don't need try/catch.
// Turning known Postgres error codes into 4xx tells the caller it was their input, not a crash.
app.use((err, req, res, next) => {
  if (err.code === '23505') return res.status(409).json({ error: 'That already exists', detail: err.detail });
  if (err.code === '23503') return res.status(400).json({ error: 'Referenced record does not exist', detail: err.detail });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Body is not valid JSON' });
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Build Butler API on http://localhost:${port}`));
