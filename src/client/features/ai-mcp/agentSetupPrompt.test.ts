import { describe, expect, it } from "vitest";
import { APP_URL } from "@/shared/brand";
import { getAgentSetupPrompt } from "./agentSetupPrompt";

describe("agent setup prompt", () => {
  it("uses the current instance for MCP and API keys", () => {
    const prompt = getAgentSetupPrompt("https://seo.example.com");
    expect(prompt).toContain("https://seo.example.com/mcp");
    expect(prompt).toContain("https://seo.example.com/settings");
    expect(prompt).not.toContain(APP_URL);
    expect(prompt).toContain("npx skills add dejanpa/seo");
    expect(prompt).not.toContain("internal: true");
  });
});
