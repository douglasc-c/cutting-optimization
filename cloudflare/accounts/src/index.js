import { randomBytes, randomUUID, createHash } from "node:crypto";
import { HttpError, json, body, failure } from "../../shared/http.js";
import {
  getVersionPolicy,
  loadVersionConfig,
} from "../../shared/version-policy.js";
import { handleAdmin, isAdmin } from "./admin.js";
import {
  ADMIN_EMAIL,
  hashPassword,
  verifyPassword,
  validatePassword,
} from "./passwords.js";
import { failureReason, reportFailure } from "./diagnostics.js";
const SESSION_MS = 30 * 86400000;
const digest = (value) => createHash("sha256").update(value).digest("hex");
const normalizeEmail = (value) => {
  if (typeof value !== "string")
    throw new HttpError(400, "Informe um e-mail válido.");
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new HttpError(400, "Informe um e-mail válido.");
  return email;
};
async function rateLimit(env, key, limit, windowMs, now) {
  const bucket = Math.floor(now / windowMs);
  const hashed = digest(`${key}:${bucket}`);
  const row = await env.DB.prepare(
    `INSERT INTO rate_limits(key,count,expires_at) VALUES(?,1,?)
    ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count`,
  )
    .bind(hashed, (bucket + 1) * windowMs)
    .first();
  if (row.count > limit)
    throw new HttpError(429, "Muitas tentativas. Aguarde alguns minutos.");
}
function cookie(request, token, maxAge) {
  const local = ["localhost", "127.0.0.1"].includes(
    new URL(request.url).hostname,
  );
  return `cutting_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${local ? "" : "; Secure"}`;
}
function sessionToken(request) {
  const auth = request.headers.get("authorization");
  if (auth) return auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return (
    request.headers
      .get("cookie")
      ?.match(/(?:^|;\s*)cutting_session=([a-f0-9]{64})(?:;|$)/)?.[1] || ""
  );
}
async function session(request, env, now) {
  const token = sessionToken(request);
  if (!/^[a-f0-9]{64}$/.test(token))
    throw new HttpError(401, "Entre na sua conta para continuar.");
  const row = await env.DB.prepare(
    `SELECT s.*,u.email,u.name,u.status FROM sessions s
    JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?`,
  )
    .bind(digest(token), now)
    .first();
  if (!row) throw new HttpError(401, "Sua sessão expirou. Entre novamente.");
  if (row.status !== "active")
    throw new HttpError(
      403,
      "Esta conta está bloqueada. Entre em contato com o suporte.",
    );
  return row;
}
async function issueSession(request, env, user, data, now, status = 200) {
  const client = data.client === "desktop" ? "desktop" : "browser";
  const deviceId =
    typeof data.deviceId === "string" && /^[a-f0-9-]{36}$/.test(data.deviceId)
      ? data.deviceId
      : randomUUID();
  const token = randomBytes(32).toString("hex");
  await env.DB.batch([
    env.DB.prepare(
      "DELETE FROM sessions WHERE user_id=? AND device_id=? AND client=?",
    ).bind(user.id, deviceId, client),
    env.DB.prepare(
      `INSERT INTO sessions(token_hash,user_id,device_id,client,created_at,expires_at,last_seen_at) VALUES(?,?,?,?,?,?,?)`,
    ).bind(
      digest(token),
      user.id,
      deviceId,
      client,
      now,
      now + SESSION_MS,
      now,
    ),
  ]);
  return json(
    {
      user: { id: user.id, email: user.email, name: user.name },
      expiresAt: now + SESSION_MS,
      isAdmin: client === "browser" && isAdmin(env, user.email),
      needsPassword: !user.password_hash,
      ...(client === "desktop" ? { token } : {}),
    },
    status,
    client === "browser"
      ? { "Set-Cookie": cookie(request, token, SESSION_MS / 1000) }
      : {},
  );
}
export function createAccountsHandler(
  report = (event) => console.error(JSON.stringify(event)),
) {
  return async (request, env) => {
    let stage = "request";
    const route = new URL(request.url).pathname;
    try {
      const url = new URL(request.url),
        now = Date.now();
      if (!url.pathname.startsWith("/api/")) {
        const response = await env.ASSETS.fetch(request);
        const headers = new Headers(response.headers);
        headers.set(
          "Content-Security-Policy",
          "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
        );
        headers.set("Referrer-Policy", "no-referrer");
        headers.set("X-Content-Type-Options", "nosniff");
        return new Response(response.body, {
          status: response.status,
          headers,
        });
      }
      const origin = request.headers.get("origin");
      if (
        (origin && origin !== url.origin) ||
        request.headers.get("sec-fetch-site") === "cross-site"
      )
        throw new HttpError(403, "Origem não permitida.");
      const path = url.pathname;
      if (path === "/api/health" && request.method === "GET") {
        if (!env.DB?.prepare || !env.DB?.batch) {
          reportFailure(report, {
            event: "auth_health_failed",
            reason: "DB_BINDING_MISSING",
          });
          return json(
            { service: "accounts", ok: false, reason: "DB_BINDING_MISSING" },
            503,
          );
        }
        try {
          await env.DB.batch([
            env.DB.prepare("SELECT password_hash FROM users LIMIT 0"),
            env.DB.prepare("SELECT token_hash FROM sessions LIMIT 0"),
            env.DB.prepare("SELECT key FROM rate_limits LIMIT 0"),
            env.DB.prepare("SELECT token_hash FROM password_resets LIMIT 0"),
          ]);
          const admin = await env.DB.prepare(
            "SELECT password_hash IS NOT NULL AS configured FROM users WHERE email=?",
          )
            .bind(ADMIN_EMAIL)
            .first();
          const configured =
            !!admin?.configured ||
            (typeof env.ADMIN_PASSWORD === "string" &&
              env.ADMIN_PASSWORD.length >= 8 &&
              env.ADMIN_PASSWORD.length <= 128);
          return json({
            service: "accounts",
            ok: true,
            checks: {
              passwordSchema: "ready",
              adminSetup: configured ? "ready" : "required",
            },
          });
        } catch (error) {
          const reason = failureReason(error, "health_database");
          reportFailure(report, { event: "auth_health_failed", reason });
          return json({ service: "accounts", ok: false, reason }, 503);
        }
      }
      if (path === "/api/version") {
        if (request.method !== "GET")
          throw new HttpError(405, "Método não permitido.");
        return json(
          getVersionPolicy(url.searchParams, await loadVersionConfig(env)),
        );
      }
      if (["/api/auth/request-code", "/api/auth/verify-code"].includes(path))
        throw new HttpError(
          410,
          "O acesso agora usa e-mail e senha. Atualize o aplicativo ou abra o portal.",
        );
      if (path.startsWith("/api/admin/"))
        return await handleAdmin(
          request,
          env,
          await session(request, env, now),
          now,
        );
      if (["/api/auth/register", "/api/auth/login"].includes(path)) {
        if (request.method !== "POST")
          throw new HttpError(405, "Método não permitido.");
        const data = await body(request),
          email = normalizeEmail(data.email);
        const ip = request.headers.get("cf-connecting-ip") || "local";
        stage = "rate_limit_database";
        await rateLimit(env, `credentials-ip:${ip}`, 30, 900000, now);
        await rateLimit(env, `credentials-email:${email}`, 10, 900000, now);
        if (path.endsWith("register")) {
          if (isAdmin(env, email))
            throw new HttpError(
              400,
              "Este e-mail é reservado para administração.",
            );
          validatePassword(data.password);
          stage = "lookup_user_database";
          if (
            await env.DB.prepare("SELECT id FROM users WHERE email=?")
              .bind(email)
              .first()
          )
            throw new HttpError(
              409,
              "Este e-mail já possui conta. Entre ou solicite um link de senha ao administrador.",
            );
          stage = "hash_password";
          const hash = await hashPassword(data.password);
          const name =
            typeof data.name === "string" ? data.name.trim().slice(0, 100) : "";
          stage = "create_user_database";
          const user = await env.DB.prepare(
            "INSERT INTO users(id,email,name,created_at,password_hash) VALUES(?,?,?,?,?) ON CONFLICT(email) DO NOTHING RETURNING *",
          )
            .bind(randomUUID(), email, name, now, hash)
            .first();
          if (!user)
            throw new HttpError(
              409,
              "Este e-mail já possui conta. Entre ou solicite um link de senha ao administrador.",
            );
          stage = "session_database";
          return await issueSession(request, env, user, data, now, 201);
        }
        if (
          typeof data.password !== "string" ||
          !data.password.length ||
          data.password.length > 128
        )
          throw new HttpError(401, "E-mail ou senha incorretos.");
        stage = "lookup_user_database";
        const user = await env.DB.prepare("SELECT * FROM users WHERE email=?")
          .bind(email)
          .first();
        stage = "verify_password";
        if (user?.email === ADMIN_EMAIL && !user.password_hash) {
          stage = "admin_setup";
          if (
            typeof env.ADMIN_PASSWORD !== "string" ||
            env.ADMIN_PASSWORD.length < 8 ||
            env.ADMIN_PASSWORD.length > 128
          )
            throw new HttpError(
              503,
              "O acesso administrativo ainda não foi configurado.",
            );
          stage = "hash_password";
          const initialHash = await hashPassword(env.ADMIN_PASSWORD);
          stage = "verify_password";
          if (!(await verifyPassword(data.password, initialHash)))
            throw new HttpError(401, "E-mail ou senha incorretos.");
          stage = "initialize_admin_database";
          const initialized = await env.DB.prepare(
            "UPDATE users SET password_hash=? WHERE id=? AND password_hash IS NULL RETURNING *",
          )
            .bind(initialHash, user.id)
            .first();
          if (initialized) user.password_hash = initialized.password_hash;
          else {
            const current = await env.DB.prepare(
              "SELECT password_hash FROM users WHERE id=?",
            )
              .bind(user.id)
              .first();
            if (
              !current ||
              !(await verifyPassword(data.password, current.password_hash))
            )
              throw new HttpError(401, "E-mail ou senha incorretos.");
            user.password_hash = current.password_hash;
          }
        } else if (!(await verifyPassword(data.password, user?.password_hash)))
          throw new HttpError(401, "E-mail ou senha incorretos.");
        if (user.status !== "active")
          throw new HttpError(
            403,
            "Esta conta está bloqueada. Entre em contato com o suporte.",
          );
        stage = "session_database";
        return await issueSession(request, env, user, data, now);
      }
      if (path === "/api/auth/password") {
        if (request.method !== "POST")
          throw new HttpError(405, "Método não permitido.");
        const actor = await session(request, env, now),
          data = await body(request);
        validatePassword(data.password);
        await rateLimit(
          env,
          `password-change:${actor.user_id}`,
          5,
          900000,
          now,
        );
        const user = await env.DB.prepare("SELECT * FROM users WHERE id=?")
          .bind(actor.user_id)
          .first();
        if (
          user.password_hash &&
          (typeof data.currentPassword !== "string" ||
            data.currentPassword.length > 128 ||
            !(await verifyPassword(data.currentPassword, user.password_hash)))
        )
          throw new HttpError(401, "Senha atual incorreta.");
        const hash = await hashPassword(data.password);
        await env.DB.batch([
          env.DB.prepare("UPDATE users SET password_hash=? WHERE id=?").bind(
            hash,
            user.id,
          ),
          env.DB.prepare("DELETE FROM sessions WHERE user_id=?").bind(user.id),
          env.DB.prepare("DELETE FROM password_resets WHERE user_id=?").bind(
            user.id,
          ),
        ]);
        return await issueSession(
          request,
          env,
          { ...user, password_hash: hash },
          { client: actor.client, deviceId: actor.device_id },
          now,
        );
      }
      if (path === "/api/auth/reset-password") {
        if (request.method !== "POST")
          throw new HttpError(405, "Método não permitido.");
        const data = await body(request);
        validatePassword(data.password);
        await rateLimit(
          env,
          `password-reset-ip:${request.headers.get("cf-connecting-ip") || "local"}`,
          10,
          900000,
          now,
        );
        if (
          typeof data.token !== "string" ||
          !/^[a-f0-9]{64}$/.test(data.token)
        )
          throw new HttpError(400, "Link inválido ou expirado.");
        const tokenHash = digest(data.token);
        const reset = await env.DB.prepare(
          "SELECT user_id FROM password_resets WHERE token_hash=? AND used_at IS NULL AND expires_at>?",
        )
          .bind(tokenHash, now)
          .first();
        if (!reset) throw new HttpError(400, "Link inválido ou expirado.");
        const hash = await hashPassword(data.password);
        const finishedAt = Date.now();
        const validReset =
          "SELECT user_id FROM password_resets WHERE token_hash=? AND used_at IS NULL AND expires_at>?";
        const results = await env.DB.batch([
          env.DB.prepare(
            `UPDATE users SET password_hash=? WHERE id=(${validReset})`,
          ).bind(hash, tokenHash, finishedAt),
          env.DB.prepare(
            `DELETE FROM sessions WHERE user_id=(${validReset})`,
          ).bind(tokenHash, finishedAt),
          env.DB.prepare(
            "UPDATE password_resets SET used_at=? WHERE token_hash=? AND used_at IS NULL AND expires_at>? RETURNING user_id",
          ).bind(finishedAt, tokenHash, finishedAt),
        ]);
        if (!results[2].results?.length)
          throw new HttpError(400, "Link inválido ou expirado.");
        return json({ success: true });
      }
      if (path === "/api/session" && request.method === "GET") {
        const row = await session(request, env, now),
          version = request.headers.get("x-app-version"),
          platform = request.headers.get("x-app-platform");
        if (row.client === "desktop" && !version)
          throw new HttpError(400, "Versão do aplicativo ausente.");
        const params = new URLSearchParams();
        if (version) params.set("version", version);
        if (platform) params.set("platform", platform);
        let policy;
        try {
          policy = getVersionPolicy(params, await loadVersionConfig(env));
        } catch (error) {
          throw new HttpError(
            error.status === 400 ? 400 : 503,
            "Não foi possível validar a versão do aplicativo.",
          );
        }
        await env.DB.prepare(
          "UPDATE sessions SET last_seen_at=?,app_version=?,platform=? WHERE token_hash=?",
        )
          .bind(now, version || "", platform || "", row.token_hash)
          .run();
        const user = await env.DB.prepare(
          "SELECT password_hash FROM users WHERE id=?",
        )
          .bind(row.user_id)
          .first();
        return json({
          user: { id: row.user_id, email: row.email, name: row.name },
          expiresAt: row.expires_at,
          allowed: !policy.updateRequired,
          isAdmin: row.client === "browser" && isAdmin(env, row.email),
          needsPassword: !user.password_hash,
          policy,
        });
      }
      if (path === "/api/auth/logout" && request.method === "POST") {
        const token = sessionToken(request);
        if (token)
          await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?")
            .bind(digest(token))
            .run();
        return json({ success: true }, 200, {
          "Set-Cookie": cookie(request, "", 0),
        });
      }
      throw new HttpError(404, "Rota não encontrada.");
    } catch (error) {
      if (
        ["/api/auth/login", "/api/auth/register"].includes(route) &&
        (!error.status || error.status >= 500)
      )
        reportFailure(report, {
          event: "password_auth_failed",
          operation: route.endsWith("login") ? "login" : "register",
          stage,
          reason: failureReason(error, stage),
        });
      return failure(error);
    }
  };
}
export default {
  fetch: createAccountsHandler(),
  async scheduled(_controller, env) {
    const now = Date.now();
    await env.DB.batch([
      env.DB.prepare("DELETE FROM challenges WHERE expires_at<?").bind(now),
      env.DB.prepare("DELETE FROM sessions WHERE expires_at<?").bind(now),
      env.DB.prepare("DELETE FROM rate_limits WHERE expires_at<?").bind(now),
      env.DB.prepare(
        "DELETE FROM password_resets WHERE expires_at<? OR used_at IS NOT NULL",
      ).bind(now),
    ]);
  },
};
