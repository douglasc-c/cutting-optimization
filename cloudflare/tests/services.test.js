import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { hashPassword } from "../accounts/src/passwords.js";
import { createAccountsHandler } from "../accounts/src/index.js";
const PASSWORD = "uma senha longa para os testes";
const policy = {
  LATEST_VERSION: "0.2.1",
  MINIMUM_VERSION: "0.2.0",
  RELEASE_URL:
    "https://github.com/douglasc-c/cutting-optimization/releases/latest",
};
function fixture(report) {
  const db = new DatabaseSync(":memory:");
  db.exec(
    readFileSync(
      new URL("../accounts/migrations/0001_accounts.sql", import.meta.url),
      "utf8",
    ),
  );
  db.exec(
    readFileSync(
      new URL("../accounts/migrations/0002_admin.sql", import.meta.url),
      "utf8",
    ),
  );
  db.exec(
    readFileSync(
      new URL("../accounts/migrations/0003_passwords.sql", import.meta.url),
      "utf8",
    ),
  );
  const prepare = (sql) => {
    let args = [];
    return {
      bind(...values) {
        args = values;
        return this;
      },
      async first() {
        return db.prepare(sql).get(...args) || null;
      },
      async all() {
        return { results: db.prepare(sql).all(...args) };
      },
      async run() {
        const statement = db.prepare(sql);
        return statement.columns().length
          ? { results: statement.all(...args) }
          : statement.run(...args);
      },
    };
  };
  const env = {
    ADMIN_PASSWORD: PASSWORD,
    DB: {
      prepare,
      async batch(statements) {
        db.exec("BEGIN");
        try {
          const result = [];
          for (const s of statements) result.push(await s.run());
          db.exec("COMMIT");
          return result;
        } catch (e) {
          db.exec("ROLLBACK");
          throw e;
        }
      },
    },
    ...policy,
  };
  const handler = createAccountsHandler(report);
  async function call(
    route,
    { data, token, cookie, headers = {}, version = "0.2.0", method } = {},
  ) {
    const response = await handler(
      new Request(`https://accounts.example${route}`, {
        method: method || (data ? "POST" : "GET"),
        headers: {
          "Content-Type": "application/json",
          "CF-Connecting-IP": "127.0.0.2",
          "X-App-Version": version,
          "X-App-Platform": "win32",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(cookie ? { Cookie: cookie } : {}),
          ...headers,
        },
        ...(data ? { body: JSON.stringify(data) } : {}),
      }),
      env,
    );
    return {
      status: response.status,
      data: await response.json(),
      cookie: response.headers.get("set-cookie"),
    };
  }
  async function login(client = "desktop", email = "user@example.com") {
    if (!db.prepare("SELECT id FROM users WHERE email=?").get(email)) {
      if ((env.ADMIN_EMAILS || "").toLowerCase().includes(email)) {
        db.prepare(
          "INSERT INTO users(id,email,name,created_at,password_hash) VALUES(?,?,?,?,?)",
        ).run(
          crypto.randomUUID(),
          email,
          "Douglas",
          Date.now(),
          await hashPassword(PASSWORD),
        );
      } else {
        const registered = await call("/api/auth/register", {
          data: { email, password: PASSWORD, name: "Douglas", client },
        });
        assert.equal(registered.status, 201);
      }
    }
    return call("/api/auth/login", {
      data: {
        email,
        password: PASSWORD,
        client,
        deviceId: "12345678-1234-1234-1234-123456789012",
      },
    });
  }
  return { db, env, call, login };
}
test("verified account, private hashed sessions and minimum-version enforcement", async () => {
  const f = fixture();
  try {
    const login = await f.login();
    assert.equal(login.status, 200);
    assert.equal(login.data.user.email, "user@example.com");
    assert.equal(
      f.db
        .prepare("SELECT token_hash FROM sessions")
        .get()
        .token_hash.includes(login.data.token),
      false,
    );
    const valid = await f.call("/api/session", { token: login.data.token });
    assert.equal(valid.data.allowed, true);
    assert.equal(valid.data.policy.updateAvailable, true);
    const old = await f.call("/api/session", {
      token: login.data.token,
      version: "0.1.0",
    });
    assert.equal(old.data.allowed, false);
    assert.equal(old.data.policy.updateRequired, true);
    f.db.prepare("UPDATE users SET status='blocked'").run();
    assert.equal(
      (await f.call("/api/session", { token: login.data.token })).status,
      403,
    );
  } finally {
    f.db.close();
  }
});
test("browser session is HttpOnly, logout revokes it and cross-origin calls are rejected", async () => {
  const f = fixture();
  try {
    const login = await f.login("browser");
    assert.equal(login.data.token, undefined);
    assert.match(login.cookie, /HttpOnly/);
    assert.match(login.cookie, /Secure/);
    assert.match(login.cookie, /SameSite=Strict/);
    const cookie = login.cookie.split(";")[0];
    assert.equal((await f.call("/api/session", { cookie })).status, 200);
    assert.equal(
      (
        await f.call("/api/auth/logout", {
          cookie,
          data: {},
          headers: { Origin: "https://evil.example" },
        })
      ).status,
      403,
    );
    assert.equal(
      (await f.call("/api/auth/logout", { cookie, data: {} })).status,
      200,
    );
    assert.equal((await f.call("/api/session", { cookie })).status, 401);
  } finally {
    f.db.close();
  }
});
test("unified version endpoint compares versions and fails closed on invalid policy", async () => {
  const f = fixture();
  try {
    async function check(version, env = policy) {
      Object.assign(f.env, env);
      return f.call(`/api/version?version=${encodeURIComponent(version)}`);
    }
    assert.equal((await check("0.10.0")).data.updateRequired, false);
    assert.equal((await check("0.1.9")).data.updateRequired, true);
    assert.equal((await check("0.2.0")).data.updateAvailable, true);
    assert.equal((await check("1.0.0-beta")).status, 400);
    assert.equal(
      (await check("0.2.0", { ...policy, MINIMUM_VERSION: "2.0.0" })).status,
      503,
    );
    assert.equal(
      (
        await check("0.2.0", {
          ...policy,
          RELEASE_URL: "http://invalid.example",
        })
      ).status,
      503,
    );
    assert.equal(
      (await check("0.2.0", { ...policy, LATEST_VERSION: undefined })).status,
      503,
    );
    Object.assign(f.env, policy);
    assert.equal((await f.call("/api/version?platform=android")).status, 400);
    assert.equal((await f.call("/api/version", { data: {} })).status, 405);
    assert.equal(
      (await f.call("/api/version")).data.latestVersion,
      policy.LATEST_VERSION,
    );
    assert.deepEqual((await f.call("/api/health")).data, {
      service: "accounts",
      ok: true,
      checks: { passwordSchema: "ready", adminSetup: "ready" },
    });
  } finally {
    f.db.close();
  }
});
test("session policy is evaluated locally and rejects invalid client versions or configuration", async () => {
  const f = fixture();
  try {
    const login = await f.login();
    const token = login.data.token;
    assert.equal(f.env.VERSIONS, undefined);
    assert.equal(
      (await f.call("/api/session", { token, version: "invalid" })).status,
      400,
    );
    assert.equal(
      (await f.call("/api/session", { token, version: "" })).status,
      400,
    );
    assert.equal(
      (
        await f.call("/api/session", {
          token,
          headers: { "X-App-Platform": "android" },
        })
      ).status,
      400,
    );
    f.env.MINIMUM_VERSION = "3.0.0";
    assert.equal((await f.call("/api/session", { token })).status, 503);
    f.env.MINIMUM_VERSION = "0.2.1";
    assert.equal((await f.call("/api/session", { token })).data.allowed, false);
    f.env.MINIMUM_VERSION = "0.2.0";
    assert.equal((await f.call("/api/session", { token })).data.allowed, true);
  } finally {
    f.db.close();
  }
});

