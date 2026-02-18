import Anthropic from "@anthropic-ai/sdk";
import type { ProductProfile, CoreClaim, PromoRule, AnalysisResult, AnalysisResponse, DriftType, DriftLevel, ExposureTag } from "@shared/schema";

const anthropic = new Anthropic();

const VALID_DRIFT_TYPES: DriftType[] = [
  "Diagnostic Drift",
  "Therapeutic Drift",
  "Preventive Drift",
  "Standalone Drift",
  "Classification Escalation",
  "Population Expansion",
  "Use Environment Expansion",
  "Intended Use Redefinition",
];

const VALID_EXPOSURE_TAGS: ExposureTag[] = [
  "Substantiation Exposure",
  "Liability Exposure",
  "Advertising Exposure",
];

const DRIFT_TYPE_TO_LEGACY: Record<DriftType, AnalysisResult["type"]> = {
  "Diagnostic Drift": "Safety",
  "Therapeutic Drift": "Safety",
  "Preventive Drift": "Safety",
  "Standalone Drift": "Procedural",
  "Classification Escalation": "Performance",
  "Population Expansion": "Marketing",
  "Use Environment Expansion": "Marketing",
  "Intended Use Redefinition": "Procedural",
};

function driftLevelToSeverity(level: DriftLevel): "high" | "medium" | "low" {
  if (level >= 3) return "high";
  if (level === 2) return "medium";
  return "low";
}

