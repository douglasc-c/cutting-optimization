import {
  randomInt,
  randomBytes,
  randomUUID,
  createHash,
  createHmac,
} from "node:crypto";
import { HttpError, json, body, failure } from "../../shared/http.js";
import {
  getVersionPolicy,
  loadVersionConfig,
} from "../../shared/version-policy.js";
import { handleAdmin, isAdmin } from "./admin.js";
const SESSION_MS = 30 * 86400000;
const digest = (value) => createHash("sha256").update(value).digest("hex");
const codeHash = (env, id, code) =>
  createHmac("sha256", env.AUTH_SECRET).update(`${id}:${code}`).digest("hex");
const normalizeEmail = (value) => {
  if (
    typeof value !== "string" ||
    value.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  )
    throw new HttpError(400, "Informe um e-mail válido.");
  return value.trim().toLowerCase();
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
class DeliveryError extends Error {
  constructor(reason, providerStatus) {
    super("Email delivery failed");
    this.reason = reason;
    this.providerStatus = providerStatus;
  }
}
export async function sendEmail(env, email, code) {
  if (!env.RESEND_API_KEY) throw new DeliveryError("RESEND_API_KEY_MISSING");
  if (!env.EMAIL_FROM) throw new DeliveryError("EMAIL_FROM_MISSING");
  if (env.EMAIL_FROM.includes("example.com"))
    throw new DeliveryError("EMAIL_FROM_PLACEHOLDER");
  let response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(15000),
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [email],
        subject: "Seu código de acesso ao Cutting Optimization",
        text: `Seu código é ${code}. Ele expira em 10 minutos. Não compartilhe este código. Se não solicitou o acesso, ignore esta mensagem.`,
      }),
    });
  } catch {
    throw new DeliveryError("RESEND_NETWORK_ERROR");
  }
  if (!response.ok) throw new DeliveryError("RESEND_REJECTED", response.status);
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
export function createAccountsHandler(
  deliver = sendEmail,
  report = (event) => console.error(JSON.stringify(event)),
) {
  return async (request, env) => {
    const requestCode =
      request.method === "POST" &&
      new URL(request.url).pathname === "/api/auth/request-code";
    let stage = "auth_config";
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
      // No cross-origin browser API access. Desktop calls originate in the main process.
      const origin = request.headers.get("origin");
      if (origin && origin !== url.origin)
        throw new HttpError(403, "Origem não permitida.");
      if (request.headers.get("sec-fetch-site") === "cross-site")
        throw new HttpError(403, "Origem não permitida.");
      if (url.pathname === "/api/health" && request.method === "GET")
        return json({ service: "accounts", ok: true });
      if (url.pathname === "/api/version" && request.method === "GET") {
        return json(
          getVersionPolicy(url.searchParams, await loadVersionConfig(env)),
        );
      }
      if (url.pathname === "/api/version")
        throw new HttpError(405, "Método não permitido.");
      if (typeof env.AUTH_SECRET !== "string" || env.AUTH_SECRET.length < 32)
        throw Error("Auth secret not configured");
      if (url.pathname.startsWith("/api/admin/"))
        return await handleAdmin(
          request,
          env,
          await session(request, env, now),
          now,
        );
      if (
        url.pathname === "/api/auth/request-code" &&
        request.method === "POST"
      ) {
        const data = await body(request),
          email = normalizeEmail(data.email);
        const name =
          typeof data.name === "string" ? data.name.trim().slice(0, 100) : "";
        const ip = request.headers.get("cf-connecting-ip") || "local";
        stage = "rate_limit_database";
        await rateLimit(env, `send-ip:${ip}`, 20, 3600000, now);
        await rateLimit(env, `send-email:${email}`, 3, 900000, now);
        const id = randomUUID(),
          code = String(randomInt(0, 100000000)).padStart(8, "0");
        stage = "create_challenge_database";
        await env.DB.prepare(
          "INSERT INTO challenges(id,email,name,code_hash,expires_at) VALUES(?,?,?,?,?)",
        )
          .bind(id, email, name, codeHash(env, id, code), now + 600000)
          .run();
        stage = "send_email";
        try {
          await deliver(env, email, code);
        } catch (error) {
          stage = "cleanup_challenge_database";
          await env.DB.prepare("DELETE FROM challenges WHERE id=?")
            .bind(id)
            .run();
          stage = "send_email";
          throw error;
        }
        return json({
          challengeId: id,
          message:
            "Enviamos um código para seu e-mail. Ele vale por 10 minutos.",
        });
      }
      if (
        url.pathname === "/api/auth/verify-code" &&
        request.method === "POST"
      ) {
        const data = await body(request);
        if (
          typeof data.challengeId !== "string" ||
          data.challengeId.length > 64 ||
          !/^\d{8}$/.test(data.code || "")
        )
          throw new HttpError(400, "Informe o código de 8 números.");
        await rateLimit(
          env,
          `verify-ip:${request.headers.get("cf-connecting-ip") || "local"}`,
          40,
          900000,
          now,
        );
        const row = await env.DB.prepare(
          `UPDATE challenges SET attempts=attempts+1 WHERE id=?
          AND used_at IS NULL AND expires_at>? AND attempts<5 RETURNING *`,
        )
          .bind(data.challengeId, now)
          .first();
        if (!row || row.code_hash !== codeHash(env, row.id, data.code))
          throw new HttpError(
            401,
            "Código inválido ou expirado. Solicite um novo código.",
          );
        // Atomic one-time claim: simultaneous requests cannot issue two sessions.
        const claimed = await env.DB.prepare(
          "UPDATE challenges SET used_at=? WHERE id=? AND used_at IS NULL RETURNING id",
        )
          .bind(now, row.id)
          .first();
        if (!claimed)
          throw new HttpError(
            401,
            "Código já utilizado. Solicite um novo código.",
          );
        await env.DB.prepare(
          "INSERT INTO users(id,email,name,created_at) VALUES(?,?,?,?) ON CONFLICT(email) DO NOTHING",
        )
          .bind(randomUUID(), row.email, row.name, now)
          .run();
        const user = await env.DB.prepare(
          "SELECT id,email,name,status FROM users WHERE email=?",
        )
          .bind(row.email)
          .first();
        if (user.status !== "active")
          throw new HttpError(
            403,
            "Esta conta está bloqueada. Entre em contato com o suporte.",
          );
        const token = randomBytes(32).toString("hex"),
          client = data.client === "desktop" ? "desktop" : "browser";
        const deviceId =
          typeof data.deviceId === "string" &&
          /^[a-f0-9-]{36}$/.test(data.deviceId)
            ? data.deviceId
            : randomUUID();
        await env.DB.batch([
          env.DB.prepare(
            "DELETE FROM sessions WHERE user_id=? AND device_id=? AND client=?",
          ).bind(user.id, deviceId, client),
          env.DB.prepare(
            `INSERT INTO sessions(token_hash,user_id,device_id,client,created_at,expires_at,last_seen_at)
            VALUES(?,?,?,?,?,?,?)`,
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
            ...(client === "desktop" ? { token } : {}),
          },
          200,
          client === "browser"
            ? { "Set-Cookie": cookie(request, token, SESSION_MS / 1000) }
            : {},
        );
      }
      if (url.pathname === "/api/session" && request.method === "GET") {
        const row = await session(request, env, now);
        const version = request.headers.get("x-app-version"),
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
        return json({
          user: { id: row.user_id, email: row.email, name: row.name },
          expiresAt: row.expires_at,
          allowed: !policy.updateRequired,
          isAdmin: row.client === "browser" && isAdmin(env, row.email),
          policy,
        });
      }
      if (url.pathname === "/api/auth/logout" && request.method === "POST") {
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
      if (requestCode && (!error.status || error.status >= 500)) {
        const event = {
          event: "request_code_failed",
          stage,
          reason:
            error instanceof DeliveryError
              ? error.reason
              : stage === "auth_config"
                ? "AUTH_SECRET_NOT_CONFIGURED"
                : stage.endsWith("database")
                  ? "DATABASE_ERROR"
                  : "EMAIL_DELIVERY_ERROR",
          ...(error instanceof DeliveryError && error.providerStatus
            ? { providerStatus: error.providerStatus }
            : {}),
        };
        try {
          report(event);
        } catch {
          /* Diagnostics must not alter the response. */
        }
      }
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
    ]);
  },
};
