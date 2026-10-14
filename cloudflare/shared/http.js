export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...extra,
    },
  });
}
export async function body(request) {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new HttpError(415, "Envie os dados em JSON.");
  // Enforce the actual streamed size, including requests without Content-Length.
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Dados ausentes.");
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 4096) {
      await reader.cancel();
      throw new HttpError(413, "Dados muito grandes.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    const value = JSON.parse(new TextDecoder().decode(bytes));
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw Error();
    return value;
  } catch {
    throw new HttpError(400, "JSON inválido.");
  }
}
export function failure(error) {
  // Never return provider errors, SQL details, tokens or configuration secrets.
  return json(
    {
      error: error.status
        ? error.message
        : "Serviço indisponível. Tente novamente.",
    },
    error.status || 503,
  );
}
