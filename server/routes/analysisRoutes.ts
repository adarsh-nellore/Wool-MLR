import type { Express, Request } from "express";
import rateLimit from "express-rate-limit";
import { storage } from "../storage";
import { analyzeContentSchema, analyzeUploadSchema } from "@shared/schema";
import type { StoredImage, StoredDocument } from "@shared/schema";
import { analyzeContent } from "../services/analysisService";
import upload from "../middleware/upload";
import { parseFile } from "../services/documentParser";
import type { ExtractedImage } from "../services/documentParser";

const uploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many upload requests. Please try again later." },
});

export function registerAnalysisRoutes(app: Express): void {
  // Existing text-only endpoint
  app.post("/api/analyze", async (req: Request, res) => {
    try {
      const userId = (req as any).user?.claims?.sub || "dev-user";

      const parsed = analyzeContentSchema.safeParse(req.body);
      if (!parsed.success) {
        console.error("[analyze route] Validation failed:", parsed.error.errors);
        return res.status(400).json({ error: "Validation failed", details: parsed.error.errors });
      }

      const { profileId, content, ephemeral, medium } = parsed.data;
      console.log(`[analyze route] profileId=${profileId}, content length=${content.length}, userId=${userId}, ephemeral=${!!ephemeral}`);

      // Verify profile ownership
      const profile = await storage.getProfileById(profileId);
      if (!profile) {
        console.error(`[analyze route] Profile ${profileId} not found`);
        return res.status(404).json({ error: "Profile not found" });
      }
      if (profile.userId !== userId) {
        console.error(`[analyze route] Profile ${profileId} belongs to ${profile.userId}, not ${userId}`);
        return res.status(403).json({ error: "Forbidden" });
      }

      console.log(`[analyze route] Profile loaded: "${profile.name}", IFU length=${profile.ifuText.length}`);

      // Load claims and rules
      const claims = await storage.getClaimsByProfileId(profileId);
      const rules = await storage.getRulesByProfileId(profileId);
      console.log(`[analyze route] Claims: ${claims.length}, Rules: ${rules.length}`);

      // Run analysis
      const result = await analyzeContent(profile, claims, rules, content, undefined, undefined, medium);
      console.log(`[analyze route] Analysis complete: ${result.summary.total} issues found`);

      // Persist analysis under this device profile (skip for ephemeral/sample runs)
      if (!ephemeral) {
        await storage.saveAnalysis(profileId, content, result);
      }

      res.json(result);
    } catch (error: any) {
      console.error("[analysis route] Error:", error?.message || error);
      const message = error?.message || "Analysis failed";
      const status = message.includes("Unauthorized") || message.includes("API key") ? 503 : 500;
      res.status(status).json({ error: message });
    }
  });

  // New file upload endpoint
  app.post("/api/analyze/upload", uploadRateLimit, upload.array("files", 5), async (req: Request, res) => {
    try {
      const userId = (req as any).user?.claims?.sub || "dev-user";

      const parsed = analyzeUploadSchema.safeParse(req.body);
      if (!parsed.success) {
        console.error("[analyze/upload route] Validation failed:", parsed.error.errors);
        return res.status(400).json({ error: "Validation failed", details: parsed.error.errors });
      }

      const { profileId, medium } = parsed.data;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      console.log(`[analyze/upload route] profileId=${profileId}, files=${files.length}, userId=${userId}`);

      // Verify profile ownership
      const profile = await storage.getProfileById(profileId);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      if (profile.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      // Load claims and rules
      const claims = await storage.getClaimsByProfileId(profileId);
      const rules = await storage.getRulesByProfileId(profileId);

      // Parse all files
      const parsedDocs = await Promise.all(
        files.map(file => parseFile(file.buffer, file.mimetype, file.originalname))
      );

      // Capture original document from first file (for rendering in client)
      const firstFile = files[0];
      let originalDocument: StoredDocument | undefined;
      const renderableMimes = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp", "image/gif"]);
      if (renderableMimes.has(firstFile.mimetype)) {
        originalDocument = {
          data: firstFile.buffer.toString("base64"),
          mimeType: firstFile.mimetype,
          fileName: firstFile.originalname,
          pageCount: parsedDocs[0].pageTextRanges?.length,
        };
      }

      // Combine text and images from all documents
      const combinedText = parsedDocs.map(doc => doc.text).filter(t => t.trim()).join("\n\n");
      const allImages: ExtractedImage[] = parsedDocs.flatMap(doc => doc.images);

      // Collect page text ranges from first PDF doc
      const pageTextRanges = parsedDocs[0]?.pageTextRanges;

      console.log(`[analyze/upload route] Extracted text: ${combinedText.length} chars, images: ${allImages.length}`);

      if (!combinedText.trim() && allImages.length === 0) {
        return res.status(400).json({ error: "No content could be extracted from the uploaded files" });
      }

      // Run analysis (text + images in parallel)
      const contentForAnalysis = combinedText.trim() || "(No text content - image-only analysis)";
      const result = await analyzeContent(
        profile, claims, rules,
        contentForAnalysis,
        allImages.length > 0 ? allImages : undefined,
        pageTextRanges,
        medium
      );

      console.log(`[analyze/upload route] Analysis complete: ${result.summary.total} issues found`);

      // Convert ExtractedImages to StoredImages for persistence
      const storedImages: StoredImage[] = allImages.map(img => ({
        id: img.id,
        data: img.data,
        mediaType: img.mediaType,
        sourceLabel: img.sourceLabel,
      }));

      // Strip PDF binary from persisted storage (keep metadata, drop heavy base64 data)
      const documentForPersist = originalDocument && originalDocument.mimeType === "application/pdf"
        ? { ...originalDocument, data: "" }
        : originalDocument;
      const storedImagesForPersist = storedImages.slice(0, 10);

      // Persist analysis
      await storage.saveAnalysis(profileId, contentForAnalysis, result, storedImagesForPersist, documentForPersist);

      // Return extended response with extracted text and images
      res.json({
        ...result,
        extractedText: contentForAnalysis,
        images: storedImages,
        originalDocument,
      });
    } catch (error: any) {
      console.error("[analyze/upload route] Error:", error?.message || error);
      const message = error?.message || "File analysis failed";
      const status = message.includes("Unauthorized") || message.includes("API key") ? 503 : 500;
      res.status(status).json({ error: message });
    }
  });
}
