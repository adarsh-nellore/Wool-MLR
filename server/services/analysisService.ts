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

  return `You are a paranoid, hyper-vigilant FDA Medical Device Regulatory Compliance Reviewer performing a Medical-Legal-Regulatory (MLR) review.

YOUR DEFAULT ASSUMPTION: Every sentence in a promotional document is a compliance risk UNTIL you can prove it is safe. You must analyze EVERY sentence. Only skip a sentence if it is purely factual with zero promotional framing (e.g., a device model number, a literal address, or a regulatory submission ID).

You are reviewing promotional materials for this device:

DEVICE: ${profile.name} (${profile.deviceType})
DESCRIPTION: ${profile.oneLiner}

INDICATIONS FOR USE (IFU) — this is the ONLY cleared clinical scope:
${profile.ifuText}

WARNINGS, RISKS & CONTRAINDICATIONS:
${profile.risksText}

${profile.populationText ? `CLEARED POPULATION:\n${profile.populationText}` : "CLEARED POPULATION: Not explicitly defined — restrict to what the IFU states."}

APPROVED CLAIMS (ONLY these exact phrasings are pre-cleared):
${claimsList || "None defined. Every claim must be evaluated against the IFU."}

PROMOTIONAL RULES:
${rulesList || "None defined. Apply standard FDA promotional guidance."}

═══════════════════════════════════════
SENTENCE-BY-SENTENCE REVIEW PROTOCOL
═══════════════════════════════════════

For EACH sentence in the promotional content, you MUST ask yourself:
1. Does this sentence make ANY claim about what the device does, how well it works, who can use it, or where it can be used?
2. Is every word in this sentence DIRECTLY and EXPLICITLY supported by the IFU text above?
3. Does this sentence use ANY promotional, aspirational, emotional, or persuasive language?
4. Would an FDA Warning Letter reviewer find ANY issue with this sentence?

If the answer to #1, #3, or #4 is YES, or the answer to #2 is NO → FLAG IT.

═══════════════════════════════════════
WHAT YOU MUST FLAG (non-exhaustive)
═══════════════════════════════════════

HIGH RISK (driftLevel 3-4):
- Claims beyond IFU scope (cures, treats, prevents conditions not in IFU)
- Off-label use implications
- Unapproved populations or settings
- Superiority/comparative claims without substantiation
- Safety minimization or missing required warnings
- Claims of autonomous clinical decision-making

MEDIUM RISK (driftLevel 2):
- Implied boundary crossing through context or framing
- Benefit claims that stretch IFU language
- Statistical claims without source citations
- Implied clinical outcomes not stated in IFU
- Testimonial-style language or implied endorsements

LOW RISK (driftLevel 0-1) — YOU MUST STILL FLAG THESE:
- "innovative", "advanced", "state-of-the-art", "next-generation", "cutting-edge", "breakthrough", "revolutionary", "leading", "premier", "world-class"
- "easy to use", "intuitive", "seamless", "reliable", "trusted", "proven"
- "designed to", "may help", "has the potential to", "can contribute to", "aimed at"
- "life-changing", "transform", "don't wait", "game-changer"
- "trusted by", "widely adopted", "preferred by", "growing number of"
- ANY benefit statement without a nearby risk/limitation disclosure
- ANY adjective that enhances perceived efficacy ("rapid", "fast", "precise", "accurate", "effective", "powerful", "superior")
- Marketing puffery that an FDA reviewer could question
- Promotional tone or framing of factual information
- Missing fair balance (benefits without risks nearby)
- Brand positioning language that implies clinical superiority

═══════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════

driftType — one of exactly:
  "Diagnostic Drift" | "Therapeutic Drift" | "Preventive Drift" | "Standalone Drift" | "Classification Escalation" | "Population Expansion" | "Use Environment Expansion" | "Intended Use Redefinition"

driftLevel — 0 (Aligned, worth noting) | 1 (Amplification) | 2 (Implied crossing) | 3 (Explicit crossing) | 4 (Class-Changing)

exposureTags — zero or more of: "Substantiation Exposure" | "Liability Exposure" | "Advertising Exposure"

CRITICAL RULES:
- "original" MUST be the EXACT text copied character-for-character from the input. Do NOT paraphrase.
- "start" must be the character offset where the flagged text begins IN THE CHUNK provided.
- "end" must be the character offset where the flagged text ends IN THE CHUNK provided.
- "suggestion" must provide a compliant rewrite preserving marketing intent.
- You MUST produce a finding for EVERY sentence that has any risk. Flag aggressively.
- It is MUCH worse to miss a finding than to over-flag. When in doubt, FLAG IT.
- A single sentence can have MULTIPLE findings if it has multiple issues (e.g., puffery AND missing fair balance).

Respond with ONLY a JSON object (no markdown, no code fences):
{
  "results": [
    {
      "id": "1",
      "original": "exact text from content",
      "driftType": "one of the 8 types",
      "driftLevel": 0,
      "exposureTags": [],
      "boundaryReference": "which boundary and how",
      "issue": "short 2-4 word label",
      "reason": "1-2 sentence explanation",
      "suggestion": "compliant rewrite",
      "start": 0,
      "end": 10
    }
  ]
}`;
}

