import { Router } from 'express';
import { pool } from '../db.js';
import { isPositiveInt, isNonEmptyString } from '../validate.js';

const router = Router();

router.get('/', async (req, res) => {
  // Join the project name in so the UI doesn't need a second lookup per row.
  // id is the tie-breaker so builds registered in the same second keep a stable order.
  const { rows } = await pool.query(`
    SELECT b.*, p.name AS project_name
    FROM builds b
    JOIN projects p ON p.id = b.project_id
    ORDER BY b.created_at DESC, b.id DESC`);
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { project_id, version, file_url, notes = '' } = req.body;
  if (!isPositiveInt(project_id) || !isNonEmptyString(version) || !isNonEmptyString(file_url)) {
    return res.status(400).json({ error: 'project_id, version and file_url are required' });
  }

  // $1, $2... placeholders let pg escape values, which prevents SQL injection.
  const { rows } = await pool.query(
    `INSERT INTO builds (project_id, version, file_url, notes)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [project_id, version.trim(), file_url.trim(), String(notes)]
  );
  res.status(201).json(rows[0]);
});

// Fixes a typo'd version, a moved zip or missing notes. The project can't change:
// a build belongs to one game, and moving it would rewrite install history.
router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { version, file_url, notes = '' } = req.body;
  if (!isPositiveInt(id) || !isNonEmptyString(version) || !isNonEmptyString(file_url)) {
    return res.status(400).json({ error: 'version and file_url are required' });
  }

  const { rows } = await pool.query(
    `UPDATE builds SET version = $1, file_url = $2, notes = $3
     WHERE id = $4 RETURNING *`,
    [version.trim(), file_url.trim(), String(notes), id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'No such build' });
  res.json(rows[0]);
});

export default router;
