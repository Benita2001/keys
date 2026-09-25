"use client";

import { CheckCircle2, ExternalLink, FlaskConical, Info } from "lucide-react";
import type { ExecutionProof } from "@/domain/types";
import { explorerTxUrl as networkExplorerTxUrl, type ExecutionNetwork } from "@/domain/network";
import { cn } from "./ui/primitives";

/** Explorer link for the proof's own network. Devnet links carry ?cluster=devnet. */
export function explorerTxUrl(signature: string, network: ExecutionNetwork = "solana-devnet") {
  return networkExplorerTxUrl(signature, network);
}

export function shortSignature(signature: string) {
  return signature.length > 16 ? `${signature.slice(0, 8)}…${signature.slice(-8)}` : signature;
}

/** A proof is linkable only when the runtime confirmed a real (non-simulated) transaction. */
export function isVerifiableOnChain(proof?: ExecutionProof): proof is ExecutionProof & { signature: string } {
  return !!proof && proof.status === "RUNTIME_CONFIRMED" && !proof.simulated && typeof proof.signature === "string";
}

/**
 * Truthful summary of what happened to a Money action.
 * - demo:       nothing executed
 * - simulated:  a test server answered; no Solana transaction exists
 * - confirmed:  devnet transaction with an explorer link (demo tokens, not shares)
 */
export function ExecutionProofNote({
  proof,
  approvalText,
  className,
}: {
  proof?: ExecutionProof;
  approvalText: string;
  className?: string;
}) {
  if (isVerifiableOnChain(proof)) {
    return (
      <div className={cn("w-full rounded-[16px] bg-green-soft p-3.5 text-left text-[13px] font-semibold text-green-strong", className)}>
        <p className="flex items-center gap-1.5 font-extrabold">
          <CheckCircle2 aria-hidden className="size-4" /> Practice action confirmed on Solana Devnet
        </p>
        <p className="mt-1 text-navy">
          {approvalText} Practice capital · no real financial value.
        </p>
        <a
          href={explorerTxUrl(proof.signature, proof.network ?? "solana-devnet")}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 font-extrabold text-blue-strong hover:underline"
        >
          View on Solana Explorer <ExternalLink aria-hidden className="size-3.5" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </div>
    );
  }

  if (proof?.simulated) {
    return (
      <div className={cn("w-full rounded-[16px] bg-lavender-soft p-3.5 text-left text-[13px] font-semibold text-navy", className)}>
        <p className="flex items-center gap-1.5 font-extrabold">
          <FlaskConical aria-hidden className="size-4" /> Test run (simulated)
        </p>
        <p className="mt-1">
          {approvalText} A KEYS test server answered this request. No Solana transaction exists and no money moved.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("w-full rounded-[16px] bg-yellow-soft p-3.5 text-left text-[13px] font-semibold text-[#6f4a06]", className)}>
      <p className="flex items-center gap-1.5 font-extrabold">
        <Info aria-hidden className="size-4" /> Not sent
      </p>
      <p className="mt-1">
        {approvalText} No transaction was sent for this action.
      </p>
    </div>
  );
}

export function onChainLabel(proof?: ExecutionProof): string {
  if (!proof) return "Not sent.";
  if (isVerifiableOnChain(proof)) return shortSignature(proof.signature);
  if (proof.simulated) return proof.signature ? `Simulated (${shortSignature(proof.signature)}), not a real transaction` : "Simulated, not a real transaction";
  if (proof.status === "RUNTIME_PENDING") return "Submitted, waiting for confirmation";
  return "Not sent. No transaction exists for this action.";
}

function fmtTime(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "medium" });
}

/**
 * Proof drawer body: consumer summary first, raw signature/program/nonce/Pyth
 * under Technical details. Never shows a signature that wasn't returned.
 */
export function ProofDetails({
  proof,
  asset,
  amount,
  action = "Buy",
  decisionSource,
}: {
  proof?: ExecutionProof;
  asset: string;
  amount: string;
  action?: string;
  decisionSource?: string;
}) {
  const confirmed = isVerifiableOnChain(proof);
  const summary: [string, string][] = [
    ["Status", confirmed ? "Confirmed" : proof?.status === "RUNTIME_PENDING" ? "Waiting for confirmation" : proof?.simulated ? "Simulated test run" : proof?.status === "PRACTICE_LOCAL" ? "Practice (virtual money)" : "Not sent"],
    ["Network", proof?.network === "solana-mainnet" ? "Solana Mainnet" : proof?.network ? "Solana Devnet" : proof?.status === "PRACTICE_LOCAL" ? "Sandbox (not on-chain)" : "—"],
    ["Action", `${action} · ${asset}`],
    ["Amount", amount],
    ["Capital", proof?.network === "solana-devnet" || proof?.executionAsset === "DEMO_TOKEN" ? "Practice capital (Devnet demo token) · no real financial value" : proof?.status === "PRACTICE_LOCAL" ? "Sandbox practice capital · no real financial value" : "—"],
    ["Pyth evidence", proof?.pyth?.status ? `${proof.pyth.status === "FRESH" ? "Fresh" : proof.pyth.status}${typeof proof.pyth.unitPrice === "number" ? ` · $${proof.pyth.unitPrice.toFixed(2)}` : ""}` : "—"],
  ];
  const technical: [string, string][] = [
    ["Transaction signature", proof?.signature ?? "—"],
    ["Program", proof?.programId ?? "—"],
    ["Mandate account", proof?.mandateAddress ?? "—"],
    ["Mandate version / nonce", proof?.mandateVersion != null ? `v${proof.mandateVersion} · nonce ${proof.mandateNonce}` : "—"],
    ["Pyth feed", proof?.pyth?.feedId != null ? `#${proof.pyth.feedId}${proof.pyth.verification ? ` · ${proof.pyth.verification}` : ""}` : "—"],
    ["Pyth publish time", fmtTime(proof?.pyth?.publishTime)],
    ["Executed at", fmtTime(proof?.executedAt)],
    ["Idempotency key", proof?.idempotencyKey ?? "—"],
  ];
  if (decisionSource) technical.push(["Decision source", decisionSource]);
  return (
    <div>
      <dl className="divide-y divide-line-soft rounded-[16px] border border-line-soft">
        {summary.map(([k, v]) => (
          <div key={k} className="flex items-start justify-between gap-4 px-3.5 py-2.5">
            <dt className="text-[13px] font-bold text-ink-2">{k}</dt>
            <dd className="max-w-[62%] text-right text-[13px] font-extrabold text-navy-strong">{v}</dd>
          </div>
        ))}
      </dl>
      {confirmed ? (
        <a
          href={explorerTxUrl(proof.signature, proof.network ?? "solana-devnet")}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-[13.5px] font-extrabold text-blue-strong hover:underline"
        >
          View on Solana Explorer <ExternalLink aria-hidden className="size-3.5" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      ) : null}
      {proof && proof.status !== "PRACTICE_LOCAL" && proof.status !== "DEMO_NOT_EXECUTED" ? (
        <details className="group mt-3 rounded-[16px] border border-line-soft px-3.5 py-2.5">
          <summary className="cursor-pointer list-none text-[13px] font-extrabold text-navy-strong">Technical details</summary>
          <dl className="mt-2 space-y-2">
            {technical.map(([k, v]) => (
              <div key={k}>
                <dt className="text-[11.5px] font-bold text-ink-3">{k}</dt>
                <dd className="break-all font-mono text-[11.5px] font-semibold text-navy">{v}</dd>
              </div>
            ))}
          </dl>
        </details>
      ) : null}
    </div>
  );
}
