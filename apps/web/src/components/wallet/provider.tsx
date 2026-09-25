"use client";

import dynamic from "next/dynamic";
import { Component, type ReactNode } from "react";
import { PRIVY_APP_ID, WalletContext } from "./context";

const PrivyBridge = dynamic(() => import("./privy-bridge"), {
  ssr: false,
  loading: () => null,
});

/** If the wallet SDK fails, the app keeps working without it. */
class WalletBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * Env-gated embedded wallet. Without NEXT_PUBLIC_PRIVY_APP_ID the wallet is
 * "unconfigured" and nothing is loaded. Wallet state never feeds KEYS authority.
 */
export function WalletProvider({ children }: { children: ReactNode }) {
  if (!PRIVY_APP_ID) return <>{children}</>;
  const fallback = (
    <WalletContext.Provider value={{ status: "unavailable", error: "Wallet sign-in isn't available right now." }}>
      {children}
    </WalletContext.Provider>
  );
  return (
    <WalletBoundary fallback={fallback}>
      <WalletContext.Provider value={{ status: "loading" }}>
        <PrivyBridge>{children}</PrivyBridge>
      </WalletContext.Provider>
    </WalletBoundary>
  );
}
