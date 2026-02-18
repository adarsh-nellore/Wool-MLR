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

export async function analyzeContent(
  profile: ProductProfile,
  claims: CoreClaim[],
  rules: PromoRule[],
  content: string
): Promise<AnalysisResponse> {
  const claimsList = claims.map((c, i) => `${i + 1}. "${c.claimText}" [type: ${c.claimType}]`).join("\n");
  const rulesList = rules.map((r, i) => `${i + 1}. ${r.ruleText}`).join("\n");

  const systemPrompt = `You are a Medical Device Boundary Integrity Engine. Your job is to detect regulatory boundary drift — how far promotional claims move outside a device's declared regulatory identity.

DEVICE BOUNDARY MODEL:
- Device Name: ${profile.name}
- Device Type: ${profile.deviceType}
- Description: ${profile.oneLiner}
- Clinical Authority Boundary (Indications for Use): ${profile.ifuText}
- Risk/Safety Boundary (Warnings & Risks): ${profile.risksText}
${profile.populationText ? `- Population Boundary: ${profile.populationText}` : "- Population Boundary: Not explicitly defined — default to cleared labeling only."}
- Classification Ceiling: Determined by device type and indications above.

APPROVED CLAIM LIBRARY (within boundary):
${claimsList || "No approved claims defined."}

PROMOTIONAL RULES:
${rulesList || "No promotional rules defined."}

ANALYSIS INSTRUCTIONS:
For each claim or statement in the promotional content:

1. Parse the claim's verb, object, and implied clinical authority.
2. Map the claim against the device boundary model:
   - Does the verb imply diagnostic, therapeutic, or preventive authority beyond the IFU?
   - Does the object reference populations, settings, or conditions outside cleared scope?
   - Does the claim imply standalone clinical utility not supported by the device class?
   - Does the claim elevate the device's effective classification?
3. Assign a driftType from this exact list:
   - "Diagnostic Drift" — claim implies diagnostic capability beyond IFU
   - "Therapeutic Drift" — claim implies therapeutic effect beyond IFU
   - "Preventive Drift" — claim implies disease prevention beyond IFU
   - "Standalone Drift" — claim implies standalone clinical decision-making
   - "Classification Escalation" — claim implies higher-class performance
   - "Population Expansion" — claim extends to populations outside cleared scope
   - "Use Environment Expansion" — claim extends to settings outside cleared scope
   - "Intended Use Redefinition" — claim fundamentally redefines the device's purpose
4. Assign a driftLevel (integer 0-4):
   - 0 = Aligned — claim is within boundary
   - 1 = Amplification — claim exaggerates but stays near boundary
   - 2 = Implied — claim implies boundary crossing without explicit statement
   - 3 = Explicit — claim explicitly crosses boundary
   - 4 = Class-Changing — claim would materially change regulatory classification
5. Assign exposureTags (array, zero or more):
   - "Substantiation Exposure" — claim lacks adequate evidence support
   - "Liability Exposure" — claim creates product liability risk
   - "Advertising Exposure" — claim violates advertising/promotion regulations
6. Provide a boundaryReference — one sentence explaining which specific boundary was crossed and how.

MATERIALITY FILTER:
Only flag a claim if the boundary drift would materially affect:
- The device's regulatory pathway or clearance status
- Enforcement risk (FDA warning letter, recall, injunction)
- Litigation exposure (product liability, false advertising)
Do NOT flag minor stylistic issues or wording preferences that have no regulatory consequence.

Respond ONLY with valid JSON matching this schema:
{
  "results": [
    {
      "id": "string",
      "original": "exact flagged text from the content",
      "driftType": "one of the 8 drift types above",
      "driftLevel": 0-4,
      "exposureTags": ["array of exposure tags"],
      "boundaryReference": "one sentence explaining the boundary crossed",
      "issue": "short label (e.g., Off-Label Diagnosis Claim)",
      "reason": "explanation of why this crosses the boundary",
      "suggestion": "compliant rewrite that stays within boundary",
      "start": 0,
      "end": 10
    }
  ]
}

If no material boundary violations are found, return: { "results": [] }`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    messages: [
      {
        role: "user",
        content: `Please review the following promotional content for regulatory boundary violations:\n\n---\n${content}\n---`,
      },
    ],
    system: systemPrompt,
  });

  // Extract text from response
  const textBlock = response.content.find(b => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return { results: [], summary: { total: 0, high: 0, medium: 0, low: 0, driftLevels: [] } };
  }

  try {
    // Extract JSON from potential markdown code blocks or surrounding text
    let jsonStr = textBlock.text.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    } else {
      // Try to extract JSON object if there's surrounding text
      const braceMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (braceMatch) {
        jsonStr = braceMatch[0];
      }
    }

    const parsed = JSON.parse(jsonStr);
    const results: AnalysisResult[] = (parsed.results || []).map((r: any, i: number) => {
      const driftType: DriftType = VALID_DRIFT_TYPES.includes(r.driftType)
        ? r.driftType
        : "Intended Use Redefinition";

      const rawLevel = typeof r.driftLevel === "number" ? r.driftLevel : 1;
      const driftLevel: DriftLevel = (rawLevel >= 0 && rawLevel <= 4 ? rawLevel : 1) as DriftLevel;

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
  } catch (e) {
    console.error("Failed to parse Claude response:", e, textBlock.text);
    return { results: [], summary: { total: 0, high: 0, medium: 0, low: 0, driftLevels: [] } };
  }
}
