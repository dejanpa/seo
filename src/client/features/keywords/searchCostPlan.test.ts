import { describe, expect, it } from "vitest";
import { describeSearchCost } from "./searchCostPlan";

// 2840 is the United States (Labs); 2352 is Iceland, which Labs does not
// cover and which therefore routes to Google Ads.
const US = 2840;
const ICELAND = 2352;

describe("describeSearchCost", () => {
  it("counts every source auto may walk plus the fill-ins and the SERP", () => {
    const plan = describeSearchCost({
      mode: "auto",
      locationCode: US,
      clickstream: false,
    });

    // 1 source + SERP at best; 3 sources + 2 fill-ins + SERP at worst.
    expect(plan).toMatchObject({ minLookups: 2, maxLookups: 6 });
  });

  it("drops the source fallback a Google-Ads market never runs", () => {
    const plan = describeSearchCost({
      mode: "auto",
      locationCode: ICELAND,
      clickstream: false,
    });

    // One ideas call, one intent fill-in, one SERP — no difficulty to buy.
    expect(plan.maxLookups).toBe(3);
  });

  it("says nothing about clickstream unless it is on", () => {
    const off = describeSearchCost({
      mode: "related",
      locationCode: US,
      clickstream: false,
    });
    const on = describeSearchCost({
      mode: "related",
      locationCode: US,
      clickstream: true,
    });

    expect(off.summary).not.toMatch(/clickstream/i);
    expect(on.summary).toMatch(/clickstream doubles/i);
  });
});
