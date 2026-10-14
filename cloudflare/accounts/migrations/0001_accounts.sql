CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'blocked')),
  created_at INTEGER NOT NULL
);
CREATE TABLE challenges (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  used_at INTEGER
);
CREATE INDEX challenges_expiry ON challenges(expires_at);
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  device_id TEXT NOT NULL,
  client TEXT NOT NULL CHECK(client IN ('desktop', 'browser')),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  app_version TEXT NOT NULL DEFAULT '',
  platform TEXT NOT NULL DEFAULT ''
);
CREATE INDEX sessions_user ON sessions(user_id);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
