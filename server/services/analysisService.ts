import Anthropic from "@anthropic-ai/sdk";
import type { ProductProfile, CoreClaim, PromoRule, AnalysisResult, AnalysisResponse } from "@shared/schema";

const anthropic = new Anthropic();

export async function analyzeContent(
  profile: ProductProfile,
  claims: CoreClaim[],
  rules: PromoRule[],
  content: string
): Promise<AnalysisResponse> {
  const claimsList = claims.map((c, i) => `${i + 1}. "${c.claimText}" [type: ${c.claimType}]`).join("\n");
  const rulesList = rules.map((r, i) => `${i + 1}. ${r.ruleText}`).join("\n");

  const systemPrompt = `You are a Medical-Legal-Regulatory (MLR) compliance reviewer for medical device promotional content.

DEVICE PROFILE:
- Name: ${profile.name}
- Type: ${profile.deviceType}
- Description: ${profile.oneLiner}
- Indications for Use: ${profile.ifuText}
- Warnings & Risks: ${profile.risksText}
${profile.populationText ? `- Target Population: ${profile.populationText}` : ""}

APPROVED CLAIM LIBRARY:
${claimsList || "No approved claims defined."}

PROMOTIONAL RULES:
${rulesList || "No promotional rules defined."}

INSTRUCTIONS:
1. Read the promotional content carefully.
2. Identify each claim or statement in the content.
3. For each problematic statement, check if it:
   a. Matches or is supported by an approved claim
   b. Violates any promotional rule
   c. Makes unsupported performance/safety claims
   d. Uses superlatives, absolutes, or guarantees without substantiation
   e. References populations/settings outside cleared indications
4. For each issue found, provide:
   - The exact original text from the content
   - The type: Performance, Safety, Marketing, or Procedural
   - A short issue label (e.g., "Unsubstantiated Claim", "Absolutes / Superlatives", "Off-Label Indication")
   - Severity: high (regulatory risk), medium (needs revision), low (minor wording)
   - A brief reason explaining why it's flagged
   - A suggested rewrite that would be compliant
   - Approximate character positions (start, end) of the flagged text in the content

GUARDRAILS:
- Only flag issues grounded in the device profile, approved claims, and rules above.
- Do not impersonate a regulatory authority — frame findings as recommendations.
- Include a disclaimer that this is AI-assisted review and does not replace human MLR review.

Respond ONLY with valid JSON matching this schema:
{
  "results": [
    {
      "id": "string",
      "original": "exact flagged text",
      "type": "Performance|Safety|Marketing|Procedural",
      "issue": "short label",
      "severity": "high|medium|low",
      "reason": "explanation",
      "suggestion": "compliant rewrite",
      "start": 0,
      "end": 10
    }
  ]
}

If no issues are found, return: { "results": [] }`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `Please review the following promotional content for compliance issues:\n\n---\n${content}\n---`,
      },
    ],
    system: systemPrompt,
  });

  // Extract text from response
  const textBlock = response.content.find(b => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return { results: [], summary: { total: 0, high: 0, medium: 0, low: 0 } };
  }

  try {
    // Extract JSON from potential markdown code blocks
    let jsonStr = textBlock.text.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);
    const results: AnalysisResult[] = (parsed.results || []).map((r: any, i: number) => ({
      id: r.id || String(i + 1),
      original: r.original || "",
      type: r.type || "Marketing",
      issue: r.issue || "Issue",
      severity: r.severity || "medium",
      reason: r.reason || "",
      suggestion: r.suggestion || "",
      start: typeof r.start === "number" ? r.start : 0,
      end: typeof r.end === "number" ? r.end : 0,
    }));

    return {
      results,
      summary: {
        total: results.length,
        high: results.filter(r => r.severity === "high").length,
        medium: results.filter(r => r.severity === "medium").length,
        low: results.filter(r => r.severity === "low").length,
      },
    };
  } catch (e) {
    console.error("Failed to parse Claude response:", e, textBlock.text);
    return { results: [], summary: { total: 0, high: 0, medium: 0, low: 0 } };
  }
}