function buildSystemPrompt(
  profile: ProductProfile,
  claims: CoreClaim[],
  rules: PromoRule[]
): string {
  const claimsList = claims.map((c, i) => `${i + 1}. "${c.claimText}" [type: ${c.claimType}]`).join("\n");
  const rulesList = rules.map((r, i) => `${i + 1}. ${r.ruleText}`).join("\n");

  return `You are a Medical Device Regulatory Compliance Reviewer. You analyze promotional and marketing materials for medical devices to detect claims that exceed the device's FDA-cleared boundaries.

You MUST find and flag every problematic statement. Marketing teams commonly embed off-label claims, exaggerated efficacy language, unsupported comparative claims, and unapproved population extensions into promotional copy. Your job is to catch ALL of them.

═══════════════════════════════════════
DEVICE REGULATORY PROFILE
═══════════════════════════════════════

Device Name: ${profile.name}
Device Type: ${profile.deviceType}
Description: ${profile.oneLiner}

INDICATIONS FOR USE (IFU) — the cleared clinical scope:
${profile.ifuText}

WARNINGS, RISKS & CONTRAINDICATIONS:
${profile.risksText}

${profile.populationText ? `CLEARED POPULATION:\n${profile.populationText}` : "CLEARED POPULATION: Not explicitly defined — restrict to what the IFU states."}

═══════════════════════════════════════
APPROVED CLAIM LIBRARY
═══════════════════════════════════════
${claimsList || "No pre-approved claims defined. All claims must be evaluated against the IFU."}

═══════════════════════════════════════
PROMOTIONAL RULES & GUARDRAILS
═══════════════════════════════════════
${rulesList || "No specific rules defined. Apply standard FDA promotional guidance."}

═══════════════════════════════════════
WHAT TO FLAG
═══════════════════════════════════════

Scan every sentence and phrase in the promotional content. Flag any statement that:

1. EFFICACY & PERFORMANCE CLAIMS
   - Claims the device "cures", "treats", "heals", "eliminates", or "prevents" conditions beyond the IFU
   - Uses superlatives: "best", "most effective", "superior", "leading", "#1", "revolutionary"
   - States or implies clinical outcomes not supported by the IFU (e.g., survival rates, cure rates)
   - Claims performance metrics without citing supporting evidence

2. OFF-LABEL USE
   - References conditions, diseases, or symptoms not in the IFU
   - Implies the device can be used for purposes beyond its cleared indication
   - Suggests the device replaces a different class of device or treatment modality

3. POPULATION & SETTING EXPANSION
   - Mentions patient populations not specified in the IFU (pediatric, geriatric, pregnant, etc.)
   - Implies use in clinical settings beyond what is cleared (home use vs. clinical, OR vs. bedside)
   - Extends geographic or regulatory scope beyond cleared regions

4. COMPARATIVE & SUPERIORITY CLAIMS
   - Compares to competitor devices without substantiation
   - Claims superiority over alternative treatments or standard of care
   - Uses language like "better than", "outperforms", "replaces the need for"

5. SAFETY MISREPRESENTATION
   - Minimizes known risks or contraindications
   - Omits required warnings
   - Claims the device is "safe" without qualification
   - Implies zero risk or minimal side effects

6. STANDALONE AUTHORITY
   - Implies the device can make clinical decisions independently
   - Suggests the device reduces or eliminates the need for physician oversight
   - Claims autonomous diagnostic or therapeutic capability

7. PROMOTIONAL RULE VIOLATIONS
   - Any statement that violates the promotional rules defined above
   - Unapproved testimonials or endorsements
   - Misleading statistics or data presentation

═══════════════════════════════════════
ANALYSIS OUTPUT FORMAT
═══════════════════════════════════════

For each flagged statement, classify it with:

driftType — one of exactly these values:
  "Diagnostic Drift" — implies diagnostic capability beyond IFU
  "Therapeutic Drift" — implies therapeutic effect beyond IFU
  "Preventive Drift" — implies disease prevention beyond IFU
  "Standalone Drift" — implies standalone clinical decision-making
  "Classification Escalation" — implies higher-class device performance
  "Population Expansion" — extends to populations outside cleared scope
  "Use Environment Expansion" — extends to settings outside cleared scope
  "Intended Use Redefinition" — fundamentally redefines the device's purpose

driftLevel — integer 0-4:
  0 = Aligned (within boundary but worth noting)
  1 = Amplification (exaggerates but stays near boundary)
  2 = Implied (implies boundary crossing without explicit statement)
  3 = Explicit (explicitly crosses boundary)
  4 = Class-Changing (would materially change regulatory classification)

exposureTags — array of zero or more:
  "Substantiation Exposure" — claim lacks adequate evidence support
  "Liability Exposure" — claim creates product liability risk
  "Advertising Exposure" — claim violates advertising/promotion regulations

IMPORTANT INSTRUCTIONS:
- The "original" field MUST be the EXACT text from the promotional content, copied character-for-character. Do not paraphrase or summarize.
- The "start" field must be the character index where the flagged text begins in the input content.
- The "end" field must be the character index where the flagged text ends.
- The "suggestion" field must provide a compliant rewrite that preserves the marketing intent while staying within the device's cleared boundaries.
- Be thorough — marketing teams WILL push boundaries. Flag everything that crosses a line.
- Do NOT skip issues because they seem minor. If a claim is not directly supported by the IFU, flag it.

Respond with ONLY a JSON object (no markdown, no code fences, no explanation before or after):
{
  "results": [
    {
      "id": "1",
      "original": "exact flagged text from content",
      "driftType": "one of the 8 drift types",
      "driftLevel": 0,
      "exposureTags": [],
      "boundaryReference": "which boundary was crossed and how",
      "issue": "short label",
      "reason": "why this crosses the boundary",
      "suggestion": "compliant rewrite",
      "start": 0,
      "end": 10
    }
  ]
}

If no violations exist, return: {"results": []}`;
}

