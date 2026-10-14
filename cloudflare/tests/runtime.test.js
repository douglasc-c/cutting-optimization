import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { join } from "node:path";
const require = createRequire(import.meta.url);
const { Miniflare } = require("miniflare");
const esbuild = require("esbuild");
const fs = require("node:fs"),
  assert = require("node:assert/strict");
test(
  "password lifecycle runs in the native Worker and D1",
  { timeout: 30000 },
  async () => {
    const root = fileURLToPath(new URL("../", import.meta.url));
    const directory = fs.mkdtempSync(
      join(tmpdir(), "cutting-password-worker-"),
    );
    const bundle = join(directory, "worker.mjs");
    await esbuild.build({
      entryPoints: [root + "/accounts/src/index.js"],
      bundle: true,
      format: "esm",
      platform: "neutral",
      external: ["node:*"],
      outfile: bundle,
    });
    const env = {
      DB: { type: "d1", id: "runtime-test" },
      ADMIN_PASSWORD: { type: "text", value: "uma senha longa de teste" },
      LATEST_VERSION: { type: "text", value: "0.2.0" },
      MINIMUM_VERSION: { type: "text", value: "0.2.0" },
      RELEASE_URL: { type: "text", value: "https://example.com/releases" },
    };
    const mf = new Miniflare({
      host: "127.0.0.1",
      workers: [
        {
          config: {
            name: "accounts",
            compatibilityDate: "2026-09-01",
            compatibilityFlags: ["nodejs_compat"],
            env,
            manifest: {
              mainModule: "index.js",
              modulesRoot: directory,
              modules: {
                "index.js": {
                  type: "esm",
                  contents: fs.readFileSync(bundle, "utf8"),
                },
              },
            },
          },
        },
      ],
    });
    try {
      const db = await mf.getD1Database("DB", "accounts");
      for (const file of [
        "0001_accounts.sql",
        "0002_admin.sql",
        "0003_passwords.sql",
      ])
        for (const statement of fs
          .readFileSync(root + "/accounts/migrations/" + file, "utf8")
          .replace(/--[^\n]*/g, "")
          .split(";")
          .map((s) => s.trim())
          .filter(Boolean))
          await db.prepare(statement).run();
      async function call(path, data, cookie) {
        const r = await mf.dispatchFetch("https://accounts.example" + path, {
          method: data ? "POST" : "GET",
          headers: {
            "Content-Type": "application/json",
            Origin: "https://accounts.example",
            ...(cookie ? { Cookie: cookie } : {}),
          },
          ...(data ? { body: JSON.stringify(data) } : {}),
        });
        return {
          status: r.status,
          data: await r.json(),
          cookie: r.headers.get("set-cookie")?.split(";")[0],
        };
      }
      const created = await call("/api/auth/register", {
        email: "user@example.test",
        password: "uma senha longa de teste",
        client: "desktop",
      });
      assert.equal(created.status, 201);
      const admin = await call("/api/auth/login", {
        email: "admin@cutting.com",
        password: "uma senha longa de teste",
        client: "browser",
      });
      assert.equal(admin.status, 200);
      assert.equal(admin.data.isAdmin, true);
      const link = await call(
        `/api/admin/users/${created.data.user.id}/password-reset`,
        {},
        admin.cookie,
      );
      assert.equal(link.status, 200);
      const token = new URL(link.data.resetUrl).hash.slice(7);
      const reset = await call("/api/auth/reset-password", {
        token,
        password: "uma nova senha longa de teste",
      });
      assert.equal(reset.status, 200);
      assert.equal(
        (
          await call("/api/auth/reset-password", {
            token,
            password: "uma nova senha longa de teste",
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await call("/api/auth/login", {
            email: "user@example.test",
            password: "uma nova senha longa de teste",
          })
        ).status,
        200,
      );
    } finally {
      await mf.dispose();
      fs.rmSync(directory, { recursive: true, force: true });
    }
  },
);
