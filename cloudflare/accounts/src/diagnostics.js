export function failureReason(error, stage) {
  const message = typeof error?.message === "string" ? error.message : "";
  if (/no such (table|column)|has no column named/i.test(message))
    return "MIGRATIONS_PENDING";
  if (stage === "admin_setup") return "ADMIN_PASSWORD_NOT_CONFIGURED";
  if (/D1|SQLITE/i.test(message) || stage.endsWith("database"))
    return "DATABASE_ERROR";
  if (["hash_password", "verify_password"].includes(stage))
    return "PASSWORD_HASH_FAILURE";
  return "AUTH_SERVICE_ERROR";
}
export function reportFailure(report, event) {
  try {
    report(event);
  } catch {
    /* Logging must not alter authentication. */
  }
}
