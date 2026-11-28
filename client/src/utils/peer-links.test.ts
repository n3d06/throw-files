import { describe, expect, test } from "vitest";
import { summarizeLinks, transferIdOf } from "./peer-links";

describe("summarizeLinks", () => {
  test("says nothing without peers", () => {
    expect(summarizeLinks([])).toBeNull();
  });

  test("reports checking while any check runs", () => {
    expect(
      summarizeLinks([
        { state: "ok", route: "direct (LAN)" },
        { state: "checking", since: 2000 },
        { state: "checking", since: 1000 },
      ]),
    ).toEqual({ tone: "checking", text: "Checking direct connection…", since: 1000 });
  });

  test("names the route when every check worked", () => {
    expect(summarizeLinks([{ state: "ok", route: "direct (LAN)" }])).toEqual({
      tone: "ok",
      text: "P2P ready · direct (LAN)",
    });
  });

  test("says Auto will use the relay when every check failed", () => {
    expect(summarizeLinks([{ state: "failed", detail: "x" }])?.tone).toBe("failed");
  });

  test("counts partial success", () => {
    expect(
      summarizeLinks([
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
