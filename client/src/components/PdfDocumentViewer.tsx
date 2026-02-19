import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import type { AnalysisResult } from "@shared/schema";

// Worker copied to public/ for reliable loading
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface PdfDocumentViewerProps {
  base64Data: string;
  results: AnalysisResult[] | null;
  selectedIssueId: string | null;
  hoveredIssueId: string | null;
  onSelectIssue: (id: string) => void;
  onHoverIssue: (id: string | null) => void;
  scrollToPage?: number | null;
}

const SEVERITY_COLORS: Record<string, { bg: string; border: string; pin: string }> = {
  high: { bg: "rgba(220, 38, 38, 0.2)", border: "rgb(220, 38, 38)", pin: "bg-red-600" },
  medium: { bg: "rgba(217, 119, 6, 0.15)", border: "rgb(217, 119, 6)", pin: "bg-amber-500" },
  low: { bg: "rgba(59, 130, 246, 0.1)", border: "rgb(59, 130, 246)", pin: "bg-sky-500" },
};

export default function PdfDocumentViewer({
  base64Data,
  results,
  selectedIssueId,
  hoveredIssueId,
  onSelectIssue,
  onHoverIssue,
  scrollToPage,
}: PdfDocumentViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageWidth, setPageWidth] = useState(700);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [textLayersReady, setTextLayersReady] = useState<Set<number>>(new Set());
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set([1, 2]));

  const [loadError, setLoadError] = useState<string | null>(null);

  // Convert base64 to Uint8Array
  const fileData = useMemo(() => {
    if (!base64Data || base64Data.length === 0) return null;
    try {
      const binary = atob(base64Data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return { data: bytes };
    } catch {
      return null;
    }
  }, [base64Data]);

  // Group findings by page
  const findingsByPage = useMemo(() => {
    const map = new Map<number, AnalysisResult[]>();
    if (!results) return map;
    for (const r of results) {
      const page = r.pageNumber || 1;
      if (!map.has(page)) map.set(page, []);
      map.get(page)!.push(r);
    }
    return map;
  }, [results]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  // Resize observer for responsive width
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setPageWidth(Math.min(width - 60, 900));
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // IntersectionObserver for lazy page rendering
  useEffect(() => {
    const container = containerRef.current;
    if (!container || numPages === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const pageNum = Number(entry.target.getAttribute("data-page"));
            if (pageNum > 0) {
              setVisiblePages((prev) => {
                if (prev.has(pageNum)) return prev;
                const next = new Set(prev);
                next.add(pageNum);
                return next;
              });
            }
          }
        }
      },
      { root: container, rootMargin: "300px 0px" }
    );

    // Observe all page container divs
    pageRefs.current.forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, [numPages]);

  // Scroll to page when requested
  useEffect(() => {
    if (scrollToPage && scrollToPage > 0) {
      // Ensure the target page is visible before scrolling
      setVisiblePages((prev) => {
        if (prev.has(scrollToPage)) return prev;
        const next = new Set(prev);
        next.add(scrollToPage);
        return next;
      });
      setTimeout(() => {
        const pageEl = pageRefs.current.get(scrollToPage);
        pageEl?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  }, [scrollToPage]);

  // Scroll to page of selected issue
  useEffect(() => {
    if (!selectedIssueId || !results) return;
    const result = results.find((r) => r.id === selectedIssueId);
    if (result?.pageNumber) {
      setVisiblePages((prev) => {
        if (prev.has(result.pageNumber!)) return prev;
        const next = new Set(prev);
        next.add(result.pageNumber!);
        return next;
      });
      setTimeout(() => {
        const pageEl = pageRefs.current.get(result.pageNumber!);
        pageEl?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
    }
  }, [selectedIssueId, results]);

  // Apply highlights to text layer after it renders
  const applyHighlights = useCallback(
    (pageNum: number) => {
      const pageEl = pageRefs.current.get(pageNum);
      if (!pageEl) return;

      // Clear existing highlights
      pageEl.querySelectorAll(".pdf-highlight-overlay").forEach((el) => el.remove());

      const pageFindings = findingsByPage.get(pageNum);
      if (!pageFindings || pageFindings.length === 0) return;

      const textLayer = pageEl.querySelector(".react-pdf__Page__textContent");
      if (!textLayer) return;

      const spans = textLayer.querySelectorAll("span");
      if (spans.length === 0) return;

      // Build text content from spans for matching
      const spanData: { span: Element; text: string; startIdx: number }[] = [];
      let fullText = "";
      spans.forEach((span) => {
        const text = span.textContent || "";
        spanData.push({ span, text, startIdx: fullText.length });
        fullText += text;
      });

      for (const finding of pageFindings) {
        if (finding.start < 0) continue; // image finding

        // Try to find the finding's text in the page text layer
        const normalizedOriginal = finding.original.replace(/\s+/g, " ").trim();
        const normalizedFull = fullText.replace(/\s+/g, " ").trim();
        const matchIdx = normalizedFull.toLowerCase().indexOf(normalizedOriginal.toLowerCase());
        if (matchIdx === -1) continue;

        // Find which spans contain this text
        const colors = SEVERITY_COLORS[finding.severity] || SEVERITY_COLORS.low;
        let normalizedCharCount = 0;

        for (const sd of spanData) {
          const spanNormalized = sd.text.replace(/\s+/g, " ");
          const spanNormStart = normalizedCharCount;
          const spanNormEnd = normalizedCharCount + spanNormalized.length;

          if (spanNormEnd > matchIdx && spanNormStart < matchIdx + normalizedOriginal.length) {
            // This span overlaps with our match
            const spanEl = sd.span as HTMLElement;
            const rect = spanEl.getBoundingClientRect();
            const containerRect = pageEl.getBoundingClientRect();

            const overlay = document.createElement("div");
            overlay.className = "pdf-highlight-overlay";
            overlay.dataset.issueId = finding.id;
            overlay.style.cssText = `
              position: absolute;
              left: ${rect.left - containerRect.left}px;
              top: ${rect.top - containerRect.top}px;
              width: ${rect.width}px;
              height: ${rect.height}px;
              background: ${colors.bg};
              border-bottom: 2px solid ${colors.border};
              pointer-events: auto;
              cursor: pointer;
              z-index: 5;
              transition: background 0.15s;
            `;

            if (finding.id === selectedIssueId) {
              overlay.style.background = colors.bg.replace(/[\d.]+\)$/, "0.35)");
              overlay.style.boxShadow = `0 0 0 1px ${colors.border}`;
            }
            if (finding.id === hoveredIssueId) {
              overlay.style.background = colors.bg.replace(/[\d.]+\)$/, "0.3)");
            }

            overlay.addEventListener("click", () => onSelectIssue(finding.id));
            overlay.addEventListener("mouseenter", () => onHoverIssue(finding.id));
            overlay.addEventListener("mouseleave", () => onHoverIssue(null));

            pageEl.style.position = "relative";
            pageEl.appendChild(overlay);
          }

          normalizedCharCount += spanNormalized.length;
        }
      }
    },
    [findingsByPage, selectedIssueId, hoveredIssueId, onSelectIssue, onHoverIssue]
  );

  // Re-apply highlights when state changes
  useEffect(() => {
    textLayersReady.forEach((page) => {
      applyHighlights(page);
    });
  }, [textLayersReady, applyHighlights]);

  const handleTextLayerReady = useCallback((pageNum: number) => {
    setTextLayersReady((prev) => new Set(prev).add(pageNum));
    // Small delay to ensure DOM is settled
    setTimeout(() => {
      setTextLayersReady((prev) => new Set(prev).add(pageNum));
    }, 100);
  }, []);

  const estimatedPageHeight = Math.round(pageWidth * 1.4);

  if (!fileData) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
        PDF preview not available. Use the extracted text and findings above.
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full overflow-y-auto">
      <Document
        file={fileData}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={(error) => {
          console.error("[PdfDocumentViewer] Load error:", error);
          setLoadError(error?.message || "Failed to load PDF");
        }}
        loading={
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        }
        error={
          <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
            {loadError || "Could not render PDF. The extracted text and findings are still available above."}
          </div>
        }
      >
        {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => {
          const pageFindings = findingsByPage.get(pageNum) || [];
          const isVisible = visiblePages.has(pageNum);
          return (
            <div
              key={pageNum}
              data-page={pageNum}
              ref={(el) => {
                if (el) pageRefs.current.set(pageNum, el);
              }}
              className="relative mb-6"
              style={{ position: "relative", minHeight: isVisible ? undefined : estimatedPageHeight }}
            >
              {/* Page number label */}
              <div className="absolute -left-0 top-2 z-10 text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-r">
                Page {pageNum}
              </div>

              {/* Annotation pins in left margin */}
              {pageFindings.map((finding, idx) => {
                const colors = SEVERITY_COLORS[finding.severity] || SEVERITY_COLORS.low;
                const isSelected = finding.id === selectedIssueId;
                const isHovered = finding.id === hoveredIssueId;
                return (
                  <div
                    key={finding.id}
                    className={`absolute -left-1 z-20 flex items-center gap-1 cursor-pointer transition-transform ${
                      isSelected || isHovered ? "scale-110" : ""
                    }`}
                    style={{ top: 30 + idx * 28 }}
                    onClick={() => onSelectIssue(finding.id)}
                    onMouseEnter={() => onHoverIssue(finding.id)}
                    onMouseLeave={() => onHoverIssue(null)}
                    title={finding.issue}
                  >
                    <div
                      className={`${colors.pin} text-white text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm ${
                        isSelected ? "ring-2 ring-offset-1 ring-current" : ""
                      }`}
                    >
                      {finding.id}
                    </div>
                  </div>
                );
              })}

              {isVisible ? (
                <Page
                  pageNumber={pageNum}
                  width={pageWidth}
                  renderTextLayer={true}
                  renderAnnotationLayer={false}
                  onRenderTextLayerSuccess={() => handleTextLayerReady(pageNum)}
                />
              ) : (
                <div
                  className="bg-muted/20 rounded flex items-center justify-center"
                  style={{ height: estimatedPageHeight }}
                >
                  <span className="text-xs text-muted-foreground">Page {pageNum}</span>
                </div>
              )}
            </div>
          );
        })}
      </Document>
    </div>
  );
}
