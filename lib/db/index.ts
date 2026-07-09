import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

let pool: Pool | null = null;
export let db: ReturnType<typeof drizzle> | null = null;
export let dbReadyPromise: Promise<boolean> | null = null;

export const initDb = () => {
  if (db) return db;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn("DATABASE_URL is not set. Database connection will not be established.");
    return null;
  }

  pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 15000,
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle SQL pool client:', err);
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
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
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
      return true;
    } catch (err: any) {
      console.error("Failed to self-heal/create database tables:", err.message);
      return false;
    }
  })();

  db = drizzle(pool, { schema });
  return db;
};
