import { Router } from 'express';
import crypto from 'node:crypto';
import { pool } from '../db.js';
import { isPositiveInt, isNonEmptyString } from '../validate.js';

const router = Router();

// One row per machine for the status board.
// "latest" = the newest install of any status (drives the badge and the log).
// "installed" = the newest successful install (what is actually on the PC right now).
// LEFT JOIN LATERAL runs the subquery once per machine and keeps machines that have no installs.
// agent_token is deliberately not selected: it is a secret and is only shown once, on creation.
const STATUS_BOARD_SQL = `
  SELECT m.id, m.name, m.gpu, m.ram_gb, m.network_tag, m.last_seen,
         latest.id         AS latest_install_id,
         latest.status     AS latest_status,
         latest.log        AS latest_log,
         latest.updated_at AS latest_updated_at,
         latest.project    AS latest_project,
         latest.version    AS latest_version,
         installed.project AS current_project,
         installed.version AS current_version
  FROM machines m
  LEFT JOIN LATERAL (
    SELECT i.id, i.status, i.log, i.updated_at, p.name AS project, b.version
    FROM installs i
    JOIN builds b ON b.id = i.build_id
    JOIN projects p ON p.id = b.project_id
    WHERE i.machine_id = m.id
    ORDER BY i.id DESC
    LIMIT 1
  ) latest ON true
  LEFT JOIN LATERAL (
    SELECT p.name AS project, b.version
    FROM installs i
    JOIN builds b ON b.id = i.build_id
    JOIN projects p ON p.id = b.project_id
    WHERE i.machine_id = m.id AND i.status = 'success'
    ORDER BY i.updated_at DESC
    LIMIT 1
  ) installed ON true
  ORDER BY m.name`;

router.get('/', async (req, res) => {
  const { rows } = await pool.query(STATUS_BOARD_SQL);
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { name, gpu, ram_gb, network_tag } = req.body;
  if (![name, gpu, network_tag].every(isNonEmptyString) || !isPositiveInt(ram_gb)) {
    return res.status(400).json({ error: 'name, gpu, network_tag and a positive ram_gb are required' });
  }

  // randomBytes is cryptographically secure, unlike Math.random, so tokens can't be guessed.
  const agentToken = crypto.randomBytes(24).toString('hex');
  const { rows } = await pool.query(
    `INSERT INTO machines (name, gpu, ram_gb, network_tag, agent_token)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [name.trim(), gpu.trim(), ram_gb, network_tag.trim(), agentToken]
  );
  // The only response that ever includes the token.
  res.status(201).json(rows[0]);
});

// Edits the descriptive fields only. The token is never changed or returned here.
router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { name, gpu, ram_gb, network_tag } = req.body;
  if (!isPositiveInt(id) || ![name, gpu, network_tag].every(isNonEmptyString) || !isPositiveInt(ram_gb)) {
    return res.status(400).json({ error: 'name, gpu, network_tag and a positive ram_gb are required' });
  }

  const { rows } = await pool.query(
    `UPDATE machines SET name = $1, gpu = $2, ram_gb = $3, network_tag = $4
     WHERE id = $5
     RETURNING id, name, gpu, ram_gb, network_tag, last_seen`,
    [name.trim(), gpu.trim(), ram_gb, network_tag.trim(), id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'No such machine' });
  res.json(rows[0]);
});

export default router;
