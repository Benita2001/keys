#!/usr/bin/env node
/**
 * MOCK KEYS API — local test double for the frozen v0.2 execute route.
 *
 *   npm run mock:keys                       # http://127.0.0.1:8788
 *   MOCK_EXECUTE_SCENARIO=pending-once npm run mock:keys
 *
 * Implements (see docs/CRESCO-BACKEND-INTEGRATION-HANDOFF.md §3.3):
 *   POST /api/v0.2/actions/execute          frozen technical proof contract, idempotent by key
 *   POST /api/v0.2/actions/evaluate         frozen action-evaluation route
 *   GET  /api/v0.1/capabilities
 *   GET  /api/v0.1/demo/live-proof          never FRESH (no Pyth here)
 *
 * Policy decisions use the repository's real src/bounded-autonomy.mjs.
 * Nothing touches Solana. Every proof has `simulated: true` and a signature
 * starting with "MOCK", which cannot be a real base58 Solana signature
 * (base58 has no "O"), so it can never be mistaken for on-chain proof.
 *
 * Scenarios (env MOCK_EXECUTE_SCENARIO, or per request header x-mock-scenario):
 *   confirm        (default) execute and confirm immediately
 *   pending-once   first call per key → PENDING, later calls → CONFIRMED
 *   slow           execute, then respond after 10s (client times out → UNKNOWN; re-check → CONFIRMED)
 *   error500-once  execute, then fail with 500 on the first call (ambiguous); re-check → CONFIRMED
 *   malformed      respond 200 with an invalid body
 */
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { evaluateBoundedAction } from "../../../src/bounded-autonomy.mjs";

export const MOCK_PROGRAM_ID = "ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk";
const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function mockSignature() {
  let s = "MOCK";
  while (s.length < 88) s += B58[Math.floor(Math.random() * B58.length)];
  return s;
}

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type,idempotency-key,x-mock-scenario",
};

function send(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", ...CORS });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function evaluate(body) {
  const draft = body?.draft ?? {};
  const evaluation = evaluateBoundedAction({
    mandate: draft.mandate,
    assetRule: draft.assetRule,
    action: {
      asset: body?.asset,
      type: body?.type,
      amount: body?.notional,
      notional: body?.notional,
      expectedNonce: body?.expectedNonce,
    },
  });
  // MOCK ONLY: trusts the client's allow-once id. The real route must look up
  // the guardian decision and bind it to asset, amount and Mandate nonce.
  if (
    evaluation.decision === "REFUSE" &&
    ["MANDATE_LIMIT_EXCEEDED", "PERIOD_LIMIT_EXCEEDED"].includes(evaluation.reasonCode) &&
    typeof body?.allowOnceRequestId === "string"
  ) {
    return { ...evaluation, decision: "ALLOW", reasonCode: "WITHIN_MANDATE", guardianApprovalRequired: false };
  }
  return evaluation;
}

export function createMockKeysServer({ scenario = process.env.MOCK_EXECUTE_SCENARIO || "confirm", slowMs = 10_000 } = {}) {
  /** idempotencyKey → { evaluation, proof|null, calls } */
  const ledger = new Map();
  const stats = { executions: 0 };

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      if (req.method === "OPTIONS") return send(res, 204, "");

      if (req.method === "GET" && url.pathname === "/api/v0.1/capabilities") {
        return send(res, 200, {
          contractVersion: "0.2-mock",
          mode: "MOCK_KEYS_API",
          marketEvidence: { status: "BLOCKED_API_KEY" },
          execution: { status: "MOCK_SIMULATED", scenario },
        });
      }

      if (req.method === "GET" && url.pathname === "/api/v0.1/demo/live-proof") {
        return send(res, 200, { contractVersion: "0.1", scenario: { asset: "AAPL" }, evaluation: { marketEvidence: { status: "BLOCKED_API_KEY" } } });
      }

      if (req.method === "POST" && ["/api/v0.2/actions/evaluate", "/api/v0.2/draft/actions/evaluate"].includes(url.pathname)) {
        const body = await readJson(req);
        const evaluation = evaluateBoundedAction({
          mandate: body?.mandate,
          assetRule: body?.assetRule,
          action: body?.action,
        });
        return send(res, 200, { ...evaluation, type: "V0_2_ACTION_EVALUATION", runtimeProofStatus: "MOCK" });
      }

      if (req.method === "POST" && url.pathname === "/api/v0.2/actions/execute") {
        const body = await readJson(req);
        const key = body?.idempotencyKey;
        if (typeof key !== "string" || key.length < 8 || key !== req.headers["idempotency-key"]) {
          return send(res, 400, { error: "IDEMPOTENCY_KEY_REQUIRED" });
        }
        const active = req.headers["x-mock-scenario"] || scenario;

        let entry = ledger.get(key);
        if (!entry) {
          const evaluation = evaluate(body);
          let proof = null;
          if (evaluation.decision === "ALLOW") {
            stats.executions += 1;
            proof = {
              status: "CONFIRMED",
              network: "solana-devnet",
              signature: mockSignature(),
              programId: MOCK_PROGRAM_ID,
              mandateVersion: body.draft?.mandate?.version,
              mandateNonce: body.draft?.mandate?.nonce,
              executedAt: new Date().toISOString(),
              idempotencyKey: key,
              simulated: true,
            };
          }
          entry = { evaluation, proof, calls: 0 };
          ledger.set(key, entry);
        }
        entry.calls += 1;
        const first = entry.calls === 1;
        const payload = { contractVersion: "0.2-mock", evaluation: entry.evaluation, executionProof: entry.proof };

        if (active === "malformed") return send(res, 200, { ok: true });
        if (active === "error500-once" && first) return send(res, 500, { error: "UPSTREAM_TIMEOUT" });
        if (active === "slow" && first) await sleep(slowMs);
        if (active === "pending-once" && first && entry.proof) {
          const pending = { ...entry.proof, status: "PENDING" };
          delete pending.signature;
          return send(res, 200, { ...payload, executionProof: pending });
        }
        return send(res, 200, payload);
      }

      return send(res, 404, { error: "NOT_FOUND" });
    } catch (err) {
      return send(res, 500, { error: String(err?.message ?? err) });
    }
  });

  return { server, ledger, stats };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const port = Number(process.env.MOCK_KEYS_PORT || 8788);
  const { server } = createMockKeysServer();
  server.listen(port, "127.0.0.1", () => {
    console.log(`[mock-keys] MOCK KEYS API on http://127.0.0.1:${port} (scenario: ${process.env.MOCK_EXECUTE_SCENARIO || "confirm"})`);
    console.log("[mock-keys] Proofs are simulated. No Solana transactions are sent.");
  });
}