test("administration requires an active browser session and exact configured email", async () => {
  const f = fixture();
  try {
    assert.equal((await f.call("/api/admin/users")).status, 401);
    const browser = await f.login("browser");
    const cookie = browser.cookie.split(";")[0];
    assert.equal((await f.call("/api/admin/users", { cookie })).status, 403);
    f.env.ADMIN_EMAILS = "other-user@example.com";
    assert.equal((await f.call("/api/admin/users", { cookie })).status, 403);
    f.env.ADMIN_EMAILS = " USER@example.com,admin@example.com ";
    assert.equal((await f.call("/api/admin/me", { cookie })).status, 200);
    assert.equal((await f.call("/api/session", { cookie })).data.isAdmin, true);
    const desktop = await f.login();
    assert.equal(
      (await f.call("/api/admin/users", { token: desktop.data.token })).status,
      403,
    );
    assert.equal(
      (await f.call("/api/session", { token: desktop.data.token })).data
        .isAdmin,
      false,
    );
    assert.equal(
      (
        await f.call("/api/admin/users", {
          cookie,
          headers: { Origin: "https://evil.example" },
        })
      ).status,
      403,
    );
    f.env.ADMIN_EMAILS = "";
    assert.equal((await f.call("/api/admin/me", { cookie })).status, 403);
    f.env.ADMIN_EMAILS = "user@example.com";
    f.db.prepare("UPDATE users SET status='blocked'").run();
    assert.equal((await f.call("/api/admin/me", { cookie })).status, 403);
  } finally {
    f.db.close();
  }
});

