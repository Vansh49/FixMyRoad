CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('citizen', 'officer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 4 AND 120),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 10 AND 1000),
  location_label TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  image_url TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  status TEXT NOT NULL CHECK (status IN ('submitted', 'in_progress', 'resolved')),
  reporter_id TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX reports_reporter_created_idx ON reports (reporter_id, created_at DESC);
CREATE INDEX reports_status_created_idx ON reports (status, created_at DESC);

CREATE TABLE report_status_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('submitted', 'in_progress', 'resolved')),
  note TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (report_id, status, changed_at)
);

CREATE INDEX report_status_history_report_changed_idx
  ON report_status_history (report_id, changed_at, id);
