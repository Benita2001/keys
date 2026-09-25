/**
 * Cresco network architecture (locked):
 *
 *   Practice → Solana Devnet  → KEYS Devnet runtime → practice capital, no real value
 *   Money    → Solana Mainnet → KEYS Mainnet runtime → real funded capital
 *
 * Network is decided here from the mode, never from UI text, and Money never
 * falls back to Devnet.
 */
import type { Mode } from "./types";

export type CrescoMode = Mode;
export type ExecutionNetwork = "solana-devnet" | "solana-mainnet";

export type ExecutionEnvironment = {
  mode: CrescoMode;
  network: ExecutionNetwork;
  /** KEYS program for this network, or null when not deployed. */
  programId: string | null;
  rpcEnvironment: "devnet" | "mainnet-beta";
  explorerCluster: "devnet" | "mainnet-beta";
  realValue: boolean;
  /** "live" only when the whole execution path for this network exists. */
  status: "live" | "setup-required";
};

export const DEVNET_KEYS_PROGRAM_ID = "ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk";

export const PRACTICE_DEVNET: ExecutionEnvironment = Object.freeze({
  mode: "practice",
  network: "solana-devnet",
  programId: DEVNET_KEYS_PROGRAM_ID,
  rpcEnvironment: "devnet",
  explorerCluster: "devnet",
  realValue: false,
  status: "live",
});

/**
 * Money on Mainnet goes live only when every real-world requirement exists.
 * Until then the adapter is hard-gated and the UI says "setup required".
 */
export type MoneyReadiness = {
  mainnetProgramDeployed: boolean;
  executionProviderConfigured: boolean;
  guardianVerified: boolean;
  assetVerified: boolean;
  realFunding: boolean;
};

export const MONEY_REQUIREMENTS: { key: keyof MoneyReadiness; label: string }[] = [
  { key: "mainnetProgramDeployed", label: "KEYS program deployed on Solana Mainnet" },
  { key: "guardianVerified", label: "Parent or guardian identity and eligibility verified" },
  { key: "assetVerified", label: "A verified tokenized stock with a working Mainnet route" },
  { key: "executionProviderConfigured", label: "Mainnet execution provider connected" },
  { key: "realFunding", label: "Real USDC deposited by the parent or guardian" },
];

const MAINNET_PROGRAM_ID = process.env.NEXT_PUBLIC_KEYS_MAINNET_PROGRAM_ID?.trim() || null;

/** Today's truth: nothing on Mainnet is set up. Every flag must be proven, not configured. */
export function moneyReadiness(): MoneyReadiness {
  return {
    mainnetProgramDeployed: false,
    executionProviderConfigured: false,
    guardianVerified: false,
    assetVerified: false,
    realFunding: false,
  };
}

export function moneyMainnetLive(readiness: MoneyReadiness = moneyReadiness()) {
  return Object.values(readiness).every(Boolean);
}

export function moneyMainnetEnvironment(readiness: MoneyReadiness = moneyReadiness()): ExecutionEnvironment {
  return {
    mode: "money",
    network: "solana-mainnet",
    programId: MAINNET_PROGRAM_ID,
    rpcEnvironment: "mainnet-beta",
    explorerCluster: "mainnet-beta",
    realValue: true,
    status: moneyMainnetLive(readiness) ? "live" : "setup-required",
  };
}

export function environmentFor(mode: CrescoMode): ExecutionEnvironment {
  return mode === "practice" ? PRACTICE_DEVNET : moneyMainnetEnvironment();
}

export class NetworkLeakError extends Error {
  constructor(expected: ExecutionNetwork, actual: string | undefined) {
    super(`Network leak: expected ${expected}, got ${actual ?? "none"}`);
    this.name = "NetworkLeakError";
  }
}

/** Accept a proof/record only if it belongs to the mode's network. */
export function belongsTo(mode: CrescoMode, network: string | undefined) {
  return network === environmentFor(mode).network;
}

export function assertNetwork(mode: CrescoMode, network: string | undefined) {
  if (!belongsTo(mode, network)) throw new NetworkLeakError(environmentFor(mode).network, network);
}

export function explorerTxUrl(signature: string, network: ExecutionNetwork) {
  const cluster = network === "solana-devnet" ? "?cluster=devnet" : "";
  return `https://explorer.solana.com/tx/${encodeURIComponent(signature)}${cluster}`;
}

/**
 * Verified Mainnet product metadata (source: official xStocks/Backed public API
 * https://api.backed.fi/api/v2/public/assets, cross-checked on Solana Mainnet
 * 2026-09-25). Verified as a product; NOT yet executable for any Cresco account.
 */
export const MAINNET_ASSETS = {
  AAPL: {
    company: "Apple",
    referenceTicker: "AAPL",
    pythSymbol: "Equity.US.AAPL/USD",
    practice: { network: "solana-devnet", representation: "DEMO_TOKEN", realValue: false },
    money: {
      network: "solana-mainnet",
      provider: "xstocks",
      symbol: "AAPLx",
      name: "Apple xStock",
      mint: "XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp",
      decimals: 8,
      tokenProgram: "Token-2022",
      settlement: { symbol: "USDC", mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", decimals: 6 },
      restrictions: "Not for US persons or other prohibited jurisdictions (xStocks legal documentation).",
      realValue: true,
      eligibility: "verification-required" as const,
    },
  },
} as const;
