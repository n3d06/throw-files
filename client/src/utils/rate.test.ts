import { describe, expect, test } from "vitest";
import { RateMeter, formatTimeLeft } from "./rate";

describe("RateMeter", () => {
  test("measures bytes per second and smooths jumps", () => {
    const meter = new RateMeter();
    expect(meter.update(0, 0)).toBe(0);
    expect(meter.update(1_000_000, 1000)).toBe(1_000_000);
    // A burst only moves the average part of the way.
    const next = meter.update(4_000_000, 2000);
    expect(next).toBeGreaterThan(1_000_000);
    expect(next).toBeLessThan(3_000_000);
  });

  test("ignores samples that are too close together", () => {
    const meter = new RateMeter();
    meter.update(0, 0);
    meter.update(1_000_000, 1000);
    expect(meter.update(9_000_000, 1010)).toBe(1_000_000);
  });
});

describe("formatTimeLeft", () => {
  test("picks seconds, minutes or hours", () => {
    expect(formatTimeLeft(8_000_000, 1_000_000)).toBe("8 s left");
    expect(formatTimeLeft(180_000_000, 1_000_000)).toBe("3 min left");
    expect(formatTimeLeft(3_900_000_000, 1_000_000)).toBe("1 h 5 min left");
  });
  test("is null without a speed or bytes left", () => {
    expect(formatTimeLeft(100, 0)).toBeNull();
    expect(formatTimeLeft(0, 100)).toBeNull();
  });
});
