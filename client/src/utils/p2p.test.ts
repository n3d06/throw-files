import { describe, expect, test } from "vitest";
import { candidateKind, explainFailure, parseControl } from "./p2p";

describe("candidateKind", () => {
  test("tells mDNS-hidden host candidates from raw IPs", () => {
    expect(
      candidateKind(
        "candidate:1 1 udp 2122260223 4c1f3a2e-1b2c-4d5e-8f90-123456789abc.local 54321 typ host generation 0",
      ),
    ).toBe("host (mDNS)");
    expect(
      candidateKind("candidate:1 1 udp 2122260223 192.168.1.20 54321 typ host"),
    ).toBe("host (IP)");
  });

  test("reports server-reflexive and relay candidates by type", () => {
    expect(
      candidateKind(
        "candidate:2 1 udp 1686052607 203.0.113.7 61000 typ srflx raddr 0.0.0.0 rport 0",
      ),
    ).toBe("srflx");
    expect(candidateKind("candidate:3 1 udp 41885439 198.51.100.2 3478 typ relay")).toBe(
      "relay",
    );
  });

  test("ignores malformed lines", () => {
    expect(candidateKind("")).toBeNull();
    expect(candidateKind("not a candidate")).toBeNull();
  });
});

describe("explainFailure", () => {
  test("blames the other browser when it sent nothing", () => {
    expect(
      explainFailure({ local: ["host (mDNS)", "srflx"], remote: [], state: "checking" }),
    ).toMatch(/other device sent no addresses/);
  });

  test("points at firewall / isolation when both sides had addresses", () => {
    const text = explainFailure({
      local: ["host (mDNS)", "srflx"],
      remote: ["host (mDNS)", "srflx"],
      state: "failed",
    });
    expect(text).toMatch(/firewall/);
    expect(text).toMatch(/State: failed/);
  });

  test("flags an unreachable STUN server", () => {
    expect(
      explainFailure({ local: ["host (mDNS)"], remote: ["host (mDNS)"], state: "failed" }),
    ).toMatch(/STUN/);
  });
});

describe("parseControl", () => {
  test("accepts only done and abort", () => {
    expect(parseControl('{"t":"done"}')).toEqual({ t: "done" });
    expect(parseControl('{"t":"abort"}')).toEqual({ t: "abort" });
    expect(parseControl('{"t":"other"}')).toBeNull();
    expect(parseControl("garbage")).toBeNull();
  });
});