export async function analyzeContent(
  profile: ProductProfile,
  claims: CoreClaim[],
  rules: PromoRule[],
  content: string
): Promise<AnalysisResponse> {
  const systemPrompt = buildSystemPrompt(profile, claims, rules);

  console.log(`[analysis] Starting analysis for profile "${profile.name}" (id=${profile.id})`);
  console.log(`[analysis] Content length: ${content.length} chars`);
  console.log(`[analysis] Claims: ${claims.length}, Rules: ${rules.length}`);

  let response: Anthropic.Message;
  try {
    response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: `Analyze the following promotional content for regulatory compliance violations. Flag every statement that exceeds the device's cleared boundaries.\n\nPROMOTIONAL CONTENT:\n${content}`,
        },
      ],
      system: systemPrompt,
    });
  } catch (err: any) {
    console.error("[analysis] Anthropic API call failed:", err?.message || err);
    throw new Error(`AI analysis failed: ${err?.message || "Could not reach the analysis service"}`);
  }

  // Extract text from response
  const textBlock = response.content.find(b => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    console.error("[analysis] No text block in Claude response. Content types:", response.content.map(b => b.type));
    throw new Error("AI analysis returned an empty response");
  }

  console.log(`[analysis] Raw response length: ${textBlock.text.length} chars`);

  // Extract JSON from the response
  let jsonStr = textBlock.text.trim();

  // Try markdown code block first
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  } else {
    // Try to find a JSON object in surrounding text
    const braceMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (braceMatch) {
      jsonStr = braceMatch[0];
    }
  }

  let parsed: any;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    console.error("[analysis] Failed to parse JSON from Claude response:");
    console.error("[analysis] Extracted JSON string:", jsonStr.substring(0, 500));
    console.error("[analysis] Parse error:", e);
    throw new Error("AI analysis returned an invalid response. Please try again.");
  }

  if (!parsed.results || !Array.isArray(parsed.results)) {
    console.error("[analysis] Parsed response missing results array:", Object.keys(parsed));
    throw new Error("AI analysis response was malformed. Please try again.");
  }

  console.log(`[analysis] Parsed ${parsed.results.length} findings`);

  const results: AnalysisResult[] = parsed.results.map((r: any, i: number) => {
    const driftType: DriftType = VALID_DRIFT_TYPES.includes(r.driftType)
      ? r.driftType
      : "Intended Use Redefinition";

    const rawLevel = typeof r.driftLevel === "number" ? r.driftLevel : 2;
    const driftLevel: DriftLevel = (rawLevel >= 0 && rawLevel <= 4 ? rawLevel : 2) as DriftLevel;

    const exposureTags: ExposureTag[] = Array.isArray(r.exposureTags)
      ? r.exposureTags.filter((t: any) => VALID_EXPOSURE_TAGS.includes(t))
      : [];

    const severity = driftLevelToSeverity(driftLevel);
    const type = DRIFT_TYPE_TO_LEGACY[driftType];

    return {
      id: r.id || String(i + 1),
      original: r.original || "",
      type,
      issue: r.issue || "Boundary Violation",
      severity,
      reason: r.reason || "",
      suggestion: r.suggestion || "",
      start: typeof r.start === "number" ? r.start : 0,
      end: typeof r.end === "number" ? r.end : 0,
      driftType,
      driftLevel,
      exposureTags,
      boundaryReference: r.boundaryReference || "",
    };
  });

  // Compute drift level counts
  const driftLevelCounts = new Map<DriftLevel, number>();
  for (const r of results) {
    driftLevelCounts.set(r.driftLevel, (driftLevelCounts.get(r.driftLevel) || 0) + 1);
  }
  const driftLevels = Array.from(driftLevelCounts.entries())
    .map(([level, count]) => ({ level, count }))
    .sort((a, b) => a.level - b.level);

  console.log(`[analysis] Complete: ${results.length} issues (high=${results.filter(r => r.severity === "high").length}, medium=${results.filter(r => r.severity === "medium").length}, low=${results.filter(r => r.severity === "low").length})`);

  return {
    results,
    summary: {
      total: results.length,
      high: results.filter(r => r.severity === "high").length,
      medium: results.filter(r => r.severity === "medium").length,
      low: results.filter(r => r.severity === "low").length,
      driftLevels,
    },
  };
}
