import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import mammoth from "mammoth";
import sharp from "sharp";
import type { TextItem } from "pdfjs-dist/types/src/display/api";

export interface ExtractedImage {
  id: string;
  data: string; // base64
  mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
  width?: number;
  height?: number;
  sourceLabel: string;
  pageNumber?: number;
  nearbyText?: string;
}

export interface PageTextRange {
  page: number;
  start: number;
  end: number;
}

export interface ParsedDocument {
  text: string;
  images: ExtractedImage[];
  sourceFileName: string;
  sourceFileType: string;
  pageTextRanges?: PageTextRange[];
}

const MAX_IMAGE_DIMENSION = 1568;
const MIN_IMAGE_DIMENSION = 150;

async function optimizeImage(
  buffer: Buffer,
  inputMediaType?: string
): Promise<{ data: string; mediaType: ExtractedImage["mediaType"]; width: number; height: number } | null> {
  try {
    const metadata = await sharp(buffer).metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    // Filter out tiny images (icons, decorative elements)
    if (width < MIN_IMAGE_DIMENSION && height < MIN_IMAGE_DIMENSION) {
      return null;
    }

    let pipeline = sharp(buffer);

    // Resize if exceeds max dimension
    if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
      pipeline = pipeline.resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, {
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    // Convert to PNG for consistency (unless already JPEG/WebP)
    let mediaType: ExtractedImage["mediaType"] = "image/png";
    if (inputMediaType === "image/jpeg" || metadata.format === "jpeg") {
      pipeline = pipeline.jpeg({ quality: 85 });
      mediaType = "image/jpeg";
    } else if (inputMediaType === "image/webp" || metadata.format === "webp") {
      pipeline = pipeline.webp({ quality: 85 });
      mediaType = "image/webp";
    } else if (inputMediaType === "image/gif" || metadata.format === "gif") {
      pipeline = pipeline.png();
      mediaType = "image/gif";
    } else {
      pipeline = pipeline.png();
      mediaType = "image/png";
    }

    const outputBuffer = await pipeline.toBuffer();
    const resizedMeta = await sharp(outputBuffer).metadata();

    return {
      data: outputBuffer.toString("base64"),
      mediaType,
      width: resizedMeta.width || width,
      height: resizedMeta.height || height,
    };
  } catch (err) {
    console.error("[documentParser] Image optimization failed:", err);
    return null;
  }
}

async function parsePdf(buffer: Buffer, fileName: string): Promise<ParsedDocument> {
  const data = new Uint8Array(buffer);
  const doc = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;

  const textParts: string[] = [];
  const images: ExtractedImage[] = [];
  const pageTextRanges: PageTextRange[] = [];
  let imageCounter = 0;
  let globalOffset = 0;

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);

    // Extract text
    const textContent = await page.getTextContent();
    const items = textContent.items.filter((item): item is TextItem => "str" in item);

    // Sort by vertical position (top to bottom), then horizontal (left to right)
    items.sort((a, b) => {
      const yDiff = b.transform[5] - a.transform[5]; // y is inverted in PDF
      if (Math.abs(yDiff) > 8) return yDiff;
      return a.transform[4] - b.transform[4]; // x position
    });

    // Group items into lines based on y-position proximity
    const lines: string[] = [];
    let currentLine = "";
    let lastY = -Infinity;

    for (const item of items) {
      const y = item.transform[5];
      if (Math.abs(y - lastY) > 8 && currentLine) {
        lines.push(currentLine.trim());
        currentLine = "";
      }
      currentLine += (currentLine && Math.abs(y - lastY) <= 8 ? " " : "") + item.str;
      lastY = y;
    }
    if (currentLine.trim()) {
      lines.push(currentLine.trim());
    }

    // Merge consecutive lines into coherent paragraphs
    const merged: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (i === 0) {
        merged.push(line);
        continue;
      }
      const prev = merged[merged.length - 1];
      const isHeading = line === line.toUpperCase() && line.length > 2 && /[A-Z]/.test(line);
      const isBullet = /^[\u2022\-\*\d+\.\)]/.test(line.trim());
      const prevEndsSentence = /[.!?]$/.test(prev.trim());

      if (prevEndsSentence || isHeading || isBullet) {
        // Keep as separate line/paragraph
        merged.push(line);
      } else {
        // Merge with previous line (mid-sentence line break)
        merged[merged.length - 1] = prev + " " + line;
      }
    }

    const pageText = merged.join("\n");
    if (pageText.trim()) {
      // If not the first page, account for the \n\n separator
      if (textParts.length > 0) {
        globalOffset += 2; // for \n\n between pages
      }
      pageTextRanges.push({
        page: pageNum,
        start: globalOffset,
        end: globalOffset + pageText.length,
      });
      globalOffset += pageText.length;
      textParts.push(pageText);
    }

    // Extract images via operator list
    try {
      const ops = await page.getOperatorList();
      const pageNearbyText = pageText.substring(0, 200);

      for (let i = 0; i < ops.fnArray.length; i++) {
        if (
          ops.fnArray[i] === pdfjsLib.OPS.paintImageXObject ||
          ops.fnArray[i] === (pdfjsLib.OPS as any).paintJpegXObject
        ) {
          const imgName = ops.argsArray[i][0];
          try {
            const img = await page.objs.get(imgName);
            if (!img || !img.data) continue;

            // Convert raw image data to PNG via sharp
            const imgWidth = img.width;
            const imgHeight = img.height;

            if (imgWidth < MIN_IMAGE_DIMENSION && imgHeight < MIN_IMAGE_DIMENSION) continue;
            if (images.length >= 20) continue;

            let imgBuffer: Buffer;
            if (img.data instanceof Uint8ClampedArray || img.data instanceof Uint8Array) {
              // Raw RGBA pixel data
              const rawBytes = Buffer.from(img.data);
              if (rawBytes.length === 0) continue;
              const expectedChannels = rawBytes.length / (imgWidth * imgHeight);
              const channels = Math.round(expectedChannels);
              if (channels < 1 || channels > 4) continue; // malformed
              imgBuffer = await sharp(rawBytes, {
                raw: {
                  width: imgWidth,
                  height: imgHeight,
                  channels: channels as 1 | 2 | 3 | 4,
                },
              })
                .png()
                .toBuffer();
            } else if (Buffer.isBuffer(img.data) || img.data instanceof ArrayBuffer) {
              // Already-encoded image (JPEG/PNG embedded in PDF)
              const rawBytes = img.data instanceof ArrayBuffer ? Buffer.from(img.data) : img.data as Buffer;
              if (rawBytes.length < 16) continue;
              imgBuffer = rawBytes;
            } else {
              continue;
            }

            imageCounter++;
            const optimized = await optimizeImage(imgBuffer);
            if (optimized) {
              images.push({
                id: `img-${imageCounter}`,
                data: optimized.data,
                mediaType: optimized.mediaType,
                width: optimized.width,
                height: optimized.height,
                sourceLabel: `Page ${pageNum}, Image ${imageCounter}`,
                pageNumber: pageNum,
                nearbyText: pageNearbyText,
              });
            }
          } catch {
            // Skip individual image extraction failures
          }
        }
      }
    } catch (err) {
      console.error(`[documentParser] Image extraction failed on page ${pageNum}:`, err);
    }

    page.cleanup();
  }

  return {
    text: textParts.join("\n\n"),
    images,
    sourceFileName: fileName,
    sourceFileType: "application/pdf",
    pageTextRanges,
  };
}

