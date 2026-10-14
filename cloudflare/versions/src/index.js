import { HttpError, json, failure } from "../../shared/http.js";
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
export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      if (url.pathname === "/api/health" && request.method === "GET")
        return json({ service: "versions", ok: true });
      if (url.pathname !== "/api/version")
        throw new HttpError(404, "Rota não encontrada.");
      if (request.method !== "GET")
        throw new HttpError(405, "Método não permitido.");
      if (compareVersions(env.MINIMUM_VERSION, env.LATEST_VERSION) > 0)
        throw Error("Invalid policy");
      const releaseUrl = new URL(env.RELEASE_URL);
      if (releaseUrl.protocol !== "https:") throw Error("Invalid release URL");
      const current = url.searchParams.get("version");
      const platform = url.searchParams.get("platform");
      if (platform && !["darwin", "win32", "linux"].includes(platform))
        throw new HttpError(400, "Sistema inválido.");
      return json({
        latestVersion: env.LATEST_VERSION,
        minimumVersion: env.MINIMUM_VERSION,
        releaseUrl: releaseUrl.href,
        updateAvailable: current
          ? compareVersions(current, env.LATEST_VERSION) < 0
          : false,
        updateRequired: current
          ? compareVersions(current, env.MINIMUM_VERSION) < 0
          : false,
      });
    } catch (error) {
      return failure(error);
    }
  },
};
