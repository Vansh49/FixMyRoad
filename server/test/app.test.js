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
  const app = createApp({
    store: await createStore(),
    secret,
    uploadDirectory,
    reverseGeocode: async () => ({
      locationLabel: "Verified address, Sector 17, Chandigarh, India",
    }),
  });
  server = createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  const [citizenResponse, officerResponse] = await Promise.all([
    fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "citizen@civic.local",
        password: "Citizen123!",
      }),
    }),
    fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "officer@civic.local",
        password: "Officer123!",
      }),
    }),
  ]);
  citizenToken = (await citizenResponse.json()).token;
  officerToken = (await officerResponse.json()).token;
});

after(async () => {
  if (server)
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  if (uploadDirectory)
    await rm(uploadDirectory, { recursive: true, force: true });
});

test("health check is public and reports API status", async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok" });
});

test("city boundary is public and address lookup requires an authorized citizen", async () => {
  const boundaryResponse = await fetch(`${baseUrl}/api/location/boundary`);
  assert.equal(boundaryResponse.status, 200);
  assert.equal(
    (await boundaryResponse.json()).features[0].properties.name,
    "Chandigarh",
  );

  const unauthorized = await fetch(
    `${baseUrl}/api/location/reverse?latitude=30.7339&longitude=76.7794`,
  );
  assert.equal(unauthorized.status, 401);

  const addressResponse = await fetch(
    `${baseUrl}/api/location/reverse?latitude=30.7339&longitude=76.7794`,
    { headers: { authorization: `Bearer ${citizenToken}` } },
  );
  assert.equal(addressResponse.status, 200);
  assert.equal(
    (await addressResponse.json()).locationLabel,
    "Verified address, Sector 17, Chandigarh, India",
  );

  const outsideResponse = await fetch(
    `${baseUrl}/api/location/reverse?latitude=28.61&longitude=77.21`,
    { headers: { authorization: `Bearer ${citizenToken}` } },
  );
  assert.equal(outsideResponse.status, 422);
});

test("citizen can create a report and retrieve it", async () => {
  const response = await fetch(`${baseUrl}/api/reports`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${citizenToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      title: "Broken road near the library",
      description: "A large pothole is causing vehicles to slow down suddenly.",
      locationLabel: "A forged address supplied by the browser",
      latitude: 30.7339,
      longitude: 76.7794,
      severity: "high",
    }),
  });
  assert.equal(response.status, 201);
  const { report } = await response.json();
  createdReportId = report.id;
  assert.equal(report.status, "submitted");
  assert.equal(report.history.length, 1);
  assert.equal(
    report.locationLabel,
    "Verified address, Sector 17, Chandigarh, India",
  );

  const detailResponse = await fetch(
    `${baseUrl}/api/reports/${createdReportId}`,
    {
      headers: { authorization: `Bearer ${citizenToken}` },
    },
  );
  assert.equal(detailResponse.status, 200);
  assert.equal((await detailResponse.json()).report.id, createdReportId);
});

test("citizen cannot change status and officer can advance report status", async () => {
  const forbidden = await fetch(`${baseUrl}/api/reports/report-1002/status`, {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${citizenToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ status: "in_progress" }),
  });
  assert.equal(forbidden.status, 403);

  const response = await fetch(`${baseUrl}/api/reports/report-1002/status`, {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${officerToken}`,
      "content-type": "application/json",
    },
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
    headers: {
      authorization: `Bearer ${citizenToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ title: "Bad", latitude: 120 }),
  });
  assert.equal(invalid.status, 400);
});

test("report creation rejects coordinates outside Chandigarh", async () => {
  const response = await fetch(`${baseUrl}/api/reports`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${citizenToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      title: "Road damage outside Chandigarh",
      description:
        "A damaged road needs to be checked by the maintenance team.",
      locationLabel: "Chandigarh",
      latitude: 28.61,
      longitude: 77.21,
      severity: "medium",
    }),
  });
  assert.equal(response.status, 422);
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
  formData.set(
    "description",
    "A pothole by the library entrance needs a repair.",
  );
  formData.set("locationLabel", "Browser-provided address is ignored");
  formData.set("latitude", "30.7339");
  formData.set("longitude", "76.7794");
  formData.set("severity", "medium");
  formData.set(
    "photo",
    new Blob([Uint8Array.from([0xff, 0xd8, 0xff, 0xd9])], {
      type: "image/jpeg",
    }),
    "road.jpg",
  );

  const response = await fetch(`${baseUrl}/api/reports`, {
    method: "POST",
    headers: { authorization: `Bearer ${citizenToken}` },
    body: formData,
  });
  assert.equal(response.status, 201);
  const { report } = await response.json();
  assert.match(report.imageUrl, /^\/uploads\/[0-9a-f-]+\.jpg$/);
  assert.equal(report.latitude, 30.7339);
  assert.equal(report.longitude, 76.7794);
  assert.equal(
    report.locationLabel,
    "Verified address, Sector 17, Chandigarh, India",
  );

  const imageResponse = await fetch(`${baseUrl}${report.imageUrl}`);
  assert.equal(imageResponse.status, 200);
  assert.equal(imageResponse.headers.get("content-type"), "image/jpeg");
  assert.deepEqual(
    Buffer.from(await imageResponse.arrayBuffer()),
    Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
  );
});

test("report upload rejects non-image files and oversized images", async () => {
  const unsupported = new FormData();
  unsupported.set("title", "Text file report");
  unsupported.set("description", "A pothole near the library needs a repair.");
  unsupported.set("locationLabel", "Sector 17, Chandigarh");
  unsupported.set("latitude", "30.7339");
  unsupported.set("longitude", "76.7794");
  unsupported.set("severity", "low");
  unsupported.set(
    "photo",
    new Blob(["not an image"], { type: "text/plain" }),
    "notes.txt",
  );

  const unsupportedResponse = await fetch(`${baseUrl}/api/reports`, {
    method: "POST",
    headers: { authorization: `Bearer ${citizenToken}` },
    body: unsupported,
  });
  assert.equal(unsupportedResponse.status, 400);

  const oversized = new FormData();
  oversized.set("title", "Oversized photo report");
  oversized.set("description", "A pothole near the library needs a repair.");
  oversized.set("locationLabel", "Sector 17, Chandigarh");
  oversized.set("latitude", "30.7339");
  oversized.set("longitude", "76.7794");
  oversized.set("severity", "low");
  oversized.set(
    "photo",
    new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], { type: "image/jpeg" }),
    "large.jpg",
  );

  const oversizedResponse = await fetch(`${baseUrl}/api/reports`, {
    method: "POST",
    headers: { authorization: `Bearer ${citizenToken}` },
    body: oversized,
  });
  assert.equal(oversizedResponse.status, 413);
});
