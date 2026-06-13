/**
 * Deploy-time database migration runner (CON-109).
 *
 * Applies pending Drizzle migrations against the DIRECT (unpooled) Neon
 * endpoint. drizzle migrations fail silently over the pooled `-pooler`
 * endpoint (PgBouncer transaction mode) — see CON-105 — so this resolves and
 * uses the direct endpoint explicitly.
 *
 * Wired into vercel.json `buildCommand` (`bun run db:migrate:deploy && bun run
 * build`) so every Vercel deploy — preview and production — migrates its own
 * database before the app builds. A failed migration exits non-zero and fails
 * the build, preventing code from shipping against a schema that wasn't
 * migrated.
 *
 * Uses drizzle-orm's programmatic migrator (not the drizzle-kit CLI): it is the
 * path verified working over a direct connection in CON-105, and it only reads
 * migrations listed in meta/_journal.json (orphan .sql files in the folder are
 * ignored).
 *
 * URL resolution: DATABASE_DIRECT_URL if set, otherwise DATABASE_URL with the
 * `-pooler` suffix stripped. Set DATABASE_DIRECT_URL in Vercel for each
 * environment if you prefer an explicit unpooled URL over derivation.
 *
 * Local use: `bun run db:migrate:deploy` (bun loads .env.local; targets
 * whatever branch DATABASE_URL points at — currently dev-josh).
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

const MIGRATIONS_FOLDER = 'src/db/migrations';

function resolveDirectUrl(): string | null {
  if (process.env.DATABASE_DIRECT_URL) return process.env.DATABASE_DIRECT_URL;
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  // Neon pooled host is `ep-xxx-pooler.<region>...`; the direct host drops `-pooler`
  return url.replace('-pooler', '');
}

/** Host + database only — never log credentials. */
function maskHost(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname}`;
  } catch {
    return '(unparseable connection string)';
  }
}

async function main() {
  const directUrl = resolveDirectUrl();
  if (!directUrl) {
    // No DB URL at build time is a configuration gap, not a migration failure.
    // Skip (exit 0) rather than hard-failing the deploy — this matches the
    // pre-CON-109 behaviour (no auto-migration) and avoids blocking a deploy
    // if env vars aren't exposed to the Vercel build. The loud warning surfaces
    // it in build logs; runtime env-validation (instrumentation.ts) still
    // enforces DATABASE_URL at app startup. A genuine migration FAILURE below
    // still exits non-zero and fails the build.
    console.warn('⚠️  migrate-deploy: no DATABASE_DIRECT_URL or DATABASE_URL at build time — skipping migrations. Apply manually or expose the env var to the build.');
    process.exit(0);
  }

  console.log(`🔼 migrate-deploy: applying migrations to ${maskHost(directUrl)} (direct endpoint)`);
  const pool = new Pool({ connectionString: directUrl, max: 1 });
  try {
    const db = drizzle(pool);
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
    console.log('✅ migrate-deploy: schema is up to date.');
  } catch (err) {
    console.error('❌ migrate-deploy: migration failed:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
