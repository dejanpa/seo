import { describe, expect, it } from "vitest";
import { addOneMonth } from "./period";

describe("addOneMonth", () => {
  it("keeps the same day of month", () => {
    expect(addOneMonth("2026-03-15T09:00:00.000Z")).toBe(
      "2026-04-15T09:00:00.000Z",
    );
  });

  // The naive Date arithmetic rolls Jan 31 into March, which would skip a
  // whole billing period for anyone whose period starts late in the month.
  it("clamps to the last day when the next month is shorter", () => {
    expect(addOneMonth("2026-01-31T00:00:00.000Z")).toBe(
      "2026-02-28T00:00:00.000Z",
    );
    expect(addOneMonth("2028-01-31T00:00:00.000Z")).toBe(
      "2028-02-29T00:00:00.000Z",
    );
  });

  it("crosses the year boundary", () => {
    expect(addOneMonth("2026-12-10T00:00:00.000Z")).toBe(
      "2027-01-10T00:00:00.000Z",
    );
  });
});
