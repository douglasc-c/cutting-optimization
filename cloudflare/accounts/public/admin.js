const $ = (id) => document.getElementById(id);
let busy = false,
  page = 1,
  hasMore = false,
  query = "";
const date = (value) =>
  value ? new Date(value).toLocaleString("pt-BR") : "Ainda não acessou";
async function api(path, data, method) {
  const response = await fetch(path, {
    credentials: "same-origin",
    method: method || (data ? "POST" : "GET"),
    ...(data
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      : {}),
  });
  const result = await response.json();
  if (!response.ok) {
    if ([401, 403].includes(response.status)) showAccess(response.status);
    if ($("workspace").hidden && ![401, 403].includes(response.status)) {
      $("access-message").querySelector("h2").textContent =
        "Não foi possível carregar o painel";
      $("access-message").querySelector("p").textContent =
        "Tente atualizar esta página em alguns instantes.";
    }
    throw Error(result.error || "Não foi possível concluir.");
  }
  return result;
}
function showAccess(status) {
  $("workspace").hidden = true;
  $("access-message").hidden = false;
  $("access-message").querySelector("h2").textContent =
    status === 401 ? "Entre na sua conta" : "Acesso restrito";
  $("access-message").querySelector("p").textContent =
    status === 401
      ? "Use seu e-mail de administrador e entre com sua senha. Depois, volte a esta página."
      : "Sua conta não tem permissão para administrar o aplicativo.";
  $("admin-logout").hidden = status === 401;
}
async function run(action) {
  if (busy) return;
  busy = true;
  $("workspace").setAttribute("aria-busy", "true");
  const buttons = [...document.querySelectorAll("button")].map((b) => [
    b,
    b.disabled,
  ]);
  buttons.forEach(([b]) => {
    b.disabled = true;
  });
  $("admin-status").textContent = "";
  $("admin-status").className = "";
  try {
    await action();
  } catch (error) {
    $("admin-status").textContent = error.message;
    $("admin-status").className = "error";
  } finally {
    busy = false;
    $("workspace").removeAttribute("aria-busy");
    buttons.forEach(([b, disabled]) => {
      b.disabled = disabled;
    });
    paging();
  }
}
function paging() {
  $("previous").disabled = page === 1;
  $("next").disabled = !hasMore;
  $("page-label").textContent = `Página ${page}`;
}
function button(label, action, className = "secondary") {
  const element = document.createElement("button");
  element.type = "button";
  element.textContent = label;
  element.className = className;
  element.addEventListener("click", () => void run(action));
  return element;
}
async function loadUsers() {
  const result = await api(
    `/api/admin/users?page=${page}&q=${encodeURIComponent(query)}`,
  );
  hasMore = result.hasMore;
  const tbody = $("users-body");
  tbody.replaceChildren();
  $("users-count").textContent =
    `${result.users.length} usuário(s) nesta página`;
  $("users-empty").hidden = result.users.length > 0;
  for (const user of result.users) {
    const row = document.createElement("tr");
    const identity = document.createElement("td");
    const name = document.createElement("strong");
    name.textContent = user.name || "Sem nome";
    const email = document.createElement("small");
    email.textContent = user.email;
    identity.append(name, email);
    if (user.isAdmin) {
      const label = document.createElement("span");
      label.className = "badge admin";
      label.textContent = "Administrador";
      identity.append(label);
    }
    const status = document.createElement("td"),
      badge = document.createElement("span");
    badge.className = `badge ${user.status}`;
    badge.textContent = user.status === "active" ? "Ativo" : "Bloqueado";
    status.append(badge);
    const sessions = document.createElement("td");
    sessions.textContent = String(user.active_sessions);
    const last = document.createElement("td");
    last.textContent = date(user.last_seen_at);
    const actions = document.createElement("td"),
      group = document.createElement("div");
    group.className = "row-actions";
    group.append(
      button("Ver sessões", async () => {
        const result = await api(`/api/admin/users/${user.id}/sessions`);
        $("sessions-email").textContent = user.email;
        $("sessions-list").replaceChildren();
        $("sessions-empty").hidden = result.sessions.length > 0;
        for (const session of result.sessions) {
          const item = document.createElement("li"),
            title = document.createElement("strong");
          title.textContent = `${session.client === "desktop" ? "Aplicativo" : "Navegador"} · ${session.platform || "—"} · ${session.app_version || "Sem versão informada"}`;
          const detail = document.createElement("p");
          detail.textContent = `Último acesso: ${date(session.last_seen_at)} · Expira: ${date(session.expires_at)}`;
          const device = document.createElement("p");
          device.textContent = `Dispositivo: ${session.device_id}`;
          item.append(title, detail, device);
          $("sessions-list").append(item);
        }
        $("sessions-dialog").showModal();
      }),
    );
    if (user.email !== "admin@cutting.com")
      group.append(
        button("Gerar link de senha", async () => {
          if (
            !confirm(
              `Gerar um link de senha para ${user.email}? Links anteriores serão substituídos.`,
            )
          )
            return;
          const result = await api(
            `/api/admin/users/${user.id}/password-reset`,
            {},
          );
          $("password-link-user").textContent = user.email;
          $("password-link").value = result.resetUrl;
          $("copy-status").textContent = "";
          $("password-link-dialog").showModal();
          await loadAudit();
        }),
      );
    if (!user.isAdmin)
      group.append(
        button(
          user.status === "active" ? "Bloquear" : "Desbloquear",
          async () => {
            const block = user.status === "active";
            if (
              !confirm(
                `${block ? "Bloquear" : "Desbloquear"} ${user.email}?${block ? " As sessões serão encerradas. O bloqueio no aplicativo offline vale na reconexão ou ao terminar a tolerância de acesso." : " A pessoa poderá entrar novamente."}`,
              )
            )
              return;
            await api(`/api/admin/users/${user.id}/status`, {
              status: block ? "blocked" : "active",
            });
            await loadUsers();
            await loadAudit();
            $("admin-status").textContent = "Status do usuário atualizado.";
          },
          user.status === "active" ? "danger" : "secondary",
        ),
      );
    if (user.email !== $("admin-email").textContent)
      group.append(
        button("Revogar sessões", async () => {
          if (
            !confirm(
              `Encerrar todas as sessões de ${user.email}? Será necessário entrar novamente. No aplicativo offline, a revogação vale na reconexão ou ao terminar a tolerância de acesso.`,
            )
          )
            return;
          await api(`/api/admin/users/${user.id}/sessions`, {});
          await loadUsers();
          await loadAudit();
          $("admin-status").textContent = "Sessões revogadas.";
        }),
      );
    actions.append(group);
    row.append(identity, status, sessions, last, actions);
    tbody.append(row);
  }
  paging();
}
async function loadPolicy() {
  const policy = await api("/api/admin/version");
  $("latest-version").value = policy.latestVersion;
  $("minimum-version").value = policy.minimumVersion;
  $("release-url").value = policy.releaseUrl;
}
async function loadAudit() {
  const result = await api("/api/admin/audit");
  $("audit-list").replaceChildren();
  $("audit-empty").hidden = result.events.length > 0;
  const labels = {
    "user.status": "Status do usuário alterado",
    "user.sessions.revoke": "Sessões revogadas",
    "user.password-link": "Link de senha gerado",
    "version.update": "Política de versões atualizada",
  };
  for (const event of result.events) {
    const item = document.createElement("li"),
      title = document.createElement("strong"),
      actor = document.createElement("p"),
      detail = document.createElement("p");
    title.textContent = labels[event.action] || event.action;
    actor.textContent = `${event.actor_email} · ${date(event.created_at)}`;
    detail.textContent =
      event.action === "version.update"
        ? `Atual: ${event.details.latestVersion} · Mínima: ${event.details.minimumVersion}`
        : `${event.target_email || "Usuário"}${event.details.status ? ` · ${event.details.status === "blocked" ? "Bloqueado" : "Ativo"}` : ""}`;
    item.append(title, actor, detail);
    $("audit-list").append(item);
  }
}
$("search-form").addEventListener("submit", (event) => {
  event.preventDefault();
  void run(async () => {
    page = 1;
    query = $("search").value.trim();
    await loadUsers();
  });
});
$("previous").addEventListener(
  "click",
  () =>
    void run(async () => {
      page--;
      try {
        await loadUsers();
      } catch (error) {
        page++;
        throw error;
      }
    }),
);
$("next").addEventListener(
  "click",
  () =>
    void run(async () => {
      page++;
      try {
        await loadUsers();
      } catch (error) {
        page--;
        throw error;
      }
    }),
);
$("refresh-users").addEventListener("click", () => void run(loadUsers));
$("refresh-audit").addEventListener("click", () => void run(loadAudit));
$("close-sessions").addEventListener("click", () =>
  $("sessions-dialog").close(),
);
$("version-form").addEventListener("submit", (event) => {
  event.preventDefault();
  void run(async () => {
    const data = {
      latestVersion: $("latest-version").value.trim(),
      minimumVersion: $("minimum-version").value.trim(),
      releaseUrl: $("release-url").value.trim(),
    };
    if (
      !confirm(
        `Salvar versão atual ${data.latestVersion} e mínima ${data.minimumVersion}? Versões anteriores à mínima precisarão atualizar na próxima validação online.`,
      )
    )
      return;
    await api("/api/admin/version", data, "PUT");
    await loadPolicy();
    await loadAudit();
    $("admin-status").textContent =
      "Política salva. As próximas consultas já usarão esses valores.";
  });
});
$("admin-logout").addEventListener(
  "click",
  () =>
    void run(async () => {
      await api("/api/auth/logout", {});
      location.href = "/";
    }),
);
void run(async () => {
  const admin = await api("/api/admin/me");
  $("admin-email").textContent = admin.email;
  $("admin-logout").hidden = false;
  await loadUsers();
  await loadPolicy();
  await loadAudit();
  $("access-message").hidden = true;
  $("workspace").hidden = false;
});

$("close-password-link").addEventListener("click", () => {
  $("password-link-dialog").close();
  $("password-link").value = "";
});
$("copy-password-link").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText($("password-link").value);
    $("copy-status").textContent = "Link copiado.";
  } catch {
    $("password-link").select();
    $("copy-status").textContent = "Selecione e copie o link manualmente.";
  }
});
