import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { demoReports, demoUsers } from "./store.js";

const migrationUrl = new URL(
  "./migrations/001_initial_schema.sql",
  import.meta.url,
);
const reportColumns = `
  id, title, description, location_label, latitude, longitude, image_url,
  severity, status, reporter_id, created_at, updated_at
`;

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    passwordHash: row.password_hash,
  };
}

function mapReport(row, history = []) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    locationLabel: row.location_label,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    imageUrl: row.image_url,
    severity: row.severity,
    status: row.status,
    reporterId: row.reporter_id,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    history: history.map((entry) => ({
      status: entry.status,
      note: entry.note,
      changedAt: new Date(entry.changed_at).toISOString(),
    })),
  };
}

async function inTransaction(pool, callback) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function createPostgresStore({
  connectionString = process.env.DATABASE_URL,
  pool: suppliedPool,
} = {}) {
  if (!suppliedPool && !connectionString) {
    throw new Error(
      "Set DATABASE_URL to a PostgreSQL connection string before starting the API.",
    );
  }

  const pool =
    suppliedPool ??
    new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

  try {
    await pool.query("SELECT 1");
    const migration = await readFile(migrationUrl, "utf8");
    await inTransaction(pool, async (client) => {
      await client.query("SELECT pg_advisory_xact_lock($1)", [840291734]);
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version TEXT PRIMARY KEY,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      const applied = await client.query(
        "SELECT version FROM schema_migrations WHERE version = $1",
        ["001_initial_schema"],
      );
      if (applied.rowCount === 0) {
        await client.query(migration);
        await client.query(
          "INSERT INTO schema_migrations (version) VALUES ($1)",
          ["001_initial_schema"],
        );
      }
    });

    for (const demoUser of demoUsers) {
      const passwordHash = await bcrypt.hash(demoUser.password, 10);
      await pool.query(
        `INSERT INTO users (id, name, email, password_hash, role)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email) DO NOTHING`,
        [
          demoUser.id,
          demoUser.name,
          demoUser.email,
          passwordHash,
          demoUser.role,
        ],
      );
    }

    for (const report of demoReports) {
      await inTransaction(pool, async (client) => {
        await client.query(
          `INSERT INTO reports (${reportColumns})
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (id) DO NOTHING`,
          [
            report.id,
            report.title,
            report.description,
            report.locationLabel,
            report.latitude,
            report.longitude,
            report.imageUrl,
            report.severity,
            report.status,
            report.reporterId,
            report.createdAt,
            report.updatedAt,
          ],
        );
        for (const entry of report.history) {
          await client.query(
            `INSERT INTO report_status_history (report_id, status, note, changed_at)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (report_id, status, changed_at) DO NOTHING`,
            [report.id, entry.status, entry.note, entry.changedAt],
          );
        }
      });
    }
  } catch (error) {
    if (!suppliedPool) await pool.end();
    throw error;
  }

  async function getReport(client, id) {
    const reportResult = await client.query(
      `SELECT ${reportColumns} FROM reports WHERE id = $1`,
      [id],
    );
    const row = reportResult.rows[0];
    if (!row) return null;
    const historyResult = await client.query(
      `SELECT status, note, changed_at
       FROM report_status_history
       WHERE report_id = $1
       ORDER BY changed_at, id`,
      [id],
    );
    return mapReport(row, historyResult.rows);
  }

  return {
    async findUserByEmail(email) {
      const result = await pool.query(
        "SELECT id, name, email, role, password_hash FROM users WHERE email = $1",
        [email.toLowerCase()],
      );
      return mapUser(result.rows[0]);
    },
    async createUser({ name, email, passwordHash }) {
      try {
        const result = await pool.query(
          `INSERT INTO users (id, name, email, password_hash, role)
           VALUES (gen_random_uuid()::text, $1, $2, $3, 'citizen')
           RETURNING id, name, email, role, password_hash`,
          [name, email.toLowerCase(), passwordHash],
        );
        return mapUser(result.rows[0]);
      } catch (error) {
        if (error.code === "23505") return null;
        throw error;
      }
    },
    async listReports({ reporterId, status, search }) {
      const result = await pool.query(
        `SELECT ${reportColumns}
         FROM reports
         WHERE ($1::text IS NULL OR reporter_id = $1)
           AND ($2::text IS NULL OR status = $2)
           AND ($3::text IS NULL OR
             title ILIKE '%' || $3 || '%' OR
             description ILIKE '%' || $3 || '%' OR
             location_label ILIKE '%' || $3 || '%')
         ORDER BY created_at DESC`,
        [reporterId ?? null, status ?? null, search ?? null],
      );
      if (result.rows.length === 0) return [];

      const historyResult = await pool.query(
        `SELECT report_id, status, note, changed_at
         FROM report_status_history
         WHERE report_id = ANY($1::text[])
         ORDER BY changed_at, id`,
        [result.rows.map((row) => row.id)],
      );
      const histories = new Map();
      for (const entry of historyResult.rows) {
        const history = histories.get(entry.report_id) ?? [];
        history.push(entry);
        histories.set(entry.report_id, history);
      }
      return result.rows.map((row) =>
        mapReport(row, histories.get(row.id) ?? []),
      );
    },
    async findReportById(id) {
      return getReport(pool, id);
    },
    async createReport(input) {
      return inTransaction(pool, async (client) => {
        const id = randomUUID();
        const result = await client.query(
          `INSERT INTO reports (
             id, title, description, location_label, latitude, longitude,
             image_url, severity, status, reporter_id
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'submitted', $9)
           RETURNING ${reportColumns}`,
          [
            id,
            input.title,
            input.description,
            input.locationLabel,
            input.latitude,
            input.longitude,
            input.imageUrl ?? null,
            input.severity,
            input.reporterId,
          ],
        );
        await client.query(
          `INSERT INTO report_status_history (report_id, status, note)
           VALUES ($1, 'submitted', 'Report received')`,
          [id],
        );
        return getReport(client, result.rows[0].id);
      });
    },
    async updateReportStatus(id, status, note) {
      return inTransaction(pool, async (client) => {
        const result = await client.query(
          `UPDATE reports SET status = $2, updated_at = NOW()
           WHERE id = $1
           RETURNING id`,
          [id, status],
        );
        if (result.rowCount === 0) return null;
        await client.query(
          `INSERT INTO report_status_history (report_id, status, note)
           VALUES ($1, $2, $3)`,
          [id, status, note],
        );
        return getReport(client, id);
      });
    },
    async close() {
      if (!suppliedPool) await pool.end();
    },
  };
}