async function parseDocx(buffer: Buffer, fileName: string): Promise<ParsedDocument> {
  const images: ExtractedImage[] = [];
  let imageCounter = 0;

  // Extract text
  const textResult = await mammoth.extractRawText({ buffer });
  const text = textResult.value;

  // Extract images via HTML conversion with image handler
  try {
    await mammoth.convertToHtml({ buffer }, {
      convertImage: mammoth.images.imgElement(async (image: any) => {
        const imgBuffer = await image.read();
        imageCounter++;
        const contentType = image.contentType || "image/png";

        const optimized = await optimizeImage(
          Buffer.from(imgBuffer),
          contentType
        );

        if (optimized) {
          images.push({
            id: `img-${imageCounter}`,
            data: optimized.data,
            mediaType: optimized.mediaType,
            width: optimized.width,
            height: optimized.height,
            sourceLabel: `Document Image ${imageCounter}`,
          });
        }

        // Return a placeholder (we don't use the HTML output)
        return { src: "" };
      }),
    });
  } catch (err) {
    console.error("[documentParser] DOCX image extraction failed:", err);
  }

  return {
    text,
    images,
    sourceFileName: fileName,
    sourceFileType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
}

async function parseStandaloneImage(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<ParsedDocument> {
  const images: ExtractedImage[] = [];

  const optimized = await optimizeImage(buffer, mimeType);
  if (optimized) {
    images.push({
      id: "img-1",
      data: optimized.data,
      mediaType: optimized.mediaType,
      width: optimized.width,
      height: optimized.height,
      sourceLabel: fileName,
    });
  }

  return {
    text: "",
    images,
    sourceFileName: fileName,
    sourceFileType: mimeType,
  };
}

export async function parseFile(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<ParsedDocument> {
  switch (mimeType) {
    case "application/pdf":
      return parsePdf(buffer, fileName);

    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return parseDocx(buffer, fileName);

    case "image/png":
    case "image/jpeg":
    case "image/webp":
    case "image/gif":
      return parseStandaloneImage(buffer, mimeType, fileName);

    case "text/plain":
    case "text/csv":
    case "text/markdown":
      return {
        text: buffer.toString("utf-8"),
        images: [],
        sourceFileName: fileName,
        sourceFileType: mimeType,
      };

    default:
      throw new Error(`Unsupported file type: ${mimeType}`);
  }
}
