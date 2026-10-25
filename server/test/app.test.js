import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createApp } from "../src/app.js";
import { createStore } from "../src/data/store.js";

const secret = "test-secret-that-is-at-least-24-characters";
let server;
let baseUrl;
let citizenToken;
let officerToken;
let createdReportId;
let uploadDirectory;

before(async () => {
  uploadDirectory = await mkdtemp(path.join(os.tmpdir(), "roadwatch-test-"));
  const app = createApp({ store: await createStore(), secret, uploadDirectory });
  server = createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  const [citizenResponse, officerResponse] = await Promise.all([
    fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "citizen@civic.local", password: "Citizen123!" }),
    }),
    fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "officer@civic.local", password: "Officer123!" }),
    }),
  ]);
  citizenToken = (await citizenResponse.json()).token;
  officerToken = (await officerResponse.json()).token;
});

after(async () => {
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  if (uploadDirectory) await rm(uploadDirectory, { recursive: true, force: true });
});

test("health check is public and reports API status", async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok" });
});

test("citizen can create a report and retrieve it", async () => {
  const response = await fetch(`${baseUrl}/api/reports`, {
    method: "POST",
    headers: { authorization: `Bearer ${citizenToken}`, "content-type": "application/json" },
    body: JSON.stringify({
      title: "Broken road near the library",
      description: "A large pothole is causing vehicles to slow down suddenly.",
      locationLabel: "5 Library Road, Central Ward",
      latitude: 28.61,
      longitude: 77.21,
      severity: "high",
    }),
  });
  assert.equal(response.status, 201);
  const { report } = await response.json();
  createdReportId = report.id;
  assert.equal(report.status, "submitted");
  assert.equal(report.history.length, 1);

  const detailResponse = await fetch(`${baseUrl}/api/reports/${createdReportId}`, {
    headers: { authorization: `Bearer ${citizenToken}` },
  });
  assert.equal(detailResponse.status, 200);
  assert.equal((await detailResponse.json()).report.id, createdReportId);
});

test("citizen cannot change status and officer can advance report status", async () => {
  const forbidden = await fetch(`${baseUrl}/api/reports/report-1002/status`, {
    method: "PATCH",
    headers: { authorization: `Bearer ${citizenToken}`, "content-type": "application/json" },
    body: JSON.stringify({ status: "in_progress" }),
  });
  assert.equal(forbidden.status, 403);

  const response = await fetch(`${baseUrl}/api/reports/report-1002/status`, {
    method: "PATCH",
    headers: { authorization: `Bearer ${officerToken}`, "content-type": "application/json" },
    body: JSON.stringify({ status: "in_progress", note: "Crew assigned" }),
  });
  assert.equal(response.status, 200);
  const { report } = await response.json();
  assert.equal(report.status, "in_progress");
  assert.equal(report.history.at(-1).note, "Crew assigned");
});

test("unauthenticated access is rejected and report validation is enforced", async () => {
  const unauthorized = await fetch(`${baseUrl}/api/reports`);
  assert.equal(unauthorized.status, 401);

  const invalid = await fetch(`${baseUrl}/api/reports`, {
    method: "POST",
    headers: { authorization: `Bearer ${citizenToken}`, "content-type": "application/json" },
    body: JSON.stringify({ title: "Bad", latitude: 120 }),
  });
  assert.equal(invalid.status, 400);
});

test("registration always creates a citizen and citizens cannot access another person's report", async () => {
  const registration = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "New Neighbor",
      email: "neighbor@example.com",
      password: "LongEnough123!",
      role: "officer",
    }),
  });
  assert.equal(registration.status, 201);
  const { token, user } = await registration.json();
  assert.equal(user.role, "citizen");

  const forbidden = await fetch(`${baseUrl}/api/reports/report-1001`, {
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(forbidden.status, 403);
});

test("citizen report photo is validated, stored locally, and served", async () => {
  const formData = new FormData();
  formData.set("title", "Photo report at the library");
  formData.set("description", "A pothole by the library entrance needs a repair.");
  formData.set("locationLabel", "5 Library Road, Central Ward");
  formData.set("latitude", "28.61");
  formData.set("longitude", "77.21");
  formData.set("severity", "medium");
  formData.set("photo", new Blob([Uint8Array.from([0xff, 0xd8, 0xff, 0xd9])], { type: "image/jpeg" }), "road.jpg");

  const response = await fetch(`${baseUrl}/api/reports`, {
    method: "POST",
    headers: { authorization: `Bearer ${citizenToken}` },
    body: formData,
  });
  assert.equal(response.status, 201);
  const { report } = await response.json();
  assert.match(report.imageUrl, /^\/uploads\/[0-9a-f-]+\.jpg$/);
  assert.equal(report.latitude, 28.61);
  assert.equal(report.longitude, 77.21);

  const imageResponse = await fetch(`${baseUrl}${report.imageUrl}`);
  assert.equal(imageResponse.status, 200);
  assert.equal(imageResponse.headers.get("content-type"), "image/jpeg");
  assert.deepEqual(Buffer.from(await imageResponse.arrayBuffer()), Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
});

test("report upload rejects non-image files and oversized images", async () => {
  const unsupported = new FormData();
  unsupported.set("title", "Text file report");
  unsupported.set("description", "A pothole near the library needs a repair.");
  unsupported.set("locationLabel", "5 Library Road, Central Ward");
  unsupported.set("latitude", "28.61");
  unsupported.set("longitude", "77.21");
  unsupported.set("severity", "low");
  unsupported.set("photo", new Blob(["not an image"], { type: "text/plain" }), "notes.txt");

  const unsupportedResponse = await fetch(`${baseUrl}/api/reports`, {
    method: "POST",
    headers: { authorization: `Bearer ${citizenToken}` },
    body: unsupported,
  });
  assert.equal(unsupportedResponse.status, 400);

  const oversized = new FormData();
  oversized.set("title", "Oversized photo report");
  oversized.set("description", "A pothole near the library needs a repair.");
  oversized.set("locationLabel", "5 Library Road, Central Ward");
  oversized.set("latitude", "28.61");
  oversized.set("longitude", "77.21");
  oversized.set("severity", "low");
  oversized.set("photo", new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], { type: "image/jpeg" }), "large.jpg");

  const oversizedResponse = await fetch(`${baseUrl}/api/reports`, {
    method: "POST",
    headers: { authorization: `Bearer ${citizenToken}` },
    body: oversized,
  });
  assert.equal(oversizedResponse.status, 413);
});
