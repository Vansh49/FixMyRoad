import "dotenv/config";
import { createApp } from "./app.js";
import { createStore } from "./data/store.js";

const port = Number(process.env.PORT ?? 4000);
const secret = process.env.JWT_SECRET ?? (process.env.NODE_ENV === "production" ? "" : "local-only-change-this-secret");

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be a valid TCP port.");
}
if (secret.length < 24) {
  throw new Error("Set JWT_SECRET to a value at least 24 characters long.");
}

const store = await createStore();
const app = createApp({ store, secret, clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173" });
app.listen(port, () => {
  console.log(`FixMyRoad API listening on http://localhost:${port}`);
});
