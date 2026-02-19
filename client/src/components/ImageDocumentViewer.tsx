import { useRef, useEffect } from "react";
import type { AnalysisResult } from "@shared/schema";

const SEVERITY_COLORS: Record<string, { pin: string; ring: string }> = {
  high: { pin: "bg-red-600", ring: "ring-red-300" },
  medium: { pin: "bg-amber-500", ring: "ring-amber-300" },
  low: { pin: "bg-sky-500", ring: "ring-sky-300" },
};

interface ImageDocumentViewerProps {
  base64Data: string;
  mimeType: string;
  results: AnalysisResult[] | null;
  selectedIssueId: string | null;
  hoveredIssueId: string | null;
  onSelectIssue: (id: string) => void;
  onHoverIssue: (id: string | null) => void;
}

export default function ImageDocumentViewer({
  base64Data,
  mimeType,
  results,
  selectedIssueId,
  hoveredIssueId,
  onSelectIssue,
  onHoverIssue,
}: ImageDocumentViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll selected pin into view
  useEffect(() => {
    if (!selectedIssueId) return;
    const el = document.getElementById(`img-pin-${selectedIssueId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selectedIssueId]);

  const findings = results?.filter((r) => r.start === -1 || r.imageId) || [];

  return (
    <div ref={containerRef} className="w-full h-full overflow-y-auto flex flex-col items-center py-4">
      {/* Original image */}
      <img
        src={`data:${mimeType};base64,${base64Data}`}
        alt="Uploaded document"
        className="max-w-full rounded border border-border/40"
        style={{ maxHeight: "70vh" }}
      />

      {/* Finding pins below the image */}
      {findings.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 justify-center max-w-2xl">
          {findings.map((finding) => {
            const colors = SEVERITY_COLORS[finding.severity] || SEVERITY_COLORS.low;
            const isSelected = finding.id === selectedIssueId;
            const isHovered = finding.id === hoveredIssueId;
            return (
              <div
                key={finding.id}
                id={`img-pin-${finding.id}`}
                className={`${colors.pin} text-white text-[9px] font-bold px-2 h-5 rounded-full flex items-center gap-1 cursor-pointer shadow-sm transition-transform ${
                  isSelected || isHovered ? "scale-110" : ""
                } ${isSelected ? `ring-2 ring-offset-1 ${colors.ring}` : ""}`}
                onClick={() => onSelectIssue(finding.id)}
                onMouseEnter={() => onHoverIssue(finding.id)}
                onMouseLeave={() => onHoverIssue(null)}
                title={finding.issue}
              >
                {finding.id} — {finding.issue}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