test("admin lists users and devices without tokens, blocks and unblocks, and audits actions", async () => {
  const f = fixture();
  try {
    f.env.ADMIN_EMAILS = "admin@example.com";
    const admin = await f.login("browser", "admin@example.com");
    const cookie = admin.cookie.split(";")[0];
    const user = await f.login();
    const id = user.data.user.id;
    const listed = await f.call("/api/admin/users?q=user%40example", {
      cookie,
    });
    assert.equal(listed.data.users.length, 1);
    assert.equal(listed.data.users[0].active_sessions, 2);
    const devices = await f.call(`/api/admin/users/${id}/sessions`, { cookie });
    assert.equal(devices.data.sessions.length, 2);
    assert.equal(devices.data.sessions[0].client, "desktop");
    assert.equal(devices.data.sessions[0].token_hash, undefined);
    assert.equal(JSON.stringify(devices.data).includes(user.data.token), false);
    assert.equal(
      (
        await f.call(`/api/admin/users/${id}/status`, {
          cookie,
          data: { status: "blocked" },
        })
      ).status,
      200,
    );
    assert.equal(
      f.db.prepare("SELECT status FROM users WHERE id=?").get(id).status,
      "blocked",
    );
    assert.equal(
      (await f.call("/api/session", { token: user.data.token })).status,
      401,
    );
    assert.equal(
      (
        await f.call(`/api/admin/users/${id}/status`, {
          cookie,
          data: { status: "active" },
        })
      ).status,
      200,
    );
    assert.equal(
      (await f.call("/api/session", { token: user.data.token })).status,
      401,
    );
    const loggedAgain = await f.login();
    assert.equal(loggedAgain.status, 200);
    assert.equal(
      (await f.call(`/api/admin/users/${id}/sessions`, { cookie, data: {} }))
        .status,
      200,
    );
    assert.equal(
      (await f.call("/api/session", { token: loggedAgain.data.token })).status,
      401,
    );
    const audit = await f.call("/api/admin/audit", { cookie });
    assert.equal(audit.data.events.length, 3);
    assert.equal(
      audit.data.events.every((e) => e.actor_email === "admin@example.com"),
      true,
    );
    assert.equal(
      audit.data.events.every((e) => e.target_email === "user@example.com"),
      true,
    );
    assert.equal(
      (
        await f.call(`/api/admin/users/${admin.data.user.id}/status`, {
          cookie,
          data: { status: "blocked" },
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await f.call(`/api/admin/users/${admin.data.user.id}/sessions`, {
          cookie,
          data: {},
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await f.call(`/api/admin/users/${id}/status`, {
          cookie,
          data: { status: "admin" },
        })
      ).status,
      400,
    );
    assert.equal(
      (await f.call(`/api/admin/users/${id}/status`, { cookie })).status,
      405,
    );
    assert.equal(
      (await f.call("/api/admin/users?page=0", { cookie })).status,
      400,
    );
    assert.equal(
      (await f.call("/api/admin/users?page=2", { cookie })).data.users.length,
      0,
    );
    assert.equal(
      (
        await f.call(
          "/api/admin/users/12345678-1234-1234-1234-123456789012/sessions",
          { cookie },
        )
      ).status,
      404,
    );
  } finally {
    f.db.close();
  }
});

test("saved version policy overrides build variables for public queries and desktop authorization", async () => {
  const f = fixture();
  try {
    f.env.ADMIN_EMAILS = "admin@example.com";
    const admin = await f.login("browser", "admin@example.com"),
      cookie = admin.cookie.split(";")[0];
    const desktop = await f.login();
    assert.equal(
      (await f.call("/api/admin/version", { cookie })).data.latestVersion,
      policy.LATEST_VERSION,
    );
    const data = {
      latestVersion: "0.3.0",
      minimumVersion: "0.3.0",
      releaseUrl: "https://example.com/releases",
    };
    assert.equal(
      (await f.call("/api/admin/version", { cookie, data, method: "PUT" }))
        .status,
      200,
    );
    const publicPolicy = await f.call(
      "/api/version?version=0.2.0&platform=win32",
    );
    assert.equal(publicPolicy.data.latestVersion, "0.3.0");
    assert.equal(publicPolicy.data.updateRequired, true);
    assert.equal(publicPolicy.data.releaseUrl, data.releaseUrl);
    assert.equal(
      (await f.call("/api/session", { token: desktop.data.token })).data
        .allowed,
      false,
    );
    Object.assign(f.env, { LATEST_VERSION: "9.0.0", MINIMUM_VERSION: "9.0.0" });
    assert.equal(
      (await f.call("/api/admin/version", { cookie })).data.latestVersion,
      "0.3.0",
    );
    assert.equal(
      (await f.call("/api/version?version=0.3.0")).data.updateRequired,
      false,
    );
    const invalid = [
      { ...data, minimumVersion: "0.4.0" },
      { ...data, latestVersion: "0.3.0-beta" },
      { ...data, releaseUrl: "javascript:alert(1)" },
      { ...data, releaseUrl: "https://secret:password@example.com" },
    ];
    for (const input of invalid)
      assert.equal(
        (
          await f.call("/api/admin/version", {
            cookie,
            data: input,
            method: "PUT",
          })
        ).status,
        400,
      );
    assert.equal(
      (await f.call("/api/admin/audit", { cookie })).data.events.length,
      1,
    );
    assert.equal((await f.call("/api/version")).data.latestVersion, "0.3.0");
    assert.equal(
      (
        await f.call("/api/admin/version", {
          data,
          method: "PUT",
          cookie,
          headers: { "Sec-Fetch-Site": "cross-site" },
        })
      ).status,
      403,
    );
  } finally {
    f.db.close();
  }
});

test("audit failure rolls back status, session revocation and version policy atomically", async () => {
  const f = fixture();
  try {
    f.env.ADMIN_EMAILS = "admin@example.com";
    const admin = await f.login("browser", "admin@example.com"),
      cookie = admin.cookie.split(";")[0];
    const user = await f.login(),
      id = user.data.user.id;
    f.db.exec(
      "CREATE TRIGGER reject_audit BEFORE INSERT ON admin_audit BEGIN SELECT RAISE(ABORT,'audit failure'); END",
    );
    assert.equal(
      (
        await f.call(`/api/admin/users/${id}/status`, {
          cookie,
          data: { status: "blocked" },
        })
      ).status,
      503,
    );
    assert.equal(
      f.db.prepare("SELECT status FROM users WHERE id=?").get(id).status,
      "active",
    );
    assert.equal(
      (await f.call("/api/session", { token: user.data.token })).status,
      200,
    );
    const data = {
      latestVersion: "0.3.0",
      minimumVersion: "0.3.0",
      releaseUrl: policy.RELEASE_URL,
    };
    assert.equal(
      (await f.call("/api/admin/version", { cookie, data, method: "PUT" }))
        .status,
      503,
    );
    assert.equal(
      (await f.call("/api/version")).data.latestVersion,
      policy.LATEST_VERSION,
    );
    assert.equal(
      f.db.prepare("SELECT COUNT(*) AS n FROM version_policy").get().n,
      0,
    );
  } finally {
    f.db.close();
  }
});

test("admin migration preserves existing users, sessions and pending login codes", () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec(
      readFileSync(
        new URL("../accounts/migrations/0001_accounts.sql", import.meta.url),
        "utf8",
      ),
    );
    db.exec(`INSERT INTO users VALUES('existing','existing@example.com','Existing','active',1);
      INSERT INTO sessions(token_hash,user_id,device_id,client,created_at,expires_at,last_seen_at) VALUES('hash','existing','device','desktop',1,9999999999999,1);
      INSERT INTO challenges(id,email,name,code_hash,expires_at) VALUES('pending','existing@example.com','Existing','code-hash',9999999999999);`);
    const before = Object.fromEntries(
      ["users", "sessions", "challenges"].map((table) => [
        table,
        db.prepare(`SELECT * FROM ${table}`).all(),
      ]),
    );
    db.exec(
      readFileSync(
        new URL("../accounts/migrations/0002_admin.sql", import.meta.url),
        "utf8",
      ),
    );
    for (const table of ["users", "sessions", "challenges"])
      assert.deepEqual(
        db.prepare(`SELECT * FROM ${table}`).all(),
        before[table],
      );
    assert.equal(
      db.prepare("SELECT COUNT(*) AS n FROM version_policy").get().n,
      0,
    );
    assert.equal(
      db.prepare("SELECT COUNT(*) AS n FROM admin_audit").get().n,
      0,
    );
  } finally {
    db.close();
  }
});

test("user pagination has stable boundaries and ordinary users cannot mutate administrative data", async () => {
  const f = fixture();
  try {
    f.env.ADMIN_EMAILS = "admin@example.com";
    const admin = await f.login("browser", "admin@example.com"),
      cookie = admin.cookie.split(";")[0];
    for (let i = 0; i < 27; i++)
      f.db
        .prepare(
          "INSERT INTO users(id,email,name,status,created_at) VALUES(?,?,?,?,?)",
        )
        .run(
          `10000000-0000-0000-0000-${String(i).padStart(12, "0")}`,
          `person${i}@example.com`,
          `Person ${i}`,
          "active",
          1,
        );
    const first = (await f.call("/api/admin/users", { cookie })).data;
    const second = (await f.call("/api/admin/users?page=2", { cookie })).data;
    assert.equal(first.users.length, 25);
    assert.equal(first.hasMore, true);
    assert.equal(second.users.length, 4);
    assert.equal(second.hasMore, false);
    assert.equal(
      new Set([...first.users, ...second.users].map((u) => u.id)).size,
      29,
    );
    const ordinary = await f.login("browser"),
      ordinaryCookie = ordinary.cookie.split(";")[0];
    assert.equal(
      (
        await f.call(`/api/admin/users/${ordinary.data.user.id}/status`, {
          cookie: ordinaryCookie,
          data: { status: "blocked" },
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await f.call("/api/admin/version", {
          cookie: ordinaryCookie,
          method: "PUT",
          data: {
            latestVersion: "99.0.0",
            minimumVersion: "99.0.0",
            releaseUrl: policy.RELEASE_URL,
          },
        })
      ).status,
      403,
    );
    assert.equal(
      f.db.prepare("SELECT COUNT(*) AS n FROM admin_audit").get().n,
      0,
    );
  } finally {
    f.db.close();
  }
});

test("registration stores salted password hashes and rejects duplicate or reserved identities", async () => {
  const f = fixture();
  try {
    const data = {
      email: " New@Example.com ",
      password: PASSWORD,
      name: "Cliente",
      client: "browser",
    };
    const created = await f.call("/api/auth/register", { data });
    assert.equal(created.status, 201);
    assert.equal(created.data.user.email, "new@example.com");
    assert.equal(created.data.token, undefined);
    const row = f.db
      .prepare("SELECT password_hash FROM users WHERE email=?")
      .get("new@example.com");
    assert.match(row.password_hash, /^pbkdf2-sha256\$600000\$/);
    assert.equal(row.password_hash.includes(PASSWORD), false);
    assert.equal((await f.call("/api/auth/register", { data })).status, 409);
    assert.equal(
      (
        await f.call("/api/auth/register", {
          data: { ...data, email: "admin@cutting.com" },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await f.call("/api/auth/register", {
          data: { ...data, email: "small@example.com", password: "short" },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await f.call("/api/auth/login", {
          data: { email: "new@example.com", password: "wrong" },
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await f.call("/api/auth/login", {
          data: { email: "absent@example.com", password: PASSWORD },
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await f.call("/api/auth/request-code", {
          data: { email: "new@example.com" },
        })
      ).status,
      410,
    );
  } finally {
    f.db.close();
  }
});
test("reserved administrator initializes only with configured password, then uses its stored hash", async () => {
  const f = fixture();
  try {
    delete f.env.ADMIN_PASSWORD;
    const data = {
      email: "admin@cutting.com",
      password: PASSWORD,
      client: "browser",
    };
    assert.equal((await f.call("/api/auth/login", { data })).status, 503);
    f.env.ADMIN_PASSWORD = PASSWORD;
    assert.equal(
      (
        await f.call("/api/auth/login", {
          data: { ...data, password: "a different long password" },
        })
      ).status,
      401,
    );
    assert.equal(
      f.db
        .prepare(
          "SELECT password_hash FROM users WHERE email='admin@cutting.com'",
        )
        .get().password_hash,
      null,
    );
    const admin = await f.call("/api/auth/login", { data });
    assert.equal(admin.status, 200);
    assert.equal(admin.data.isAdmin, true);
    delete f.env.ADMIN_PASSWORD;
    assert.equal((await f.call("/api/auth/login", { data })).status, 200);
    const cookie = admin.cookie.split(";")[0];
    assert.equal(
      (await f.call("/api/admin/me", { cookie })).data.email,
      "admin@cutting.com",
    );
  } finally {
    f.db.close();
  }
});
test("password change requires current password and revokes other sessions", async () => {
  const f = fixture();
  try {
    const browser = await f.login("browser"),
      desktop = await f.login(),
      cookie = browser.cookie.split(";")[0];
    assert.equal(
      (
        await f.call("/api/auth/password", {
          cookie,
          data: {
            currentPassword: "wrong",
            password: "uma nova senha longa de teste",
          },
        })
      ).status,
      401,
    );
    const changed = await f.call("/api/auth/password", {
      cookie,
      data: {
        currentPassword: PASSWORD,
        password: "uma nova senha longa de teste",
      },
    });
    assert.equal(changed.status, 200);
    assert.equal(
      (await f.call("/api/session", { token: desktop.data.token })).status,
      401,
    );
    assert.equal((await f.call("/api/session", { cookie })).status, 401);
    assert.equal(
      (await f.call("/api/session", { cookie: changed.cookie.split(";")[0] }))
        .status,
      200,
    );
    assert.equal(
      (
        await f.call("/api/auth/login", {
          data: { email: "user@example.com", password: PASSWORD },
        })
      ).status,
      401,
    );
  } finally {
    f.db.close();
  }
});
test("legacy accounts cannot be taken over by registration and can define a password from an existing session", async () => {
  const f = fixture();
  try {
    const browser = await f.login("browser"),
      id = browser.data.user.id,
      cookie = browser.cookie.split(";")[0];
    f.db.prepare("UPDATE users SET password_hash=NULL WHERE id=?").run(id);
    assert.equal(
      (
        await f.call("/api/auth/register", {
          data: { email: "user@example.com", password: PASSWORD },
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await f.call("/api/auth/login", {
          data: { email: "user@example.com", password: PASSWORD },
        })
      ).status,
      401,
    );
    assert.equal(
      (await f.call("/api/session", { cookie })).data.needsPassword,
      true,
    );
    assert.equal(
      (
        await f.call("/api/auth/password", {
          cookie,
          data: { password: PASSWORD },
        })
      ).status,
      200,
    );
  } finally {
    f.db.close();
  }
});
test("admin password links are hashed, expire, cannot be replayed, and revoke existing sessions", async () => {
  const f = fixture();
  try {
    const admin = await f.login("browser", "admin@cutting.com"),
      cookie = admin.cookie.split(";")[0];
    const user = await f.login(),
      id = user.data.user.id;
    const link = await f.call(`/api/admin/users/${id}/password-reset`, {
      cookie,
      data: {},
    });
    assert.equal(link.status, 200);
    const token = new URL(link.data.resetUrl).hash.slice(7);
    assert.match(token, /^[a-f0-9]{64}$/);
    assert.equal(
      f.db
        .prepare("SELECT token_hash FROM password_resets")
        .get()
        .token_hash.includes(token),
      false,
    );
    assert.equal(
      (
        await f.call(`/api/admin/users/${admin.data.user.id}/password-reset`, {
          cookie,
          data: {},
        })
      ).status,
      409,
    );
    f.db.prepare("UPDATE password_resets SET expires_at=0").run();
    assert.equal(
      (
        await f.call("/api/auth/reset-password", {
          data: { token, password: PASSWORD },
        })
      ).status,
      400,
    );
    const next = await f.call(`/api/admin/users/${id}/password-reset`, {
        cookie,
        data: {},
      }),
      newToken = new URL(next.data.resetUrl).hash.slice(7);
    const replies = await Promise.all([
      f.call("/api/auth/reset-password", {
        data: { token: newToken, password: "uma nova senha longa de teste" },
      }),
      f.call("/api/auth/reset-password", {
        data: { token: newToken, password: "uma nova senha longa de teste" },
      }),
    ]);
    assert.deepEqual(replies.map((r) => r.status).sort(), [200, 400]);
    assert.equal(
      (await f.call("/api/session", { token: user.data.token })).status,
      401,
    );
    assert.equal(
      (
        await f.call("/api/auth/login", {
          data: {
            email: "user@example.com",
            password: "uma nova senha longa de teste",
          },
        })
      ).status,
      200,
    );
    assert.equal(
      JSON.stringify(
        (await f.call("/api/admin/audit", { cookie })).data,
      ).includes(newToken),
      false,
    );
  } finally {
    f.db.close();
  }
});

test("reset transaction failure preserves the link and active sessions for a safe retry", async () => {
  const f = fixture();
  try {
    const admin = await f.login("browser", "admin@cutting.com"),
      cookie = admin.cookie.split(";")[0],
      user = await f.login();
    const link = await f.call(
        `/api/admin/users/${user.data.user.id}/password-reset`,
        { cookie, data: {} },
      ),
      token = new URL(link.data.resetUrl).hash.slice(7);
    f.db.exec(
      "CREATE TRIGGER reject_password BEFORE UPDATE OF password_hash ON users BEGIN SELECT RAISE(ABORT,'fail'); END",
    );
    assert.equal(
      (
        await f.call("/api/auth/reset-password", {
          data: { token, password: PASSWORD },
        })
      ).status,
      503,
    );
    assert.equal(
      f.db.prepare("SELECT used_at FROM password_resets").get().used_at,
      null,
    );
    assert.equal(
      (await f.call("/api/session", { token: user.data.token })).status,
      200,
    );
    f.db.exec("DROP TRIGGER reject_password");
    assert.equal(
      (
        await f.call("/api/auth/reset-password", {
          data: { token, password: PASSWORD },
        })
      ).status,
      200,
    );
  } finally {
    f.db.close();
  }
});
test("login throttling and password migration retain existing identities and ordinary sessions", async () => {
  const f = fixture();
  try {
    for (let i = 0; i < 10; i++)
      assert.equal(
        (
          await f.call("/api/auth/login", {
            data: { email: "nobody@example.com", password: "wrong" },
          })
        ).status,
        401,
      );
    assert.equal(
      (
        await f.call("/api/auth/login", {
          data: { email: "nobody@example.com", password: "wrong" },
        })
      ).status,
      429,
    );
  } finally {
    f.db.close();
  }
  const db = new DatabaseSync(":memory:");
  try {
    for (const name of ["0001_accounts.sql", "0002_admin.sql"])
      db.exec(
        readFileSync(
          new URL(`../accounts/migrations/${name}`, import.meta.url),
          "utf8",
        ),
      );
    db.exec(
      "INSERT INTO users VALUES('legacy','old@example.com','Old','active',1); INSERT INTO sessions(token_hash,user_id,device_id,client,created_at,expires_at,last_seen_at) VALUES('token','legacy','device','browser',1,9999999999999,1)",
    );
    db.exec(
      readFileSync(
        new URL("../accounts/migrations/0003_passwords.sql", import.meta.url),
        "utf8",
      ),
    );
    assert.equal(
      db.prepare("SELECT password_hash FROM users WHERE id='legacy'").get()
        .password_hash,
      null,
    );
    assert.equal(
      db
        .prepare("SELECT COUNT(*) AS n FROM sessions WHERE user_id='legacy'")
        .get().n,
      1,
    );
    assert.equal(
      db
        .prepare(
          "SELECT password_hash FROM users WHERE email='admin@cutting.com'",
        )
        .get().password_hash,
      null,
    );
  } finally {
    db.close();
  }
});

test("eight-character passwords work for signup, admin initialization, change and reset", async () => {
  const f = fixture();
  try {
    f.env.ADMIN_PASSWORD = "Admin123";
    const admin = await f.call("/api/auth/login", {
      data: {
        email: "admin@cutting.com",
        password: "Admin123",
        client: "browser",
      },
    });
    assert.equal(admin.status, 200);
    const adminCookie = admin.cookie.split(";")[0];
    const user = await f.call("/api/auth/register", {
      data: {
        email: "eight@example.com",
        password: "User1234",
        client: "browser",
      },
    });
    assert.equal(user.status, 201);
    assert.equal(
      (
        await f.call("/api/auth/register", {
          data: { email: "short@example.com", password: "1234567" },
        })
      ).status,
      400,
    );
    const cookie = user.cookie.split(";")[0];
    assert.equal(
      (
        await f.call("/api/auth/password", {
          cookie,
          data: { currentPassword: "User1234", password: "1234567" },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await f.call("/api/auth/password", {
          cookie,
          data: { currentPassword: "User1234", password: "Next1234" },
        })
      ).status,
      200,
    );
    const link = await f.call(
      `/api/admin/users/${user.data.user.id}/password-reset`,
      { cookie: adminCookie, data: {} },
    );
    const token = new URL(link.data.resetUrl).hash.slice(7);
    assert.equal(
      (
        await f.call("/api/auth/reset-password", {
          data: { token, password: "1234567" },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await f.call("/api/auth/reset-password", {
          data: { token, password: "Last1234" },
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await f.call("/api/auth/login", {
          data: { email: "eight@example.com", password: "Last1234" },
        })
      ).status,
      200,
    );
  } finally {
    f.db.close();
  }
});

test("readiness and authentication identify missing schema without exposing SQL or credentials", async () => {
  const events = [],
    f = fixture((event) => events.push(event));
  try {
    f.db.exec("ALTER TABLE users DROP COLUMN password_hash");
    const health = await f.call("/api/health");
    assert.equal(health.status, 503);
    assert.equal(health.data.reason, "MIGRATIONS_PENDING");
    const registered = await f.call("/api/auth/register", {
      data: { email: "private@example.com", password: PASSWORD },
    });
    assert.equal(registered.status, 503);
    assert.equal(
      registered.data.error,
      "Serviço indisponível. Tente novamente.",
    );
    assert.equal(events.at(-1).stage, "create_user_database");
    assert.equal(events.at(-1).reason, "MIGRATIONS_PENDING");
    assert.equal(JSON.stringify(events).includes("private@example.com"), false);
    assert.equal(JSON.stringify(events).includes(PASSWORD), false);
    assert.equal(JSON.stringify(events).includes("INSERT INTO"), false);
  } finally {
    f.db.close();
  }
});
test("readiness distinguishes absent D1 binding and an unconfigured administrator", async () => {
  const events = [],
    f = fixture((event) => events.push(event));
  try {
    delete f.env.ADMIN_PASSWORD;
    const ready = await f.call("/api/health");
    assert.equal(ready.status, 200);
    assert.equal(ready.data.checks.adminSetup, "required");
    assert.equal(
      (
        await f.call("/api/auth/login", {
          data: { email: "admin@cutting.com", password: PASSWORD },
        })
      ).status,
      503,
    );
    assert.equal(events.at(-1).reason, "ADMIN_PASSWORD_NOT_CONFIGURED");
    delete f.env.DB;
    const health = await f.call("/api/health");
    assert.equal(health.status, 503);
    assert.equal(health.data.reason, "DB_BINDING_MISSING");
    assert.equal(
      (
        await f.call("/api/auth/register", {
          data: { email: "user@example.com", password: PASSWORD },
        })
      ).status,
      503,
    );
    assert.equal(events.at(-1).reason, "DATABASE_ERROR");
  } finally {
    f.db.close();
  }
});
