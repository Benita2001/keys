import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ExecutionProofNote, onChainLabel } from "./proof";

const base = { executedAt: "2026-09-24T00:00:00Z", network: "solana-devnet" as const, programId: "ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk" };
const realSig = "5".repeat(44) + "a".repeat(44);

describe("ExecutionProofNote", () => {
  it("links a confirmed, non-simulated Devnet practice transaction to the Devnet explorer", () => {
    render(<ExecutionProofNote proof={{ ...base, status: "RUNTIME_CONFIRMED", signature: realSig, simulated: false }} approvalText="Allowed." />);
    expect(screen.getByText("Practice action confirmed on Solana Devnet")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /view on solana explorer/i });
    expect(link).toHaveAttribute("href", `https://explorer.solana.com/tx/${realSig}?cluster=devnet`);
    expect(screen.getByText(/no real financial value/i)).toBeInTheDocument();
  });

  it("never links a simulated proof", () => {
    render(<ExecutionProofNote proof={{ ...base, status: "RUNTIME_CONFIRMED", signature: "MOCK" + "a".repeat(84), simulated: true }} approvalText="Allowed." />);
    expect(screen.getByText("Test run (simulated)")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText(/No Solana transaction exists/)).toBeInTheDocument();
  });

  it("labels an unsent proof as not sent, with no link", () => {
    render(<ExecutionProofNote proof={{ status: "DEMO_NOT_EXECUTED", executedAt: base.executedAt }} approvalText="Allowed." />);
    expect(screen.getByText("Not sent")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("labels on-chain status truthfully", () => {
    expect(onChainLabel({ ...base, status: "RUNTIME_PENDING", simulated: false })).toMatch(/waiting/i);
    expect(onChainLabel({ ...base, status: "RUNTIME_CONFIRMED", signature: "MOCKabc", simulated: true })).toMatch(/Simulated/);
    expect(onChainLabel({ status: "DEMO_NOT_EXECUTED", executedAt: base.executedAt })).toMatch(/Not sent/);
  });
});