/**
 * Split content into sentences for analysis.
 */
function splitSentences(content: string): string[] {
  return content.match(/[^.!?\n]+[.!?\n]+|[^.!?\n]+$/g)?.map(s => s.trim()).filter(s => s.length > 0) || [content];
}

/**
 * Split sentences into chunks of roughly `chunkSize` sentences,
 * preserving overlap for context. Returns chunks with their
 * character offset in the original content.
 */
function buildChunks(
  content: string,
  sentences: string[],
  chunkSize: number = 12,
  overlap: number = 2
): { text: string; offset: number; sentenceIndices: number[] }[] {
  if (sentences.length <= chunkSize + 4) {
    // Small enough for a single chunk
    return [{ text: content, offset: 0, sentenceIndices: sentences.map((_, i) => i) }];
  }

  const chunks: { text: string; offset: number; sentenceIndices: number[] }[] = [];
  let i = 0;

  while (i < sentences.length) {
    const end = Math.min(i + chunkSize, sentences.length);
    const chunkSentences = sentences.slice(i, end);
    const sentenceIndices = Array.from({ length: end - i }, (_, idx) => i + idx);

    // Find the chunk text in the original content for accurate offsets
    const firstSentence = chunkSentences[0];
    const lastSentence = chunkSentences[chunkSentences.length - 1];

    // Find start position (search from expected area)
    let startPos = 0;
    if (chunks.length > 0) {
      // Start searching from where the last chunk ended (minus overlap)
      const lastChunk = chunks[chunks.length - 1];
      startPos = content.indexOf(firstSentence, lastChunk.offset);
    } else {
      startPos = content.indexOf(firstSentence);
    }
    if (startPos === -1) startPos = 0;

    // Find end position
    let endPos = content.indexOf(lastSentence, startPos);
    if (endPos === -1) endPos = startPos;
    endPos += lastSentence.length;

    const chunkText = content.substring(startPos, endPos);
    chunks.push({ text: chunkText, offset: startPos, sentenceIndices });

    // Advance with overlap
    i = end - overlap;
    if (i <= (chunks.length > 1 ? chunks[chunks.length - 2].sentenceIndices[chunks[chunks.length - 2].sentenceIndices.length - 1] : -1)) {
      i = end; // Prevent infinite loop
    }
    if (end >= sentences.length) break;
  }

  return chunks;
}

function buildChunkUserPrompt(chunkText: string, chunkIndex: number, totalChunks: number): string {
  const sentences = splitSentences(chunkText);
  const numbered = sentences.map((s, i) => `[${i + 1}] ${s}`).join("\n");

  return `REVIEW EVERY SENTENCE IN THIS SECTION (chunk ${chunkIndex + 1} of ${totalChunks}). For EACH sentence, determine if it poses ANY regulatory compliance risk. Your default assumption is that it DOES — only clear a sentence if it is purely factual with zero promotional framing.

Here are the sentences for your review:

${numbered}

EXACT TEXT FOR THIS CHUNK (use this for "original" field values — copy text character-for-character):
${chunkText}

INSTRUCTIONS:
- Analyze EVERY sentence above. You should have at least one finding for most sentences.
- For each sentence, ask: does it contain ANY promotional language, unsupported claims, puffery, missing fair balance, implied benefits, or regulatory risk?
- Flag ALL puffery words (innovative, advanced, proven, reliable, trusted, effective, etc.) individually.
- Flag ALL benefit statements that lack nearby risk disclosures.
- Flag ALL implied clinical outcomes even if they seem minor.
- A single sentence may generate MULTIPLE findings if it has multiple issues.
- "start" and "end" offsets are relative to the EXACT TEXT FOR THIS CHUNK above (starting at 0).
- It is MUCH worse to MISS a compliance issue than to over-flag. When in doubt, flag it.`;
}

