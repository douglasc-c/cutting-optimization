ALTER TABLE users ADD COLUMN password_hash TEXT;
CREATE TABLE password_resets (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  created_by TEXT NOT NULL REFERENCES users(id),
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);
CREATE INDEX password_resets_expiry ON password_resets(expires_at);
-- Reserve the administrator identity without a default password.
INSERT INTO users(id,email,name,status,created_at,password_hash)
VALUES('00000000-0000-0000-0000-000000000001','admin@cutting.com','Administrador','active',CAST(strftime('%s','now') AS INTEGER)*1000,NULL)
ON CONFLICT(email) DO UPDATE SET status='active',password_hash=NULL;
DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email='admin@cutting.com');
