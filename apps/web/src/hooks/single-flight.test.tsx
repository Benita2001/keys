import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useSingleFlight } from "./single-flight";

describe("useSingleFlight", () => {
  it("runs a side effect once for rapid repeated calls (Q003)", async () => {
    const { result } = renderHook(() => useSingleFlight());
    let calls = 0;
    let release!: () => void;
    const handler = result.current(async () => {
      calls++;
      await new Promise<void>((r) => (release = r));
    });
    await act(async () => {
      const a = handler();
      handler();
      handler();
      release();
      await a;
    });
    expect(calls).toBe(1);
    await act(async () => {
      const b = handler();
      release();
      await b;
    });
    expect(calls).toBe(2);
  });
});
