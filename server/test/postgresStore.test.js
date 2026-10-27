import assert from "node:assert/strict";
import { test } from "node:test";
import { createPostgresStore } from "../src/data/postgresStore.js";

test("PostgreSQL persistence requires an explicit database URL", async () => {
  await assert.rejects(createPostgresStore({ connectionString: "" }), {
    message:
      "Set DATABASE_URL to a PostgreSQL connection string before starting the API.",
  });
});
