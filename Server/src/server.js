// Server/src/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import passwordRoutes from "./routes/passwordRoutes.js";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use("/password", passwordRoutes);

// Health route
app.get("/", (req, res) => {
  res.json({ success: true, message: "Nexus Qadr Backend Running" });
});

// ---------------- DB CHECK ----------------
async function tryDbConnect() {
  const dbPath = path.resolve(process.cwd(), "src", "config", "db.js");

  if (!fs.existsSync(dbPath)) {
    console.warn("⚠️ DB config not found — skipping DB check");
    return;
  }

  try {
    const { default: pool } = await import("./config/db.js");

    if (!pool) return;

    await pool.query("SELECT 1");
    console.log("✔ Database connected");
    // Lightweight migration: ensure user_roles has is_blocked column (idempotent)
    try {
      // Check whether the user_roles table exists before attempting ALTER.
      const tblRes = await pool.query(`SELECT to_regclass('public.user_roles') as exists;`);
      const exists = tblRes.rows && tblRes.rows[0] && tblRes.rows[0].exists;
      if (!exists) {
        console.log("ℹ️ Skipping user_roles.is_blocked migration: table user_roles does not exist yet");
      } else {
        await pool.query(
          `ALTER TABLE user_roles
           ADD COLUMN IF NOT EXISTS is_blocked boolean DEFAULT FALSE;`
        );
        await pool.query(
          `CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_is_blocked ON user_roles(user_id, is_blocked);`
        );
        console.log("✔ Ensured user_roles.is_blocked column exists");
      }
    } catch (migErr) {
      // don't fail startup for migration issues, just log
      console.warn("⚠️ Failed to ensure user_roles.is_blocked:", migErr.message || migErr);
    }
  } catch (err) {
    console.error("❌ DB connection failed:", err.message);
  }
}

// ---------------- ROUTES AUTO-LOAD ----------------
async function tryMountRoutes() {
  const routesDir = path.resolve(process.cwd(), "src", "routes");

  if (!fs.existsSync(routesDir)) {
    console.warn("⚠️ No routes folder found");
    return;
  }

  const files = fs
    .readdirSync(routesDir)
    .filter((f) => f.endsWith(".js"));

  for (const file of files) {
    const base = file.replace(/Routes?\.js$/i, "");
    const mountPath = `/${base.toLowerCase()}`;

    try {
      const imported = await import(`./routes/${file}`);
      const router = imported.default;

      if (!router) {
        console.warn(`⚠️ No router exported by ${file}`);
        continue;
      }

      app.use(mountPath, router);
      console.log(`→ Mounted: [${mountPath}] → ${file}`);
    } catch (err) {
      console.warn(`❌ Failed to load ${file}:`, err.message);
    }
  }
}


// ---------------- START SERVER ----------------
async function start() {
  await tryDbConnect();
  await tryMountRoutes();

  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
}

start();
