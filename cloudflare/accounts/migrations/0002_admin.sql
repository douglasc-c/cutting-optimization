CREATE TABLE version_policy (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  latest_version TEXT NOT NULL,
  minimum_version TEXT NOT NULL,
  release_url TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL REFERENCES users(id)
);
CREATE TABLE admin_audit (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  target_id TEXT NOT NULL,
  details TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX admin_audit_created ON admin_audit(created_at DESC);
CREATE INDEX users_created ON users(created_at DESC, id);
