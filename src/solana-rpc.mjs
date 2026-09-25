// Resilient Solana JSON-RPC transport for the KEYS runtime.
//
// - Rotates across one or more RPC URLs (a dedicated, authenticated provider
//   first; public endpoints only as a fallback).
// - Retries rate limits (429), 5xx and network failures with bounded
//   exponential backoff + jitter.
// - Never retries a JSON-RPC *program* error: only transport failures.
// - RPC credentials live in server-only env (SOLANA_DEVNET_RPC_URL etc.).

export class SolanaRpcUnavailableError extends Error {
  constructor(message, { cause, sent = false } = {}) {
    super(message);
    this.name = "SolanaRpcUnavailableError";
    this.code = "SOLANA_RPC_UNAVAILABLE";
    this.retryable = true;
    // Whether a transaction may already have been submitted when this failed.
    this.sent = sent;
    if (cause) this.cause = cause;
  }
}

const TRANSIENT_PATTERNS = [
  /\b429\b/,
  /too many requests/i,
  /rate.?limit/i,
  /\b50[0-4]\b/,
  /fetch failed/i,
  /network ?error/i,
  /socket hang up/i,
  /ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN/,
  /timed? ?out/i,
  /failed to get (?:info about account|recent blockhash|latest blockhash|program accounts|multiple accounts)/i,
  /SOLANA_RPC_UNAVAILABLE/
];

/** True for transport-level faults that say nothing about the action itself. */
export function isTransientRpcError(error) {
  if (!error) return false;
  if (error instanceof SolanaRpcUnavailableError) return true;
  const text = [error.message, error.cause?.message, ...(Array.isArray(error.logs) ? [] : [])]
    .filter(Boolean)
    .join("\n");
  // Program/simulation errors carry logs or custom program errors: never transient.
  if (Array.isArray(error.logs) && error.logs.length > 0) return false;
  if (/custom program error|Program log:|InstructionError/i.test(text)) return false;
  return TRANSIENT_PATTERNS.some((pattern) => pattern.test(text));
}

export function parseRpcUrls(...values) {
  const urls = values
    .flatMap((value) => String(value ?? "").split(","))
    .map((value) => value.trim())
    .filter(Boolean);
  return [...new Set(urls)];
}

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * fetch() replacement for @solana/web3.js Connection({ fetch }).
 * The URL web3.js passes is ignored in favor of the rotation list.
 */
export function createResilientRpcFetch({
  urls,
  fetchImpl = (...args) => fetch(...args),
  maxAttempts = 5,
  baseDelayMs = 250,
  maxDelayMs = 2_000,
  sleep = defaultSleep,
  random = Math.random
}) {
  const endpoints = parseRpcUrls(...(Array.isArray(urls) ? urls : [urls]));
  if (endpoints.length === 0) throw new Error("at least one Solana RPC URL is required");
  let preferred = 0;

  return async function resilientFetch(_input, init) {
    let lastError = null;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const index = (preferred + attempt) % endpoints.length;
      try {
        const response = await fetchImpl(endpoints[index], init);
        if (response.status !== 429 && response.status < 500) {
          preferred = index;
          return response;
        }
        lastError = new Error(`RPC ${response.status} ${response.statusText || ""}`.trim());
      } catch (error) {
        lastError = error;
      }
      if (attempt < maxAttempts - 1) {
        const backoff = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
        await sleep(Math.round(backoff / 2 + random() * (backoff / 2)));
      }
    }
    throw new SolanaRpcUnavailableError(
      `Solana RPC unavailable after ${maxAttempts} attempts: ${lastError?.message ?? "unknown"}`,
      { cause: lastError }
    );
  };
}
