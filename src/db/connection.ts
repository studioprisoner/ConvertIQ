import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://devuser:devpassword@localhost:5432/mydevdb',
});

export const db = drizzle(pool, { schema });
export { pool };