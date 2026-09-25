"use client";

import { PrivyProvider, usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth/solana";
import { useMemo, type ReactNode } from "react";
import { PRIVY_APP_ID, WalletContext, type WalletState } from "./context";

/** Loaded only when NEXT_PUBLIC_PRIVY_APP_ID is set, so the SDK never ships otherwise. */
export default function PrivyBridge({ children }: { children: ReactNode }) {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ["email", "google", "apple"],
        appearance: { walletChainType: "solana-only", accentColor: "#2f6bff", theme: "light" },
        embeddedWallets: {
          solana: { createOnLogin: "users-without-wallets" },
          ethereum: { createOnLogin: "off" },
        },
      }}
    >
      <Bridge>{children}</Bridge>
    </PrivyProvider>
  );
}

function Bridge({ children }: { children: ReactNode }) {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();

  const value = useMemo<WalletState>(() => {
    if (!ready) return { status: "loading" };
    if (!authenticated) return { status: "signed-out", login: () => login() };
    const embedded = wallets.find((w) => w.standardWallet?.name === "Privy") ?? wallets[0];
    return {
      status: "signed-in",
      account: user?.email?.address ?? user?.google?.email ?? user?.apple?.email ?? null,
      address: walletsReady ? (embedded?.address ?? null) : null,
      logout,
    };
  }, [ready, authenticated, user, login, logout, wallets, walletsReady]);

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}
