import { describe, expect, test } from "vitest";
import { receiverWantsP2P, resolveRoute } from "./transfer-mode";

describe("resolveRoute", () => {
  test("relay mode on the sender always relays", () => {
    expect(resolveRoute("relay", true)).toBe("relay");
    expect(resolveRoute("relay", false)).toBe("relay");
  });

  test("auto tries P2P when the receiver allows it, else relays", () => {
    expect(resolveRoute("auto", true)).toBe("p2p-or-relay");
    expect(resolveRoute("auto", false)).toBe("relay");
  });

  test("p2p never falls back to the relay", () => {
    expect(resolveRoute("p2p", true)).toBe("p2p");
    expect(resolveRoute("p2p", false)).toBe("impossible");
  });
});

describe("receiverWantsP2P", () => {
  test("only relay mode refuses P2P", () => {
    expect(receiverWantsP2P("auto")).toBe(true);
    expect(receiverWantsP2P("p2p")).toBe(true);
    expect(receiverWantsP2P("relay")).toBe(false);
  });
});
