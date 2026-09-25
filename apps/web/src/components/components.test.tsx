import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { DEMO_MANDATE } from "@/mocks/family";
import { StoreProvider } from "@/state/store";
import { BoundaryMessage, ModeSwitch } from "./mode";
import { DataStatusTag } from "./ui/feedback";

describe("BoundaryMessage", () => {
  it("offers Ask for more room only when the backend says a request is available", () => {
    const { rerender } = render(
      <BoundaryMessage
        evaluation={{ decision: "REFUSE", reasonCode: "MANDATE_LIMIT_EXCEEDED", boundaryRequestAvailable: true, requestedNotional: 20, standingLimit: 10, source: "local-preview" }}
        mandate={DEMO_MANDATE}
        onAsk={() => {}}
        onAdjust={() => {}}
      />,
    );
    expect(screen.getByText("This is above your current per-action limit.")).toBeInTheDocument();
    expect(screen.getByText("You can invest up to $10 in one action. You're trying to invest $20.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ask for more room/i })).toBeInTheDocument();

    rerender(
      <BoundaryMessage
        evaluation={{ decision: "REFUSE", reasonCode: "ASSET_OUTSIDE_MANDATE", source: "local-preview" }}
        mandate={DEMO_MANDATE}
        companyName="Tesla"
        onAsk={() => {}}
      />,
    );
    expect(screen.queryByRole("button", { name: /ask for more room/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/denied/i)).not.toBeInTheDocument();
  });
});

describe("ModeSwitch", () => {
  it("defaults to Practice and explains Money = Solana Mainnet the first time", async () => {
    render(
      <StoreProvider>
        <ModeSwitch />
      </StoreProvider>,
    );
    expect(screen.getByRole("radio", { name: "Practice" })).toHaveAttribute("aria-checked", "true");
    await userEvent.click(screen.getByRole("radio", { name: "Money" }));
    expect(screen.getByRole("radio", { name: "Money" })).toHaveAttribute("aria-checked", "true");
    const dialog = screen.getByRole("dialog", { name: "Money · Solana Mainnet" });
    expect(dialog).toBeInTheDocument();
    expect(dialog.contains(document.activeElement)).toBe(true); // Q011: focus moves into the sheet
    expect(screen.getByText(/requires parent verification and a supported Mainnet account/i)).toBeInTheDocument();
    expect(screen.getByText(/no real financial value/i)).toBeInTheDocument();
  });
});

describe("DataStatusTag", () => {
  it("never labels mock prices as live", () => {
    render(<DataStatusTag status="mock" />);
    expect(screen.getByText("Sample")).toBeInTheDocument();
    expect(screen.queryByText(/live/i)).not.toBeInTheDocument();
  });
});
