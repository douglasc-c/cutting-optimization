const $ = (id) => document.getElementById(id);
let busy = false,
  registering = false;
let resetToken = new URLSearchParams(location.hash.slice(1)).get("reset") || "";
if (resetToken)
  history.replaceState(null, "", location.pathname + location.search);
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
  if (!response.ok) throw Error(result.error || "Não foi possível concluir.");
  return result;
}
function screen(id) {
  for (const name of ["login", "account", "reset"])
    $(name).hidden = name !== id;
}
function account(result) {
  $("account-email").textContent = result.user.email;
  $("admin-link").hidden = !result.isAdmin;
  $("current-password-field").hidden = !!result.needsPassword;
  $("current-password").required = !result.needsPassword;
  $("password-title").textContent = result.needsPassword
    ? "Definir minha senha"
    : "Alterar senha";
  screen("account");
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
$("toggle-register").addEventListener("click", () => {
  registering = !registering;
  $("name-field").hidden = !registering;
  $("confirmation-field").hidden = !registering;
  $("confirmation").required = registering;
  $("password").minLength = registering ? 8 : 1;
  $("password").autocomplete = registering
    ? "new-password"
    : "current-password";
  $("login-title").textContent = registering
    ? "Criar minha conta"
    : "Entrar na sua conta";
  $("login-description").textContent = registering
    ? "Use uma senha com 8 a 128 caracteres."
    : "Use seu e-mail e sua senha.";
  $("login-submit").textContent = registering ? "Cadastrar e entrar" : "Entrar";
  $("toggle-register").textContent = registering
    ? "Já tenho conta"
    : "Criar conta";
  $("password").value = "";
  $("confirmation").value = "";
  $("status").textContent = "";
});
$("login-form").addEventListener("submit", (event) => {
  event.preventDefault();
  void run(async () => {
    if (registering && $("password").value !== $("confirmation").value)
      throw Error("As senhas não coincidem.");
    const result = await api(
      registering ? "/api/auth/register" : "/api/auth/login",
      {
        email: $("email").value.trim(),
        password: $("password").value,
        name: $("name").value,
        client: "browser",
      },
    );
    $("password").value = "";
    $("confirmation").value = "";
    account(result);
  });
});
$("password-form").addEventListener("submit", (event) => {
  event.preventDefault();
  void run(async () => {
    if ($("new-password").value !== $("new-confirmation").value)
      throw Error("As senhas não coincidem.");
    const result = await api("/api/auth/password", {
      currentPassword: $("current-password").value,
      password: $("new-password").value,
    });
    $("password-form").reset();
    account(result);
    $("status").textContent =
      "Senha salva. As outras sessões foram encerradas.";
  });
});
$("reset-form").addEventListener("submit", (event) => {
  event.preventDefault();
  void run(async () => {
    if ($("reset-password").value !== $("reset-confirmation").value)
      throw Error("As senhas não coincidem.");
    await api("/api/auth/reset-password", {
      token: resetToken,
      password: $("reset-password").value,
    });
    resetToken = "";
    $("reset-form").reset();
    screen("login");
    $("status").textContent =
      "Senha definida. Entre com seu e-mail e sua nova senha.";
  });
});
$("logout").addEventListener(
  "click",
  () =>
    void run(async () => {
      await api("/api/auth/logout", {});
      $("password-form").reset();
      $("admin-link").hidden = true;
      screen("login");
    }),
);
(async () => {
  if (resetToken) {
    screen("reset");
  } else {
    try {
      account(await api("/api/session"));
    } catch {
      screen("login");
    }
  }
  try {
    const policy = await api("/api/version"),
      url = new URL(policy.releaseUrl);
    if (url.protocol !== "https:") throw Error();
    $("release-version").textContent = `Versão ${policy.latestVersion}`;
    $("download").href = url.href;
    $("release").hidden = false;
  } catch {
    $("status").textContent =
      "A lista de versões está indisponível. Tente novamente mais tarde.";
  }
})();