function buildGapSweepPrompt(
  uncoveredSentences: { index: number; text: string }[],
  fullContent: string
): string {
  const numbered = uncoveredSentences.map(s => `[${s.index + 1}] ${s.text}`).join("\n");

  return `VERIFICATION SWEEP: The following sentences from a promotional document were NOT flagged in the initial review. Your job is to re-examine each one and flag ANY that have compliance risk. Remember: the DEFAULT assumption is that every sentence IS risky.

SENTENCES TO RE-EXAMINE:
${numbered}

FULL DOCUMENT CONTEXT:
${fullContent}

For each sentence, ask:
1. Does it make ANY claim (even implied) about device function, efficacy, safety, or population?
2. Does it use ANY promotional, aspirational, or persuasive language?
3. Is there ANY puffery, marketing tone, or missing fair balance?
4. Would an FDA reviewer question it?

If YES to any → FLAG IT. Only clear a sentence if it is a literal factual statement (model number, address, regulatory ID).

Use the FULL DOCUMENT CONTEXT for exact "original" text and character offsets (start/end relative to FULL DOCUMENT CONTEXT starting at 0).

Respond with ONLY a JSON object (no markdown, no code fences):
{
  "results": [...]
}

If truly no issues are found, return {"results": []}.`;
}

/**
 * Parse a JSON response from the model, handling markdown fences and edge cases.
 */
function parseJsonResponse(text: string): { results: any[] } {
  let jsonStr = text.trim();

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

  // Handle truncated JSON: if it ends mid-object, try to close it
  if (!jsonStr.endsWith("}")) {
    // Find the last complete object
    const lastCompleteObj = jsonStr.lastIndexOf("},");
    if (lastCompleteObj !== -1) {
      jsonStr = jsonStr.substring(0, lastCompleteObj + 1) + "]}";
    } else {
      const lastObj = jsonStr.lastIndexOf("}");
      if (lastObj !== -1) {
        jsonStr = jsonStr.substring(0, lastObj + 1) + "]}";
      }
    }
  }

  const parsed = JSON.parse(jsonStr);
  if (!parsed.results || !Array.isArray(parsed.results)) {
    throw new Error("Response missing results array");
  }
  return parsed;
}

/**
 * Run a single analysis API call and return raw results.
 */
async function runAnalysisCall(
  systemPrompt: string,
  userPrompt: string,
  label: string
): Promise<any[]> {
  let response: Anthropic.Message;
  try {
    response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 16384,
      messages: [{ role: "user", content: userPrompt }],
      system: systemPrompt,
    });
  } catch (err: any) {
    console.error(`[analysis:${label}] API call failed:`, err?.message || err);
    throw new Error(`AI analysis failed: ${err?.message || "Could not reach the analysis service"}`);
  }

  const textBlock = response.content.find(b => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    console.error(`[analysis:${label}] No text block in response`);
    return [];
  }

  console.log(`[analysis:${label}] Response length: ${textBlock.text.length} chars, stop_reason: ${response.stop_reason}`);

  try {
    const parsed = parseJsonResponse(textBlock.text);
    console.log(`[analysis:${label}] Parsed ${parsed.results.length} findings`);
    return parsed.results;
  } catch (e) {
    console.error(`[analysis:${label}] JSON parse failed:`, e);
    console.error(`[analysis:${label}] Raw text (first 500):`, textBlock.text.substring(0, 500));
    return [];
  }
}

/**
 * Normalize a raw finding into an AnalysisResult, adjusting offsets
 * for chunk position in the full document.
 */
function normalizeResult(r: any, index: number, chunkOffset: number): AnalysisResult {
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
    id: String(index + 1),
    original: r.original || "",
    type,
    issue: r.issue || "Boundary Violation",
    severity,
    reason: r.reason || "",
    suggestion: r.suggestion || "",
    start: typeof r.start === "number" ? r.start + chunkOffset : 0,
    end: typeof r.end === "number" ? r.end + chunkOffset : 0,
    driftType,
    driftLevel,
    exposureTags,
    boundaryReference: r.boundaryReference || "",
  };
}

/**
 * Deduplicate results that flag the same text span.
 * Keep the higher-severity finding when two overlap significantly.
 */
function deduplicateResults(results: AnalysisResult[]): AnalysisResult[] {
  const seen = new Map<string, AnalysisResult>();

  for (const r of results) {
    // Use normalized original text as the dedup key
    const key = r.original.trim().toLowerCase();
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, r);
    } else {
      // Keep the one with higher severity
      const severityOrder = { high: 3, medium: 2, low: 1, none: 0 };
      if (severityOrder[r.severity] > severityOrder[existing.severity]) {
        seen.set(key, r);
      }
    }
  }

  // Re-index
  const deduped = Array.from(seen.values());
  return deduped.map((r, i) => ({ ...r, id: String(i + 1) }));
}

