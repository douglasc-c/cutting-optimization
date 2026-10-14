import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { createAccountsHandler } from "../accounts/src/index.js";
import versions from "../versions/src/index.js";
const policy = {
  LATEST_VERSION: "0.2.1",
  MINIMUM_VERSION: "0.2.0",
  RELEASE_URL:
    "https://github.com/douglasc-c/cutting-optimization/releases/latest",
};
function fixture() {
  const db = new DatabaseSync(":memory:");
  db.exec(
    readFileSync(
      new URL("../accounts/migrations/0001_accounts.sql", import.meta.url),
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
    VERSIONS: { fetch: (r) => versions.fetch(r, policy) },
  };
  const handler = createAccountsHandler(async (_env, email, code) =>
    outbox.push({ email, code }),
  );
  async function call(
    route,
    { data, token, cookie, headers = {}, version = "0.2.0" } = {},
  ) {
    const response = await handler(
      new Request(`https://accounts.example${route}`, {
        method: data ? "POST" : "GET",
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
  async function login(client = "desktop") {
    const sent = await call("/api/auth/request-code", {
      data: { email: "user@example.com", name: "Douglas" },
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
test("version service compares numeric versions, rejects invalid input and fails closed on bad configuration", async () => {
  async function check(version, env = policy) {
    const r = await versions.fetch(
      new Request(
        `https://versions.example/api/version?version=${encodeURIComponent(version)}`,
      ),
      env,
    );
    return { status: r.status, data: await r.json() };
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
    (await check("0.2.0", { ...policy, RELEASE_URL: "http://invalid.example" }))
      .status,
    503,
  );
});
