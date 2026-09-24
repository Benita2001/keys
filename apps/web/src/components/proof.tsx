"use client";

import { CheckCircle2, ExternalLink, FlaskConical, Info } from "lucide-react";
import type { ExecutionProof } from "@/domain/types";
import { cn } from "./ui/primitives";

export function explorerTxUrl(signature: string) {
  return `https://explorer.solana.com/tx/${encodeURIComponent(signature)}?cluster=devnet`;
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
          <CheckCircle2 aria-hidden className="size-4" /> Confirmed on Solana devnet
        </p>
        <p className="mt-1 text-navy">
          {approvalText} This used devnet demo tokens, not real money or shares.
        </p>
        <a
          href={explorerTxUrl(proof.signature)}
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
        <Info aria-hidden className="size-4" /> Demo only
      </p>
      <p className="mt-1">
        {approvalText} Money Mode isn&apos;t connected to real money yet, so nothing was bought and no transaction was sent.
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
