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
export function getVersionPolicy(params, env) {
  let invalidPolicy;
  try {
    invalidPolicy = compareVersions(env.MINIMUM_VERSION, env.LATEST_VERSION) > 0;
  } catch {
    throw Error("Invalid policy");
  }
  if (invalidPolicy)
    throw Error("Invalid policy");
  const releaseUrl = new URL(env.RELEASE_URL);
  if (releaseUrl.protocol !== "https:") throw Error("Invalid release URL");
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
