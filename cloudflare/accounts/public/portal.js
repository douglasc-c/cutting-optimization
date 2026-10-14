const $ = (id) => document.getElementById(id);
let challengeId = "",
  busy = false;
async function api(path, data) {
  const response = await fetch(path, {
    method: data ? "POST" : "GET",
    credentials: "same-origin",
    ...(data
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      : {}),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "Não foi possível concluir.");
  return result;
}
function screen(id) {
  for (const name of ["login", "verification", "account"])
    $(name).hidden = name !== id;
}
async function run(action) {
  if (busy) return;
  busy = true;
  document.querySelectorAll("button").forEach((b) => (b.disabled = true));
  $("status").textContent = "";
  try {
    await action();
  } catch (error) {
    $("status").textContent = error.message;
  } finally {
    busy = false;
    document.querySelectorAll("button").forEach((b) => (b.disabled = false));
  }
}
$("request-form").addEventListener("submit", (event) => {
  event.preventDefault();
  void run(async () => {
    const result = await api("/api/auth/request-code", {
      email: $("email").value.trim(),
      name: $("name").value,
    });
    challengeId = result.challengeId;
    $("sent-to").textContent =
      `Enviamos o código para ${$("email").value.trim()}. Ele expira em 10 minutos.`;
    $("code").value = "";
    screen("verification");
    $("code").focus();
  });
});
$("verify-form").addEventListener("submit", (event) => {
  event.preventDefault();
  void run(async () => {
    const result = await api("/api/auth/verify-code", {
      challengeId,
      code: $("code").value.trim(),
      client: "browser",
    });
    $("account-email").textContent = result.user.email;
    screen("account");
  });
});
$("back").addEventListener("click", () => {
  challengeId = "";
  screen("login");
  $("email").focus();
});
$("logout").addEventListener(
  "click",
  () =>
    void run(async () => {
      await api("/api/auth/logout", {});
      screen("login");
    }),
);
(async () => {
  try {
    const result = await api("/api/session");
    $("account-email").textContent = result.user.email;
    screen("account");
  } catch (error) {
    screen("login");
  }
  try {
    const policy = await api("/api/version");
    const url = new URL(policy.releaseUrl);
    if (url.protocol !== "https:") throw Error("Endereço inválido");
    $("release-version").textContent = `Versão ${policy.latestVersion}`;
    $("download").href = url.href;
    $("release").hidden = false;
  } catch (error) {
    $("status").textContent =
      "A lista de versões está indisponível. Tente novamente mais tarde.";
  }
})();
