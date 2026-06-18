/**
 * Builds the system + user messages for the H2S weekly Power-of-Five synthesis.
 *
 * System blocks (cached when on Anthropic; ignored on Groq):
 *   1. The full H2S brand brief (~10K tokens)
 *
 * User message:
 *   - This week's aggregated facts as JSON
 *   - Up to 4 prior weekly summaries for context
 *   - Explicit instruction to follow the 9-section template
 */

import type { SystemBlock, ChatMessage } from "@/lib/claude";
import type { H2sFacts } from "./aggregate";
import { loadH2sBrief } from "./brief";

export interface BuiltPrompt {
  system: SystemBlock[];
  messages: ChatMessage[];
}

export function buildWeeklyPrompt(facts: H2sFacts): BuiltPrompt {
  const brief = loadH2sBrief();

  const system: SystemBlock[] = [
    { text: brief, cache: true },
  ];

  const factsJson = JSON.stringify(facts, null, 2);

  let priorSection = "";
  if (facts.prior_summaries.length > 0) {
    priorSection = "\n\n## Prior weeks (for context, do not summarize these):\n\n" +
      facts.prior_summaries
        .map((s) => `### Week of ${s.week_start}\n${s.summary_excerpt.trim()}…`)
        .join("\n\n");
  }

  const userText = `Generate this week's H2S Power-of-Five weekly report.

**Reporting window:** ${facts.this_week.start} → ${facts.this_week.end}
**Comparison window:** ${facts.prev_week.start} → ${facts.prev_week.end}

Follow the 9-section structure exactly as defined in your brief (§12). Lead with anomalies if any are flagged below. End with 3-5 numbered actions for next week.

If a section has no data because an integration isn't yet live (e.g. no GSC, no Clarity), write a single italic line "*No <source> data this week — integration in progress.*" and move on.

## Facts (JSON):

\`\`\`json
${factsJson}
\`\`\`${priorSection}

Write the report in markdown. No preamble, start directly with section 1.`;

  const messages: ChatMessage[] = [
    { role: "user", content: userText },
  ];

  return { system, messages };
}
