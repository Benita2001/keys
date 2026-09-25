"use client";

import { createContext, useContext } from "react";

/**
 * Embedded wallet state (identity + a Solana address). It is deliberately NOT
 * connected to KEYS authority: signing in or having a wallet never enables
 * Money Mode, changes limits or implies eligibility. The guardian's Mandate does.
 */
export type WalletState =
  | { status: "unconfigured" }
  | { status: "loading" }
  | { status: "unavailable"; error: string }
  | { status: "signed-out"; login: () => void }
  | {
      status: "signed-in";
      account: string | null;
      /** Solana address of the Privy embedded wallet, once created. */
      address: string | null;
      logout: () => Promise<void>;
    };

export const WalletContext = createContext<WalletState>({ status: "unconfigured" });

export function useWallet() {
  return useContext(WalletContext);
}

export const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim() || "";

export function explorerAddressUrl(address: string) {
  return `https://explorer.solana.com/address/${encodeURIComponent(address)}?cluster=devnet`;
}
