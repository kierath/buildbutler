import { Router } from 'express';
import { pool } from '../db.js';
import { isPositiveInt } from '../validate.js';

const router = Router();
const REPORTABLE_STATUSES = ['installing', 'success', 'failed'];

// Every agent request proves which machine it is with its token.
// Checking in also counts as "seen", so last_seen is updated here once for all agent routes.
async function requireAgent(req, res, next) {
  const token = req.get('X-Agent-Token');
  if (!token) return res.status(401).json({ error: 'Missing X-Agent-Token header' });

  const { rows } = await pool.query(
    'UPDATE machines SET last_seen = now() WHERE agent_token = $1 RETURNING id, name',
    [token]
  );
  if (rows.length === 0) return res.status(401).json({ error: 'Unknown agent token' });

  req.machine = rows[0];
  next();
}

router.use(requireAgent);

router.get('/next', async (req, res) => {
  // Oldest first, so builds install in the order they were deployed.
  const { rows } = await pool.query(
    `SELECT i.id AS install_id, p.name AS project_name, b.version, b.file_url
     FROM installs i
     JOIN builds b ON b.id = i.build_id
     JOIN projects p ON p.id = b.project_id
     WHERE i.machine_id = $1 AND i.status = 'pending'
     ORDER BY i.id
     LIMIT 1`,
    [req.machine.id]
  );
  // 204 No Content is the agent's signal that there is nothing to do.
  if (rows.length === 0) return res.sendStatus(204);
  res.json(rows[0]);
});

router.post('/report', async (req, res) => {
  const { install_id, status, log = '' } = req.body;
  if (!isPositiveInt(install_id) || !REPORTABLE_STATUSES.includes(status)) {
    return res.status(400).json({ error: `install_id and a status of ${REPORTABLE_STATUSES.join('/')} are required` });
  }

  // Matching machine_id as well means one machine can't overwrite another machine's install.
  const { rows } = await pool.query(
    `UPDATE installs SET status = $1, log = $2, updated_at = now()
     WHERE id = $3 AND machine_id = $4
     RETURNING id, status, updated_at`,
    [status, String(log), install_id, req.machine.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'No such install for this machine' });
  res.json(rows[0]);
});

export default router;
