import { describe, expect, it } from "vitest";
import { buildPortfolio } from "@/hooks/data";
import { DEMO_PRACTICE_CASH, DEMO_PRACTICE_HOLDINGS } from "./family";
import { LESSONS } from "./learning";
import { MOCK_ASSETS, sampleSeries } from "./market";

const INTENDED_UNIVERSE: Record<string, string> = {
  AAPL: "AAPLx",
  NVDA: "NVDAx",
  TSLA: "TSLAx",
  NFLX: "NFLXx",
  AMZN: "AMZNx",
  MSFT: "MSFTx",
  META: "METAx",
  MCD: "MCDx",
  SPY: "SPYx",
  QQQ: "QQQx",
};

describe("mock market data", () => {
  it("only uses the intended real tokenized-stock universe", () => {
    for (const a of MOCK_ASSETS) {
      expect(INTENDED_UNIVERSE[a.ticker]).toBe(a.tokenizedTicker);
    }
    expect(MOCK_ASSETS.map((a) => a.ticker).sort()).toEqual(Object.keys(INTENDED_UNIVERSE).sort());
  });

  it("never contains concept-art placeholder companies", () => {
    const names = MOCK_ASSETS.map((a) => a.companyName.toLowerCase()).join("|");
    for (const fake of ["nova games", "orbit tech", "bright foods", "playhouse"]) expect(names).not.toContain(fake);
  });

  it("marks every mock price as mock, never live", () => {
    for (const a of MOCK_ASSETS) {
      expect(a.dataStatus).toBe("mock");
      expect(a.priceSource).toBe("mock");
      expect(a.network).toBe("solana");
    }
  });

  it("sample series end exactly at the sample price and follow the day's direction", () => {
    for (const a of MOCK_ASSETS) {
      const s = sampleSeries(a.ticker, a.price, a.dayChangePercent, "1D");
      expect(s.at(-1)!.v).toBeCloseTo(a.price, 6);
      expect(Math.sign(s.at(-1)!.v - s[0].v)).toBe(Math.sign(a.dayChangePercent));
    }
  });

  it("the demo practice portfolio reproduces the approved mockup numbers", () => {
    const view = buildPortfolio("practice", DEMO_PRACTICE_HOLDINGS, DEMO_PRACTICE_CASH, MOCK_ASSETS);
    expect(view.totalValue).toBeCloseTo(1248.5, 2);
    expect(view.totalChange).toBeCloseTo(57.3, 2);
    expect(view.totalChangePercent).toBeCloseTo(4.8, 1);
    expect(view.holdings.map((h) => h.ticker)).toEqual(["AAPL", "NVDA", "AMZN", "NFLX"]);
  });
});


describe("source-backed learning", () => {
  it("uses visible primary-source metadata for core investing lessons", () => {
    const sourced = LESSONS.flatMap((lesson) =>
      lesson.steps
        .filter((step) => step.kind === "concept" && step.source)
        .map((step) => ({ lessonId: lesson.id, source: step.kind === "concept" ? step.source : undefined })),
    );

    expect(sourced.length).toBeGreaterThanOrEqual(8);
    for (const item of sourced) {
      expect(item.source).toBeTruthy();
      expect(item.source!.url.startsWith("https://")).toBe(true);
      expect(item.source!.verifiedAt).toMatch(/^20\d\d-\d\d-\d\d$/);
      expect(["investor.gov", "sec.gov"]).toContain(new URL(item.source!.url).hostname.replace(/^www\./, ""));
    }
  });

  it("teaches tokenized-security representation as distinct from the company itself", () => {
    const lesson = LESSONS.find((item) => item.id === "stock-vs-tokenized-security");
    expect(lesson).toBeTruthy();
    expect(JSON.stringify(lesson)).toContain("same rights");
    expect(JSON.stringify(lesson)).toContain("representation");
  });
});
