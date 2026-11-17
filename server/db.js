import pg from 'pg';

// One shared pool: opening a new connection per request is slow,
// and the pool hands out and reuses a small set of connections for us.
export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
