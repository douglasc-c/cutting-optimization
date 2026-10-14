import { randomUUID } from "node:crypto";
import { HttpError, json, body } from "../../shared/http.js";
import {
  validateVersionConfig,
  loadVersionConfig,
} from "../../shared/version-policy.js";

export function isAdmin(env, email) {
  return (
    typeof env.ADMIN_EMAILS === "string" &&
    env.ADMIN_EMAILS.split(",").some(
      (entry) => entry.trim().toLowerCase() === email.toLowerCase(),
    )
  );
}
function audit(env, actor, action, target, details, now) {
  return env.DB.prepare(
    "INSERT INTO admin_audit(id,actor_id,action,target_id,details,created_at) VALUES(?,?,?,?,?,?)",
  ).bind(
    randomUUID(),
    actor.user_id,
    action,
    target,
    JSON.stringify(details),
    now,
  );
}
function method(request, expected) {
  if (request.method !== expected)
    throw new HttpError(405, "Método não permitido.");
}
export async function handleAdmin(request, env, actor, now) {
  if (actor.client !== "browser" || !isAdmin(env, actor.email))
    throw new HttpError(403, "Acesso restrito a administradores.");
  const url = new URL(request.url);
  const path = url.pathname;
  if (path === "/api/admin/me") {
    method(request, "GET");
    return json({ email: actor.email });
  }
  if (path === "/api/admin/users") {
    method(request, "GET");
    const query = (url.searchParams.get("q") || "").trim().toLowerCase();
    const pageText = url.searchParams.get("page") || "1";
    if (query.length > 100 || !/^[1-9]\d{0,5}$/.test(pageText))
      throw new HttpError(400, "Busca ou página inválida.");
    const page = Number(pageText),
      pageSize = 25;
    const result = await env.DB.prepare(
      `SELECT u.id,u.email,u.name,u.status,u.created_at,
      (SELECT COUNT(*) FROM sessions s WHERE s.user_id=u.id AND s.expires_at>?) AS active_sessions,
      (SELECT MAX(s.last_seen_at) FROM sessions s WHERE s.user_id=u.id) AS last_seen_at
      FROM users u WHERE instr(lower(u.email || ' ' || u.name),?)>0
      ORDER BY u.created_at DESC,u.id LIMIT ? OFFSET ?`,
    )
      .bind(now, query, pageSize + 1, (page - 1) * pageSize)
      .all();
    return json({
      users: result.results
        .slice(0, pageSize)
        .map((u) => ({ ...u, isAdmin: isAdmin(env, u.email) })),
      page,
      hasMore: result.results.length > pageSize,
    });
  }
  if (path === "/api/admin/version") {
    if (request.method === "GET") {
      const config = await loadVersionConfig(env);
      validateVersionConfig(config);
      return json({
        latestVersion: config.LATEST_VERSION,
        minimumVersion: config.MINIMUM_VERSION,
        releaseUrl: config.RELEASE_URL,
      });
    }
    method(request, "PUT");
    const data = await body(request);
    const config = {
      LATEST_VERSION: data.latestVersion,
      MINIMUM_VERSION: data.minimumVersion,
      RELEASE_URL: data.releaseUrl,
    };
    validateVersionConfig(config, true);
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO version_policy(id,latest_version,minimum_version,release_url,updated_at,updated_by)
        VALUES(1,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET latest_version=excluded.latest_version,
        minimum_version=excluded.minimum_version,release_url=excluded.release_url,
        updated_at=excluded.updated_at,updated_by=excluded.updated_by`,
      ).bind(
        config.LATEST_VERSION,
        config.MINIMUM_VERSION,
        config.RELEASE_URL,
        now,
        actor.user_id,
      ),
      audit(
        env,
        actor,
        "version.update",
        "version_policy",
        {
          latestVersion: data.latestVersion,
          minimumVersion: data.minimumVersion,
          releaseUrl: data.releaseUrl,
        },
        now,
      ),
    ]);
    return json({ success: true });
  }
  if (path === "/api/admin/audit") {
    method(request, "GET");
    const result = await env.DB.prepare(
      `SELECT a.action,a.target_id,a.details,a.created_at,u.email AS actor_email,t.email AS target_email
      FROM admin_audit a JOIN users u ON u.id=a.actor_id LEFT JOIN users t ON t.id=a.target_id ORDER BY a.created_at DESC,a.id DESC LIMIT 50`,
    ).all();
    return json({
      events: result.results.map((row) => ({
        ...row,
        details: JSON.parse(row.details),
      })),
    });
  }
  const match = path.match(
    /^\/api\/admin\/users\/([a-f0-9-]{36})\/(status|sessions)$/,
  );
  if (!match) throw new HttpError(404, "Rota não encontrada.");
  const [, id, operation] = match;
  const user = await env.DB.prepare(
    "SELECT id,email,status FROM users WHERE id=?",
  )
    .bind(id)
    .first();
  if (!user) throw new HttpError(404, "Usuário não encontrado.");
  if (operation === "sessions" && request.method === "GET") {
    const result = await env.DB.prepare(
      `SELECT device_id,client,app_version,platform,created_at,expires_at,last_seen_at
      FROM sessions WHERE user_id=? AND expires_at>? ORDER BY last_seen_at DESC LIMIT 100`,
    )
      .bind(id, now)
      .all();
    return json({ sessions: result.results });
  }
  method(request, "POST");
  const data = await body(request);
  if (operation === "status") {
    if (!["active", "blocked"].includes(data.status))
      throw new HttpError(400, "Status inválido.");
    if (data.status === "blocked" && isAdmin(env, user.email))
      throw new HttpError(
        409,
        "Uma conta administrativa não pode ser bloqueada pelo painel.",
      );
    await env.DB.batch([
      env.DB.prepare("UPDATE users SET status=? WHERE id=?").bind(
        data.status,
        id,
      ),
      ...(data.status === "blocked"
        ? [env.DB.prepare("DELETE FROM sessions WHERE user_id=?").bind(id)]
        : []),
      audit(env, actor, "user.status", id, { status: data.status }, now),
    ]);
  } else {
    if (id === actor.user_id)
      throw new HttpError(409, "Use Sair para encerrar sua própria sessão.");
    await env.DB.batch([
      env.DB.prepare("DELETE FROM sessions WHERE user_id=?").bind(id),
      audit(env, actor, "user.sessions.revoke", id, {}, now),
    ]);
  }
  return json({ success: true });
}
