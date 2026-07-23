import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

let pool: Pool | null = null;
export let db: ReturnType<typeof drizzle> | null = null;
export let dbReadyPromise: Promise<boolean> | null = null;
let isDbOffline = false;
let lastOfflineCheck = 0;

export const initDb = () => {
  const now = Date.now();
  // If previously failed, allow retry every 5 seconds instead of permanent lockout
  if (isDbOffline) {
    if (now - lastOfflineCheck < 5000) {
      return null;
    }
    // Reset state to attempt retry
    isDbOffline = false;
    pool = null;
    db = null;
  }
  if (db) return db;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn("DATABASE_URL is not set. Database connection will not be established.");
    isDbOffline = true;
    lastOfflineCheck = now;
    return null;
  }

  pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 3000,
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle SQL pool client:', err);
    isDbOffline = true;
    lastOfflineCheck = Date.now();
  });

  // Self-healing: Ensure tables exist, and keep a promise we can await
  dbReadyPromise = (async () => {
    if (!pool) return false;
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS storage (
          key VARCHAR(255) PRIMARY KEY,
          data TEXT NOT NULL
        );
      `);
      console.log("Postgres 'storage' table checked/created successfully.");

      await pool.query(`
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

      // Attempt to add new columns if the table already existed and was missing them
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
          await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${col};`);
        } catch (e) {
          // Ignore if column already exists
        }
      }

      console.log("Postgres 'users' table checked/created successfully.");

      await pool.query(`
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
      console.log("Postgres 'ads' table checked/created successfully.");

      await pool.query(`
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
      console.log("Postgres 'matomo_events' table checked/created successfully.");

      await pool.query(`
        CREATE TABLE IF NOT EXISTS matomo_properties (
          id VARCHAR(255) PRIMARY KEY,
          domain VARCHAR(255) NOT NULL UNIQUE,
          added VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log("Postgres 'matomo_properties' table checked/created successfully.");

      return true;
    } catch (err: any) {
      console.error("Failed to self-heal/create database tables, setting isDbOffline=true:", err.message);
      isDbOffline = true;
      lastOfflineCheck = Date.now();
      return false;
    }
  })();

  db = drizzle(pool, { schema });
  return db;
};
