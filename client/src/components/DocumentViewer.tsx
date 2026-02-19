import { lazy, Suspense } from "react";
import type { AnalysisResult, StoredDocument } from "@shared/schema";

const PdfDocumentViewer = lazy(() => import("./PdfDocumentViewer"));
const ImageDocumentViewer = lazy(() => import("./ImageDocumentViewer"));

interface DocumentViewerProps {
  originalDocument: StoredDocument | null;
  results: AnalysisResult[] | null;
  selectedIssueId: string | null;
  hoveredIssueId: string | null;
  onSelectIssue: (id: string) => void;
  onHoverIssue: (id: string | null) => void;
  scrollToPage?: number | null;
}

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export default function DocumentViewer({
  originalDocument,
  results,
  selectedIssueId,
  hoveredIssueId,
  onSelectIssue,
  onHoverIssue,
  scrollToPage,
}: DocumentViewerProps) {
  if (!originalDocument) return null;

  const loading = (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );

  if (originalDocument.mimeType === "application/pdf") {
    return (
      <Suspense fallback={loading}>
        <PdfDocumentViewer
          base64Data={originalDocument.data}
          results={results}
          selectedIssueId={selectedIssueId}
          hoveredIssueId={hoveredIssueId}
          onSelectIssue={onSelectIssue}
          onHoverIssue={onHoverIssue}
          scrollToPage={scrollToPage}
        />
      </Suspense>
    );
  }

  if (IMAGE_TYPES.has(originalDocument.mimeType)) {
    return (
      <Suspense fallback={loading}>
        <ImageDocumentViewer
          base64Data={originalDocument.data}
          mimeType={originalDocument.mimeType}
          results={results}
          selectedIssueId={selectedIssueId}
          hoveredIssueId={hoveredIssueId}
          onSelectIssue={onSelectIssue}
          onHoverIssue={onHoverIssue}
        />
      </Suspense>
    );
  }

  return null;
}
