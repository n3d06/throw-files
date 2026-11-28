import { describe, expect, test } from "vitest";
import { summarizeProbes, transferIdOf } from "./p2p-probe";

describe("summarizeProbes", () => {
  test("says nothing without peers", () => {
    expect(summarizeProbes([])).toBeNull();
  });

  test("reports checking while any check runs", () => {
    expect(
      summarizeProbes([{ state: "ok", route: "direct (LAN)" }, { state: "checking" }])?.tone,
    ).toBe("checking");
  });

  test("names the route when every check worked", () => {
    expect(summarizeProbes([{ state: "ok", route: "direct (LAN)" }])).toEqual({
      tone: "ok",
      text: "P2P ready · direct (LAN)",
    });
  });

  test("says Auto will use the relay when every check failed", () => {
    expect(summarizeProbes([{ state: "failed", detail: "x" }])?.tone).toBe("failed");
  });

  test("counts partial success", () => {
    expect(
      summarizeProbes([
        { state: "ok", route: null },
        { state: "failed", detail: "x" },
      ])?.text,
    ).toBe("P2P ready for 1 of 2 devices");
  });
});

describe("transferIdOf", () => {
  test("reads the transfer id from a per-file channel label", () => {
    expect(transferIdOf("file:abc-123")).toBe("abc-123");
    expect(transferIdOf("file")).toBeNull();
    expect(transferIdOf("file:")).toBeNull();
  });
});
