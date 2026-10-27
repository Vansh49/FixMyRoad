# FixMyRoad

A civic road reporting app. Citizens can report potholes and track repair updates; officers can review reports, update their status, and see a small operations dashboard.

## Stack

- React, Vite, React Router
- Node.js and Express
- In-memory repositories for evaluation data (no database required yet)
- bcrypt password hashing and signed JWT authentication

The repository interface is isolated in `server/src/data/store.js`. When PostgreSQL is introduced, replace this implementation with a PostgreSQL-backed repository and keep the HTTP API and React client stable. The report data shape is already relational-friendly: users own reports, and each report has timestamped status-history entries. Uploaded photos are saved as local files under `server/uploads`; the report record stores only the image URL.

## Run locally

Requirements: Node.js 20 or newer and npm.

```sh
npm install
npm run dev
```

The Vite client runs at <http://localhost:5173> and proxies `/api` requests to the Express API at <http://localhost:4000>. To configure the API, copy `.env.example` to `.env` and set a random `JWT_SECRET` with at least 24 characters. For local development only, the server has a development fallback secret; production startup requires an explicitly configured secret.

For a production-style frontend build, run `npm run build`. Run API tests with `npm test`.

## Demo accounts

| Role    | Email                 | Password      |
| ------- | --------------------- | ------------- |
| Citizen | `citizen@civic.local` | `Citizen123!` |
| Officer | `officer@civic.local` | `Officer123!` |

These accounts and their sample reports are local demo data. Registering an account or changing reports updates the in-memory store only; restarting the API restores the original demo data.

## Included workflow

- Citizens can register or sign in, view their reports, submit a report with a description, address, map-selected coordinates, optional photo, and severity, and view status history.
- Officers can review all reports, search and filter the queue, see aggregate counts, and move reports through `submitted` → `in_progress` → `resolved`.
- The API enforces authenticated access, citizen ownership, and officer-only status changes. Registration always creates a citizen account.
- The report form uses Leaflet with OpenStreetMap tiles and the Chandigarh administrative boundary from OpenStreetMap relation 1942809. The boundary is shared by the client and server; out-of-boundary map clicks and pin drags are rejected, and the API independently validates report coordinates.
- Citizens select locations only on the map. A read-only address is filled using the server-side reverse-geocoding endpoint and saved with the selected coordinates; client-provided address text is never trusted.
- Reverse geocoding uses Nominatim by default (`GEOCODER_BASE_URL` can select another compatible endpoint), identifies the app with a custom User-Agent, and caches results and serializes requests at least 1.1 seconds apart to comply with Nominatim's public service policy. OpenStreetMap contributors are credited on the map and in the boundary GeoJSON. The boundary data is available under ODbL 1.0.
- Report photos support JPEG, PNG, and WebP up to 5 MB. Files are checked, stored locally, and served from `/uploads`; generated filenames are used instead of client-provided paths.

## Frontend structure

- `client/src/App.jsx` defines routes, role-based page selection, and global toast state.
- `client/src/components/AppLayout.jsx` contains the authenticated application shell and navigation.
- `client/src/components/ReportUi.jsx` provides reusable report cards, status badges, and loading/error/empty states.
- `client/src/pages/` contains the authentication, dashboard, report-list, report-form, and report-detail screens.
- `client/src/hooks/useReports.js` loads the signed-in user's report collection.
- `client/src/utils/reports.js` contains shared report labels and date formatting.
- Public visitors land on a home page with a login link; the Contact Us page lists the project email and phone number.

## API overview

| Method  | Endpoint                                           | Access                                                  |
| ------- | -------------------------------------------------- | ------------------------------------------------------- |
| `GET`   | `/api/health`                                      | Public                                                  |
| `GET`   | `/api/location/boundary`                           | Public                                                  |
| `GET`   | `/api/location/reverse?latitude=...&longitude=...` | Citizen                                                 |
| `POST`  | `/api/auth/register`                               | Public                                                  |
| `POST`  | `/api/auth/login`                                  | Public                                                  |
| `GET`   | `/api/auth/me`                                     | Signed in                                               |
| `GET`   | `/api/reports`                                     | Signed in; citizens see their reports, officers see all |
| `POST`  | `/api/reports`                                     | Citizen                                                 |
| `GET`   | `/api/reports/:id`                                 | Owner or officer                                        |
| `PATCH` | `/api/reports/:id/status`                          | Officer                                                 |
| `GET`   | `/api/dashboard`                                   | Officer                                                 |

Protected requests use `Authorization: Bearer <token>`. Report list supports optional `status` and `q` query parameters. Submit reports as `multipart/form-data` with the report fields and an optional `photo` file.

## Evaluation demo

1. Sign in as the citizen and review the seeded report list.
2. Submit a report and open its detail page.
3. Sign in as the officer and find the new report in the queue.
4. Start work, then resolve it; the status history records both transitions.
5. Sign back in as the citizen to verify the status update.

Uploaded photos and the in-memory report records are intended for local evaluation only. Photo files are not automatically removed when the in-memory store resets; use a dedicated object-storage service when deploying and PostgreSQL for persistent report metadata.
A full-stack road maintenance and pothole reporting platform that enables citizens to report road damage and helps government authorities manage complaints, track repairs, and monitor road conditions through a centralized dashboard.
