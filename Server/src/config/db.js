import pkg from "pg";
import dotenv from "dotenv";
dotenv.config();
const { Pool } = pkg;

// Build pool config: prefer DATABASE_URL if present
const poolConfig = {};

if (process.env.DATABASE_URL) {
  poolConfig.connectionString = process.env.DATABASE_URL;
} else {
  poolConfig.user = process.env.DB_USER;
  poolConfig.host = process.env.DB_HOST;
  poolConfig.database = process.env.DB_NAME;
  poolConfig.password = process.env.DB_PASSWORD;
  poolConfig.port = process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432;
}

// Decide whether to enable SSL. Accept multiple ways to opt-in:
// - PGSSLMODE=require
// - DATABASE_SSL=true
// - presence of 'sslmode=require' in DATABASE_URL
const pgSslMode = (process.env.PGSSLMODE || '').toLowerCase();
const optInSsl = process.env.DATABASE_SSL === 'true' || pgSslMode === 'require' || (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('sslmode=require'));

if (optInSsl) {
  // For many hosted Postgres (Heroku, Railway) you can set rejectUnauthorized=false
  // when the platform uses a trusted certificate chain. Allow overriding via env.
  const rejectUnauthorized = process.env.DB_REJECT_UNAUTHORIZED !== 'false';
  poolConfig.ssl = { rejectUnauthorized };
  console.log('DB: SSL enabled for Postgres connection (rejectUnauthorized=' + rejectUnauthorized + ')');
}

const pool = new Pool(poolConfig);

export default pool;
