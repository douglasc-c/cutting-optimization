import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { createAccountsHandler, sendEmail } from "../accounts/src/index.js";
const policy = {
  LATEST_VERSION: "0.2.1",
  MINIMUM_VERSION: "0.2.0",
  RELEASE_URL:
    "https://github.com/douglasc-c/cutting-optimization/releases/latest",
};
function fixture({ deliver, report } = {}) {
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
        return db.prepare(sql).run(...args);
      },
    };
  };
  const outbox = [];
  const env = {
    AUTH_SECRET: "a".repeat(64),
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
  const handler = createAccountsHandler(
    deliver || (async (_env, email, code) => outbox.push({ email, code })),
    report,
  );
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
    const sent = await call("/api/auth/request-code", {
      data: { email, name: "Douglas" },
    });
    assert.equal(sent.status, 200);
    return call("/api/auth/verify-code", {
      data: {
        challengeId: sent.data.challengeId,
        code: outbox.at(-1).code,
        client,
        deviceId: "12345678-1234-1234-1234-123456789012",
      },
    });
  }
  return { db, env, call, login, outbox };
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
test("one-time code cannot be replayed, guessed indefinitely or read from responses", async () => {
  const f = fixture();
  try {
    const sent = await f.call("/api/auth/request-code", {
      data: { email: "user@example.com" },
    });
    assert.equal(sent.data.code, undefined);
    const payload = {
      challengeId: sent.data.challengeId,
      code: f.outbox[0].code,
      client: "desktop",
    };
    assert.equal(
      (await f.call("/api/auth/verify-code", { data: payload })).status,
      200,
    );
    assert.equal(
      (await f.call("/api/auth/verify-code", { data: payload })).status,
      401,
    );
    const next = await f.call("/api/auth/request-code", {
      data: { email: "user@example.com" },
    });
    const right = f.outbox.at(-1).code,
      wrong = right === "00000000" ? "11111111" : "00000000";
    for (let i = 0; i < 5; i++)
      assert.equal(
        (
          await f.call("/api/auth/verify-code", {
            data: { challengeId: next.data.challengeId, code: wrong },
          })
        ).status,
        401,
      );
    assert.equal(
      (
        await f.call("/api/auth/verify-code", {
          data: { challengeId: next.data.challengeId, code: right },
        })
      ).status,
      401,
    );
  } finally {
    f.db.close();
  }
});
test("expired code and concurrent consumption cannot create extra sessions", async () => {
  const f = fixture();
  try {
    const sent = await f.call("/api/auth/request-code", {
      data: { email: "user@example.com" },
    });
    f.db.prepare("UPDATE challenges SET expires_at=0").run();
    assert.equal(
      (
        await f.call("/api/auth/verify-code", {
          data: { challengeId: sent.data.challengeId, code: f.outbox[0].code },
        })
      ).status,
      401,
    );
    const next = await f.call("/api/auth/request-code", {
      data: { email: "user@example.com" },
    });
    const data = {
      challengeId: next.data.challengeId,
      code: f.outbox.at(-1).code,
      client: "desktop",
    };
    const replies = await Promise.all([
      f.call("/api/auth/verify-code", { data }),
      f.call("/api/auth/verify-code", { data }),
    ]);
    assert.deepEqual(replies.map((r) => r.status).sort(), [200, 401]);
    assert.equal(f.db.prepare("SELECT count(*) AS n FROM sessions").get().n, 1);
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
test("email send rate limit and invalid payloads", async () => {
  const f = fixture();
  try {
    for (let i = 0; i < 3; i++)
      assert.equal(
        (
          await f.call("/api/auth/request-code", {
            data: { email: "user@example.com" },
          })
        ).status,
        200,
      );
    assert.equal(
      (
        await f.call("/api/auth/request-code", {
          data: { email: "user@example.com" },
        })
      ).status,
      429,
    );
    assert.equal(
      (await f.call("/api/auth/request-code", { data: { email: "invalid" } }))
        .status,
      400,
    );
    assert.equal(
      (
        await f.call("/api/auth/request-code", {
          data: { email: "a@b.com", name: "x".repeat(5000) },
        })
      ).status,
      413,
    );
    assert.equal(
      (await f.call("/api/session", { token: "invalid" })).status,
      401,
    );
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
    assert.equal(listed.data.users[0].active_sessions, 1);
    const devices = await f.call(`/api/admin/users/${id}/sessions`, { cookie });
    assert.equal(devices.data.sessions.length, 1);
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
        .prepare("INSERT INTO users VALUES(?,?,?,?,?)")
        .run(
          `00000000-0000-0000-0000-${String(i).padStart(12, "0")}`,
          `person${i}@example.com`,
          `Person ${i}`,
          "active",
          1,
        );
    const first = (await f.call("/api/admin/users", { cookie })).data;
    const second = (await f.call("/api/admin/users?page=2", { cookie })).data;
    assert.equal(first.users.length, 25);
    assert.equal(first.hasMore, true);
    assert.equal(second.users.length, 3);
    assert.equal(second.hasMore, false);
    assert.equal(
      new Set([...first.users, ...second.users].map((u) => u.id)).size,
      28,
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

test("request-code diagnostics distinguish configuration and database errors without leaking details", async () => {
  const events = [],
    f = fixture({ report: (event) => events.push(event) });
  try {
    f.env.AUTH_SECRET = "short";
    assert.equal(
      (
        await f.call("/api/auth/request-code", {
          data: { email: "user@example.com" },
        })
      ).status,
      503,
    );
    assert.deepEqual(events.pop(), {
      event: "request_code_failed",
      stage: "auth_config",
      reason: "AUTH_SECRET_NOT_CONFIGURED",
    });
    f.env.AUTH_SECRET = "a".repeat(64);
    f.db.exec("DROP TABLE rate_limits");
    const response = await f.call("/api/auth/request-code", {
      data: { email: "user@example.com" },
    });
    assert.equal(response.status, 503);
    assert.deepEqual(events.pop(), {
      event: "request_code_failed",
      stage: "rate_limit_database",
      reason: "DATABASE_ERROR",
    });
    assert.equal(response.data.error, "Serviço indisponível. Tente novamente.");
  } finally {
    f.db.close();
  }
});

test("email diagnostics distinguish missing keys, provider rejection and network failure; failed codes are removed", async (t) => {
  const events = [],
    f = fixture({ deliver: sendEmail, report: (event) => events.push(event) });
  try {
    const request = () =>
      f.call("/api/auth/request-code", { data: { email: "user@example.com" } });
    assert.equal((await request()).status, 503);
    assert.equal(events.at(-1).reason, "RESEND_API_KEY_MISSING");
    f.env.RESEND_API_KEY = "re_TEST_SECRET";
    assert.equal((await request()).status, 503);
    assert.equal(events.at(-1).reason, "EMAIL_FROM_MISSING");
    f.env.EMAIL_FROM = "Cutting <onboarding@resend.dev>";
    const mock = t.mock.method(
      globalThis,
      "fetch",
      async () =>
        new Response(
          JSON.stringify({
            message:
              "sensitive provider message user@example.com re_TEST_SECRET",
          }),
          { status: 403 },
        ),
    );
    assert.equal((await request()).status, 503);
    assert.deepEqual(events.at(-1), {
      event: "request_code_failed",
      stage: "send_email",
      reason: "RESEND_REJECTED",
      providerStatus: 403,
    });
    assert.equal(
      f.db.prepare("SELECT COUNT(*) AS n FROM challenges").get().n,
      0,
    );
    f.db.exec("DELETE FROM rate_limits");
    mock.mock.mockImplementation(async () => {
      throw Error("network details containing secrets");
    });
    assert.equal((await request()).status, 503);
    assert.equal(events.at(-1).reason, "RESEND_NETWORK_ERROR");
    assert.equal(JSON.stringify(events).includes("re_TEST_SECRET"), false);
    assert.equal(JSON.stringify(events).includes("user@example.com"), false);
    assert.equal(JSON.stringify(events).includes("sensitive"), false);
    assert.equal(
      f.db.prepare("SELECT COUNT(*) AS n FROM challenges").get().n,
      0,
    );
  } finally {
    f.db.close();
  }
});
