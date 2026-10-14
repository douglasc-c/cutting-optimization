import { HttpError } from "./http.js";
export function parseVersion(value) {
  if (
    typeof value !== "string" ||
    !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value)
  )
    throw new HttpError(400, "Versão inválida. Use major.minor.patch.");
  const numbers = value.split(".").map(Number);
  if (numbers.some((n) => !Number.isSafeInteger(n)))
    throw new HttpError(400, "Versão inválida.");
  return numbers;
}
export function compareVersions(a, b) {
  const left = parseVersion(a),
    right = parseVersion(b);
  for (let i = 0; i < 3; i++)
    if (left[i] !== right[i]) return left[i] > right[i] ? 1 : -1;
  return 0;
}
export function validateVersionConfig(config, input = false) {
  try {
    if (compareVersions(config.MINIMUM_VERSION, config.LATEST_VERSION) > 0)
      throw Error("A versão mínima não pode ser maior que a versão atual.");
    if (
      typeof config.RELEASE_URL !== "string" ||
      config.RELEASE_URL.length > 2048
    )
      throw Error("Informe um endereço HTTPS válido para download.");
    const url = new URL(config.RELEASE_URL);
    if (url.protocol !== "https:" || url.username || url.password)
      throw Error(
        "Informe um endereço HTTPS válido para download, sem credenciais.",
      );
  } catch (error) {
    if (input) throw new HttpError(400, error.message);
    throw Error("Invalid policy");
  }
}
export async function loadVersionConfig(env) {
  const row = await env.DB.prepare(
    "SELECT latest_version,minimum_version,release_url FROM version_policy WHERE id=1",
  ).first();
  return row
    ? {
        LATEST_VERSION: row.latest_version,
        MINIMUM_VERSION: row.minimum_version,
        RELEASE_URL: row.release_url,
      }
    : env;
}
export function getVersionPolicy(params, env) {
  validateVersionConfig(env);
  const releaseUrl = new URL(env.RELEASE_URL);
  const current = params.get("version");
  const platform = params.get("platform");
  if (platform && !["darwin", "win32", "linux"].includes(platform))
    throw new HttpError(400, "Sistema inválido.");
  return {
    latestVersion: env.LATEST_VERSION,
    minimumVersion: env.MINIMUM_VERSION,
    releaseUrl: releaseUrl.href,
    updateAvailable: current
      ? compareVersions(current, env.LATEST_VERSION) < 0
      : false,
    updateRequired: current
      ? compareVersions(current, env.MINIMUM_VERSION) < 0
      : false,
  };
}
