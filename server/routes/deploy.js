import { Router } from 'express';
import { pool } from '../db.js';
import { isPositiveInt } from '../validate.js';

const router = Router();

// Deploying only queues work. Each machine's agent picks it up the next time it runs,
// so the server never needs to reach into a PC or hold admin rights on it.
router.post('/', async (req, res) => {
  const { build_id, machine_ids } = req.body;
  if (!isPositiveInt(build_id) || !Array.isArray(machine_ids) || machine_ids.length === 0
      || !machine_ids.every(isPositiveInt)) {
    return res.status(400).json({ error: 'build_id and a non-empty machine_ids array are required' });
  }

  // unnest turns the array into rows so one INSERT covers every machine.
  // NOT EXISTS skips machines already waiting on this build, so a double-click doesn't queue it twice.
  const uniqueIds = [...new Set(machine_ids)];
  const { rows } = await pool.query(
    `INSERT INTO installs (machine_id, build_id)
     SELECT t.mid, $2 FROM unnest($1::int[]) AS t(mid)
     WHERE NOT EXISTS (
       SELECT 1 FROM installs i
       WHERE i.machine_id = t.mid AND i.build_id = $2 AND i.status IN ('pending', 'installing')
     )
     RETURNING id, machine_id, build_id, status`,
    [uniqueIds, build_id]
  );
  res.status(201).json({ created: rows, skipped: uniqueIds.length - rows.length });
});

export default router;
