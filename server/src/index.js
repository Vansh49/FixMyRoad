import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { createPostgresStore } from "./data/postgresStore.js";

dotenv.config({
  path: [
    fileURLToPath(new URL("../.env", import.meta.url)),
    fileURLToPath(new URL("../../.env", import.meta.url)),
  ],
});

const port = Number(process.env.PORT ?? 4000);
const secret =
  process.env.JWT_SECRET ??
  (process.env.NODE_ENV === "production"
    ? ""
    : "local-only-change-this-secret");

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be a valid TCP port.");
}
if (secret.length < 24) {
  throw new Error("Set JWT_SECRET to a value at least 24 characters long.");
}

const store = await createPostgresStore();
const app = createApp({
  store,
  secret,
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
});
const server = app.listen(port, () => {
  console.log(`FixMyRoad API listening on http://localhost:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    server.close(async (error) => {
      if (error) {
        console.error("Could not close the HTTP server cleanly:", error);
        process.exitCode = 1;
      }
      await store.close();
    });
  });
}