export async function analyzeContent(
  profile: ProductProfile,
  claims: CoreClaim[],
  rules: PromoRule[],
  content: string
): Promise<AnalysisResponse> {
  const systemPrompt = buildSystemPrompt(profile, claims, rules);
  const sentences = splitSentences(content);
  const chunks = buildChunks(content, sentences);

  console.log(`[analysis] Starting analysis for profile "${profile.name}" (id=${profile.id})`);
  console.log(`[analysis] Content: ${content.length} chars, ${sentences.length} sentences, ${chunks.length} chunk(s)`);
  console.log(`[analysis] Claims: ${claims.length}, Rules: ${rules.length}`);

  // ── Pass 1: Analyze all chunks (in parallel for multi-chunk) ──
  let allRawResults: { result: any; chunkOffset: number }[] = [];

  if (chunks.length === 1) {
    // Single chunk — straightforward
    const userPrompt = buildChunkUserPrompt(chunks[0].text, 0, 1);
    const rawResults = await runAnalysisCall(systemPrompt, userPrompt, "pass1-chunk0");
    allRawResults = rawResults.map(r => ({ result: r, chunkOffset: chunks[0].offset }));
  } else {
    // Multiple chunks — run in parallel
    const chunkPromises = chunks.map((chunk, idx) => {
      const userPrompt = buildChunkUserPrompt(chunk.text, idx, chunks.length);
      return runAnalysisCall(systemPrompt, userPrompt, `pass1-chunk${idx}`).then(
        rawResults => rawResults.map(r => ({ result: r, chunkOffset: chunk.offset }))
      );
    });

    const chunkResults = await Promise.all(chunkPromises);
    allRawResults = chunkResults.flat();
  }

  console.log(`[analysis] Pass 1 total raw findings: ${allRawResults.length}`);

  // Normalize all results with correct offsets
  let results: AnalysisResult[] = allRawResults.map((item, i) =>
    normalizeResult(item.result, i, item.chunkOffset)
  );

  // Deduplicate (overlapping chunks may flag the same text)
  results = deduplicateResults(results);
  console.log(`[analysis] After dedup: ${results.length} findings`);

  // ── Pass 2: Gap sweep — find sentences not covered by any finding ──
  const coveredTexts = results.map(r => r.original.trim().toLowerCase());

  const uncoveredSentences = sentences
    .map((text, index) => ({ text, index }))
    .filter(s => {
      const normalized = s.text.trim().toLowerCase();
      // Check if any finding covers this sentence (exact or substring match)
      for (const covered of coveredTexts) {
        if (covered.includes(normalized) || normalized.includes(covered)) {
          return false;
        }
      }
      // Skip truly trivial sentences (very short, purely structural)
      if (s.text.trim().length < 5) return false;
      return true;
    });

  const coveragePercent = Math.round(((sentences.length - uncoveredSentences.length) / sentences.length) * 100);
  console.log(`[analysis] Coverage after pass 1: ${coveragePercent}% (${uncoveredSentences.length} sentences uncovered)`);

  if (uncoveredSentences.length > 0 && uncoveredSentences.length <= 40) {
    // Run a gap sweep to catch missed risks
    const gapPrompt = buildGapSweepPrompt(uncoveredSentences, content);
    const gapResults = await runAnalysisCall(systemPrompt, gapPrompt, "pass2-gap-sweep");

    if (gapResults.length > 0) {
      console.log(`[analysis] Gap sweep found ${gapResults.length} additional findings`);
      const gapNormalized = gapResults.map((r, i) =>
        normalizeResult(r, results.length + i, 0) // offsets are relative to full content
      );
      results = [...results, ...gapNormalized];
      results = deduplicateResults(results);
    }
  } else if (uncoveredSentences.length > 40) {
    // Too many uncovered — run gap sweep in batches
    const batchSize = 20;
    const gapBatches: { index: number; text: string }[][] = [];
    for (let i = 0; i < uncoveredSentences.length; i += batchSize) {
      gapBatches.push(uncoveredSentences.slice(i, i + batchSize));
    }

    const gapPromises = gapBatches.map((batch, idx) => {
      const gapPrompt = buildGapSweepPrompt(batch, content);
      return runAnalysisCall(systemPrompt, gapPrompt, `pass2-gap-batch${idx}`);
    });

    const gapBatchResults = await Promise.all(gapPromises);
    const allGapResults = gapBatchResults.flat();

    if (allGapResults.length > 0) {
      console.log(`[analysis] Gap sweep batches found ${allGapResults.length} additional findings`);
      const gapNormalized = allGapResults.map((r, i) =>
        normalizeResult(r, results.length + i, 0)
      );
      results = [...results, ...gapNormalized];
      results = deduplicateResults(results);
    }
  }

  console.log(`[analysis] Final result count: ${results.length}`);

  // Sort by position in document
  results.sort((a, b) => a.start - b.start);

  // Re-index after sort
  results = results.map((r, i) => ({ ...r, id: String(i + 1) }));

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
