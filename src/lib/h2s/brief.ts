/**
 * Server-only loader for the H2S brand brief markdown file.
 * The brief is sent to the LLM as a cached system block.
 */
import { readFileSync } from "fs";
import { join } from "path";

let cached: string | null = null;

export function loadH2sBrief(): string {
  if (cached) return cached;
  const path = join(process.cwd(), "src", "data", "h2s_brief.md");
  cached = readFileSync(path, "utf-8");
  return cached;
}
