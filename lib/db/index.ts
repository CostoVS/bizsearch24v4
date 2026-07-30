import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

let pool: Pool | null = null;
export let db: ReturnType<typeof drizzle> | null = null;
export let dbReadyPromise: Promise<boolean> | null = null;
let isDbOffline = false;
let lastOfflineCheck = 0;
let hasRunMigrations = false;

export const initDb = () => {
  const now = Date.now();
  // If DB was flagged offline, backoff for 60 seconds to prevent connection spam and event loop hanging
  if (isDbOffline) {
    if (now - lastOfflineCheck < 60000) {
      return null;
    }
    // Reset state to attempt retry after backoff
    isDbOffline = false;
    if (pool) {
      pool.end().catch(() => {});
    }
    pool = null;
    db = null;
  }
  if (db && pool) return db;

  const connectionString = process.env.DATABASE_URL || "postgresql://sb_admin_secure_usr:Sb9_kL82_vX97_mQ41_zP30_rN@db:5432/searchbiz_db";

  try {
    pool = new Pool({
      connectionString,
      connectionTimeoutMillis: 1000,
      idleTimeoutMillis: 10000,
      max: 5,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err?.message || err);
      isDbOffline = true;
      lastOfflineCheck = Date.now();
    });

    // Run table setup ONLY ONCE per process lifetime
    if (!hasRunMigrations) {
      dbReadyPromise = (async () => {
        if (!pool) return false;
        
        const runMigrations = async (activePool: Pool) => {
          await activePool.query(`
            CREATE TABLE IF NOT EXISTS storage (
              key VARCHAR(255) PRIMARY KEY,
              data TEXT NOT NULL
            );
          `);
          await activePool.query(`
            CREATE TABLE IF NOT EXISTS users (
              id SERIAL PRIMARY KEY,
              email VARCHAR(255) NOT NULL UNIQUE,
              role VARCHAR(50) NOT NULL DEFAULT 'USER',
              plan VARCHAR(50) NOT NULL DEFAULT 'FREE',
              password_hash VARCHAR(255),
              password TEXT,
              secret_key VARCHAR(255),
              has_setup_2fa BOOLEAN DEFAULT FALSE,
              last_login_ip VARCHAR(45),
              device_info TEXT,
              location VARCHAR(255),
              phone VARCHAR(50),
              failed_attempts INT DEFAULT 0,
              is_locked BOOLEAN DEFAULT FALSE,
              full_name VARCHAR(255),
              address TEXT,
              business_name VARCHAR(255),
              business_category VARCHAR(255),
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
          `);

          const columnsToAdd = [
            'phone VARCHAR(50)',
            'failed_attempts INT DEFAULT 0',
            'is_locked BOOLEAN DEFAULT FALSE',
            'full_name VARCHAR(255)',
            'address TEXT',
            'business_name VARCHAR(255)',
            'business_category VARCHAR(255)'
          ];

          for (const col of columnsToAdd) {
            try {
              await activePool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${col};`);
            } catch (e) {
              // Ignore
            }
          }

          await activePool.query(`
            CREATE TABLE IF NOT EXISTS ads (
              id SERIAL PRIMARY KEY,
              user_id INT NOT NULL,
              title VARCHAR(255) NOT NULL,
              category VARCHAR(100) NOT NULL,
              province VARCHAR(100) NOT NULL,
              location VARCHAR(255) NOT NULL,
              description TEXT NOT NULL,
              is_premium BOOLEAN DEFAULT FALSE,
              is_sponsor BOOLEAN DEFAULT FALSE,
              is_verified BOOLEAN DEFAULT FALSE,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
          `);

          await activePool.query(`
            CREATE TABLE IF NOT EXISTS matomo_events (
              id VARCHAR(255) PRIMARY KEY,
              type VARCHAR(100) NOT NULL,
              path TEXT,
              title TEXT,
              referrer TEXT,
              query TEXT,
              ad_id TEXT,
              target_url TEXT,
              action TEXT,
              ip VARCHAR(100),
              city VARCHAR(100),
              region VARCHAR(100),
              country VARCHAR(100),
              browser VARCHAR(100),
              device VARCHAR(100),
              property_id VARCHAR(255) DEFAULT 'internal',
              timestamp VARCHAR(255),
              raw_json TEXT,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
          `);

          await activePool.query(`
            CREATE TABLE IF NOT EXISTS matomo_properties (
              id VARCHAR(255) PRIMARY KEY,
              domain VARCHAR(255) NOT NULL UNIQUE,
              added VARCHAR(255),
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
          `);
        };

        try {
          await runMigrations(pool);
          hasRunMigrations = true;
          console.log("Postgres tables checked/created successfully.");
          return true;
        } catch (err: any) {
          console.warn("Primary DB connection check failed:", err.message);
          isDbOffline = true;
          lastOfflineCheck = Date.now();
          return false;
        }
      })();
    }

    db = drizzle(pool, { schema });
    return db;
  } catch (err: any) {
    console.warn("Failed to initialize pool:", err.message);
    isDbOffline = true;
    lastOfflineCheck = Date.now();
    return null;
  }
};
