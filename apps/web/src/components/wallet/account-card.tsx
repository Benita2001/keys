"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Wallet } from "lucide-react";
import { shortSignature } from "@/components/proof";
import { Card, IconCircle } from "@/components/ui/primitives";
import { explorerAddressUrl, useWallet } from "./context";

/**
 * Secondary account surface. The wallet is identity only: Money Mode is still
 * governed by the guardian's limits, never by having a wallet.
 */
export function WalletAccountCard() {
  const wallet = useWallet();
  const [copied, setCopied] = useState(false);

  if (wallet.status === "unconfigured") return null;

  const copy = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked: the address is still visible */
    }
  };

  return (
    <Card className="mt-4 p-4">
      <div className="flex items-center gap-3">
        <IconCircle tone="lavender" size={40}>
          <Wallet className="size-5" />
        </IconCircle>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-extrabold text-navy-strong">Wallet account</p>
          <p className="truncate text-[12.5px] font-semibold text-ink-2">
            {wallet.status === "loading"
              ? "Checking your account…"
              : wallet.status === "unavailable"
                ? wallet.error
                : wallet.status === "signed-out"
                  ? "Sign in with email, Google or Apple"
                  : (wallet.account ?? "Signed in")}
          </p>
        </div>
        {wallet.status === "signed-out" ? (
          <button
            type="button"
            onClick={wallet.login}
            className="rounded-full bg-blue px-4 py-2 text-[13.5px] font-extrabold text-white hover:bg-blue-strong"
          >
            Sign in
          </button>
        ) : null}
      </div>

      {wallet.status === "signed-in" ? (
        <div className="mt-3 rounded-[14px] bg-surface-soft p-3">
          <p className="text-[11.5px] font-bold text-ink-3">Solana Devnet address</p>
          {wallet.address ? (
            <div className="mt-1 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate font-mono text-[13px] font-semibold text-navy" title={wallet.address}>
                {shortSignature(wallet.address)}
              </code>
              <button
                type="button"
                onClick={() => copy(wallet.address!)}
                aria-label="Copy wallet address"
                className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-surface"
              >
                {copied ? <Check aria-hidden className="size-4 text-green" /> : <Copy aria-hidden className="size-4" />}
              </button>
              <a
                href={explorerAddressUrl(wallet.address)}
                target="_blank"
                rel="noreferrer"
                aria-label="View address on Solana Explorer (opens in a new tab)"
                className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-surface"
              >
                <ExternalLink aria-hidden className="size-4" />
              </a>
            </div>
          ) : (
            <p className="mt-1 text-[13px] font-semibold text-ink-2">Creating your wallet…</p>
          )}
          <button
            type="button"
            onClick={() => void wallet.logout()}
            className="mt-2 text-[12.5px] font-extrabold text-ink-2 hover:text-navy"
          >
            Sign out of wallet
          </button>
        </div>
      ) : null}

      <p className="mt-3 text-[12px] font-semibold text-ink-3">
        Your wallet is your sign-in. It doesn&apos;t unlock Money Mode or change your limits. Those come from your parent or guardian.
      </p>
    </Card>
  );
}
