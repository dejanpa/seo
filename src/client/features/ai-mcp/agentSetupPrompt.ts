import installerSkill from "../../../../.agents/skills/setup-openseo/SKILL.md?raw";
import updatePrompt from "./agentUpdatePrompt.md?raw";
import { APP_URL } from "@/shared/brand";

export const agentUpdatePrompt = updatePrompt.trim();

// The copyable installer and internal skill share one source of truth.
export function getAgentSetupPrompt(origin: string) {
  const instructions = installerSkill
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "")
    .trim();
  // The installer names the hosted deployment; point it at this instance.
  return instructions.replaceAll(APP_URL, origin);
}
