import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatTimeLabel, nextMeetingTiming, parseHm } from "./when.ts";
import { haversineMiles } from "./geo.ts";

describe("parseHm", () => {
  it("reads 24h times", () => {
    assert.deepEqual(parseHm("06:45"), { hour: 6, minute: 45 });
    assert.deepEqual(parseHm("19:00:00"), { hour: 19, minute: 0 });
  });
});

describe("formatTimeLabel", () => {
  it("formats 12h", () => {
    assert.equal(formatTimeLabel("06:45"), "6:45 AM");
    assert.equal(formatTimeLabel("19:00:00"), "7:00 PM");
    assert.equal(formatTimeLabel("00:30"), "12:30 AM");
  });
});

describe("haversineMiles", () => {
  it("is small across downtown Omaha", () => {
    const miles = haversineMiles(
      { lat: 41.2565, lng: -95.9345 },
      { lat: 41.2516512, lng: -95.944472 },
    );
    assert.ok(miles > 0.4 && miles < 1.2, String(miles));
  });
});

describe("nextMeetingTiming", () => {
  it("flags a meeting that started 10 minutes ago as live", () => {
    // Sunday 19:00 America/Chicago. Pick a UTC instant that is 18:50 Chicago.
    const now = Date.parse("2026-08-23T23:50:00Z"); // CDT is UTC-5 in August → 18:50
    const result = nextMeetingTiming(0, "19:00", now, "America/Chicago", 60);
    assert.ok(result);
    assert.equal(result.live, false);
    assert.ok(result.minutesUntil > 0 && result.minutesUntil <= 15, String(result.minutesUntil));
  });

  it("marks an in-progress meeting live", () => {
    const now = Date.parse("2026-08-24T00:10:00Z"); // Sunday 19:10 CDT
    const result = nextMeetingTiming(0, "19:00", now, "America/Chicago", 60);
    assert.ok(result);
    assert.equal(result.live, true);
    assert.ok(result.minutesUntil <= 0);
  });
});
