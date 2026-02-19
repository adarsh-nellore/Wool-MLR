import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useSearch } from "wouter";
import {
  Loader2,
  CheckCircle,
  Sparkles,
  Wand2,
  Upload,
  FileText,
  File,
  X,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  PanelRightClose,
  PanelRight,
  Home,
  Menu,
  Download,
  RefreshCw,
  FileType,
  AlertTriangle,
  Info,
  ShieldAlert,
  Image as ImageIcon,
  FileImage,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProducts } from "@/hooks/use-products";
import { useAnalysis, useAnalysisUpload } from "@/hooks/use-analysis";
import type { AnalysisResult, DriftType, ExposureTag, StoredAnalysis, StoredImage, StoredDocument } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import DocumentViewer from "@/components/DocumentViewer";

const BINARY_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

function getFileTypeIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return <FileType className="w-3 h-3" />;
  if (ext === 'docx' || ext === 'doc') return <FileText className="w-3 h-3" />;
  if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext || '')) return <FileImage className="w-3 h-3" />;
  return <File className="w-3 h-3" />;
}

// ── Drift UI Constants ──

const EXPOSURE_SHORT: Record<ExposureTag, string> = {
  "Substantiation Exposure": "Substantiation",
  "Liability Exposure": "Liability",
  "Advertising Exposure": "Advertising",
};

function getDriftShort(dt: DriftType): string {
  return dt.replace(" Drift", "").replace(" Expansion", "").replace(" Escalation", "").replace(" Redefinition", "");
}

type HighlightRange = {
  start: number;
  end: number;
  resultId: string;
  severity: string;
};

function getHighlightClass(severity: string): string {
  if (severity === 'high') return 'highlight-high';
  if (severity === 'medium') return 'highlight-medium';
  return 'highlight-low';
}

// CSS for highlight states — injected once
const HIGHLIGHT_STYLES = `
  .highlight-high {
    background: rgba(220, 38, 38, 0.18);
    border-bottom: 2px solid rgba(220, 38, 38, 0.6);
    border-radius: 1px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }
  .highlight-medium {
    background: rgba(217, 119, 6, 0.14);
    border-bottom: 2px dashed rgba(217, 119, 6, 0.5);
    border-radius: 1px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }
  .highlight-low {
    background: rgba(59, 130, 246, 0.08);
    border-bottom: 1px dotted rgba(59, 130, 246, 0.5);
    border-radius: 1px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }

  .highlight-high:hover, .highlight-high[data-hovered="true"] {
    background: rgba(220, 38, 38, 0.3);
    border-bottom-color: rgba(220, 38, 38, 0.8);
  }
  .highlight-medium:hover, .highlight-medium[data-hovered="true"] {
    background: rgba(217, 119, 6, 0.25);
    border-bottom-color: rgba(217, 119, 6, 0.7);
  }
  .highlight-low:hover, .highlight-low[data-hovered="true"] {
    background: rgba(59, 130, 246, 0.16);
    border-bottom-color: rgba(59, 130, 246, 0.7);
  }

  .highlight-high[data-selected="true"] {
    background: rgba(220, 38, 38, 0.35);
    border-bottom: 2px solid rgba(220, 38, 38, 0.9);
    box-shadow: 0 0 0 1px rgba(220, 38, 38, 0.4);
  }
  .highlight-medium[data-selected="true"] {
    background: rgba(217, 119, 6, 0.3);
    border-bottom: 2px solid rgba(217, 119, 6, 0.8);
    box-shadow: 0 0 0 1px rgba(217, 119, 6, 0.3);
  }
  .highlight-low[data-selected="true"] {
    background: rgba(59, 130, 246, 0.2);
    border-bottom: 2px solid rgba(59, 130, 246, 0.7);
    box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.2);
  }

  [contenteditable="true"]:focus { outline: none; }
  [contenteditable="true"] h3 { font-size: 1.25rem; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.5rem; }
  [contenteditable="true"] p { margin-bottom: 1rem; font-size: 1.125rem; line-height: 1.75; font-family: Georgia, serif; }
`;

function isHeadingLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (trimmed === trimmed.toUpperCase() && trimmed.length > 2 && trimmed.length < 80 && /[A-Z]/.test(trimmed)) return true;
  if (trimmed.endsWith(':') && trimmed.length < 80) return true;
  if (trimmed.length < 60 && !trimmed.endsWith('.')) return true;
  return false;
}

export default function Analyze() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const preselectedProfileId = params.get("profileId");
  const analysisIdParam = params.get("analysisId");
  const loadSampleParam = params.get("loadSample");

  const [step, setStep] = useState<"input" | "results">("input");
  const [results, setResults] = useState<AnalysisResult[] | null>(null);
  const [content, setContent] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [hoveredIssueId, setHoveredIssueId] = useState<string | null>(null);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [selectedProfileId, setSelectedProfileId] = useState<string>(preselectedProfileId || "");
  const [activeSectionIndex, setActiveSectionIndex] = useState<number | null>(null);
  const [severityFilter, setSeverityFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [extractedImages, setExtractedImages] = useState<StoredImage[]>([]);
  const [originalDocument, setOriginalDocument] = useState<StoredDocument | null>(null);
  const [scrollToPage, setScrollToPage] = useState<number | null>(null);

  const documentRef = useRef<HTMLDivElement>(null);
  const editableRef = useRef<HTMLDivElement>(null);
  const [contentDirty, setContentDirty] = useState(false);

  const { toast } = useToast();
  const { data: products } = useProducts();
  const analysis = useAnalysis();
  const uploadAnalysis = useAnalysisUpload();

  // Inject highlight CSS once
  useEffect(() => {
    const id = "highlight-styles";
    if (!document.getElementById(id)) {
      const style = document.createElement("style");
      style.id = id;
      style.textContent = HIGHLIGHT_STYLES;
      document.head.appendChild(style);
    }
  }, []);

  // Load a stored analysis if analysisId is provided
  useEffect(() => {
    if (analysisIdParam) {
      (async () => {
        try {
          const res = await apiRequest("GET", `/api/analyses/${analysisIdParam}`);
          const stored: StoredAnalysis = await res.json();
          setContent(stored.content);
          setResults(stored.results);
          setExtractedImages(stored.images || []);
          setOriginalDocument(stored.originalDocument || null);
          setSelectedProfileId(String(stored.profileId));
          setStep("results");
        } catch {
          toast({ title: "Error", description: "Could not load stored analysis.", variant: "destructive" });
        }
      })();
    }
  }, [analysisIdParam]);

  // Auto-load sample document when loadSample=true
  useEffect(() => {
    if (loadSampleParam === "true" && !content && !analysisIdParam) {
      (async () => {
        try {
          const res = await fetch("/sample-cardioflow-promo.txt");
          if (res.ok) {
            const text = await res.text();
            setContent(text);
            setUploadedFile("sample-cardioflow-promo.txt");
          }
        } catch {
          // silently fail — user can still paste content
        }
      })();
    }
  }, [loadSampleParam]);

  // Set first product as default if none preselected
  useEffect(() => {
    if (!selectedProfileId && products && products.length > 0) {
      setSelectedProfileId(String(products[0].id));
    }
  }, [products, selectedProfileId]);

  // Extract sections from content
  const sections = useMemo(() => {
    if (!content) return [];
    const paragraphs = content.split('\n\n');
    return paragraphs.map((para, index) => {
      const firstLine = para.split('\n')[0].trim();
      const isHeading = isHeadingLine(firstLine);
      const label = isHeading ? firstLine : firstLine.substring(0, 60) + (firstLine.length > 60 ? '...' : '');
      return { index, label, text: para };
    });
  }, [content]);

  // Count issues per section
  const sectionIssueCounts = useMemo(() => {
    if (!results || !content) return new Map<number, number>();
    const paragraphs = content.split('\n\n');
    const counts = new Map<number, number>();

    // Build paragraph offset ranges
    const paragraphRanges: { start: number; end: number }[] = [];
    let offset = 0;
    for (const para of paragraphs) {
      paragraphRanges.push({ start: offset, end: offset + para.length });
      offset += para.length + 2; // +2 for \n\n
    }

    for (const result of results) {
      const idx = content.indexOf(result.original);
      if (idx === -1) continue;
      for (let i = 0; i < paragraphRanges.length; i++) {
        if (idx >= paragraphRanges[i].start && idx < paragraphRanges[i].end) {
          counts.set(i, (counts.get(i) || 0) + 1);
          break;
        }
      }
    }
    return counts;
  }, [results, content]);

  // Determine if we're in document render mode (PDF or image)
  const isDocumentMode = originalDocument !== null;
  const isPdfMode = originalDocument?.mimeType === "application/pdf";

  // Page-based navigation for PDF mode
  const pageIssueCounts = useMemo(() => {
    if (!isPdfMode || !results) return new Map<number, number>();
    const counts = new Map<number, number>();
    for (const r of results) {
      const page = r.pageNumber || 1;
      counts.set(page, (counts.get(page) || 0) + 1);
    }
    return counts;
  }, [isPdfMode, results]);

  const totalPages = originalDocument?.pageCount || 0;

  // Build highlight ranges from results with robust matching
  const highlightRanges = useMemo(() => {
    if (!results || !content) return [];
    const ranges: HighlightRange[] = [];

    const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();

    for (const result of results) {
      let idx = -1;

      // Primary: use result.start as a proximity hint if it matches exactly
      if (typeof result.start === 'number' && result.start >= 0) {
        const candidate = content.substring(result.start, result.start + result.original.length);
        if (candidate === result.original) {
          idx = result.start;
        }
      }

      // Fallback 1: basic indexOf
      if (idx === -1) {
        idx = content.indexOf(result.original);
      }

      // Fallback 2: normalized whitespace matching
      if (idx === -1) {
        const normOriginal = normalize(result.original);
        const normContent = normalize(content);
        const normIdx = normContent.indexOf(normOriginal);
        if (normIdx !== -1) {
          // Map normalized position back to real content
          let realPos = 0;
          let normPos = 0;
          // Skip leading whitespace in content
          while (realPos < content.length && /\s/.test(content[realPos]) && normPos === 0) {
            realPos++;
          }
          // Walk through content to find the real position matching normIdx
          realPos = 0;
          normPos = 0;
          while (realPos < content.length && normPos < normIdx) {
            if (/\s/.test(content[realPos])) {
              // Skip extra whitespace in real content
              while (realPos < content.length - 1 && /\s/.test(content[realPos + 1])) {
                realPos++;
              }
            }
            realPos++;
            normPos++;
          }
          // Skip leading whitespace at match start
          while (realPos < content.length && /\s/.test(content[realPos]) && normPos === normIdx) {
            realPos++;
          }
          // Find the end position
          let endReal = realPos;
          let matchNormPos = 0;
          while (endReal < content.length && matchNormPos < normOriginal.length) {
            if (/\s/.test(content[endReal])) {
              while (endReal < content.length - 1 && /\s/.test(content[endReal + 1])) {
                endReal++;
              }
            }
            endReal++;
            matchNormPos++;
          }
          idx = realPos;
          ranges.push({
            start: realPos,
            end: endReal,
            resultId: result.id,
            severity: result.severity,
          });
          continue;
        }
      }

      // Fallback 3: partial match for long originals (first 30 + last 30 chars)
      if (idx === -1 && result.original.length > 20) {
        const prefix = result.original.substring(0, 30);
        const suffix = result.original.substring(result.original.length - 30);
        const prefixIdx = content.indexOf(prefix);
        if (prefixIdx !== -1) {
          const searchEnd = content.indexOf(suffix, prefixIdx);
          if (searchEnd !== -1) {
            idx = prefixIdx;
            ranges.push({
              start: prefixIdx,
              end: searchEnd + suffix.length,
              resultId: result.id,
              severity: result.severity,
            });
            continue;
          }
        }
      }

      if (idx !== -1) {
        ranges.push({
          start: idx,
          end: idx + result.original.length,
          resultId: result.id,
          severity: result.severity,
        });
      }
    }

    // Sort by position, resolve overlaps by keeping the first
    ranges.sort((a, b) => a.start - b.start);
    const nonOverlapping: HighlightRange[] = [];
    for (const range of ranges) {
      const last = nonOverlapping[nonOverlapping.length - 1];
      if (!last || range.start >= last.end) {
        nonOverlapping.push(range);
      }
    }
    return nonOverlapping;
  }, [results, content]);

  // Build highlighted content as an HTML string (no React state deps for hover/selection)
  const highlightedHTML = useMemo(() => {
    if (!content) return "";

    const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    // Build inline HTML for a text segment, inserting highlight spans
    const buildInline = (text: string, segStart: number): string => {
      const segEnd = segStart + text.length;
      const segRanges = highlightRanges.filter(
        r => r.start < segEnd && r.end > segStart
      );
      let html = "";
      let cursor = 0;

      for (const range of segRanges) {
        const relStart = Math.max(0, range.start - segStart);
        const relEnd = Math.min(text.length, range.end - segStart);

        if (relStart > cursor) {
          html += escapeHtml(text.substring(cursor, relStart));
        }

        html += `<span id="highlight-${range.resultId}" data-issue-id="${range.resultId}" class="${getHighlightClass(range.severity)}">${escapeHtml(text.substring(relStart, relEnd))}</span>`;
        cursor = relEnd;
      }

      if (cursor < text.length) {
        html += escapeHtml(text.substring(cursor));
      }
      return html;
    };

    const renderWithBreaks = (text: string, segStart: number): string => {
      const lines = text.split('\n');
      let html = "";
      let offset = segStart;
      for (let i = 0; i < lines.length; i++) {
        if (i > 0) html += "<br/>";
        html += buildInline(lines[i], offset);
        offset += lines[i].length + 1;
      }
      return html;
    };

    const paragraphs = content.split('\n\n');
    let globalOffset = 0;
    let html = "";

    for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
      const para = paragraphs[pIdx];
      const paraStart = globalOffset;

      const lines = para.split('\n');
      const firstLine = lines[0].trim();
      const heading = isHeadingLine(firstLine);

      if (heading) {
        html += `<h3 id="section-${pIdx}">${buildInline(lines[0], paraStart)}</h3>`;
        if (lines.length > 1) {
          const restText = lines.slice(1).join('\n');
          const restOffset = paraStart + lines[0].length + 1;
          html += `<p>${renderWithBreaks(restText, restOffset)}</p>`;
        }
      } else {
        html += `<p id="section-${pIdx}">${renderWithBreaks(para, paraStart)}</p>`;
      }

      globalOffset = paraStart + para.length + 2;
    }

    return html;
  }, [content, highlightRanges]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFiles = (file: File) => {
    setUploadedFile(file.name);

    const fileSizeMB = file.size / 1024 / 1024;
    if (fileSizeMB > 25) {
      toast({ title: "Large File", description: `${file.name} is ${fileSizeMB.toFixed(0)}MB. Processing may take longer for large files.` });
    }

    // Check if this is a binary file type that needs server-side processing
    if (BINARY_MIME_TYPES.has(file.type) || /\.(pdf|docx|doc|png|jpe?g|webp|gif)$/i.test(file.name)) {
      setPendingFile(file);
      toast({ title: "File Ready", description: `${file.name} will be processed on the server when you analyze.` });
      return;
    }

    // Read text from file (txt, csv, md)
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        setContent(prev => prev + (prev ? "\n\n" : "") + text);
        toast({ title: "File Loaded", description: `Text extracted from ${file.name}.` });
      }
    };
    reader.readAsText(file);
  };

  const handleAnalyze = () => {
    if (!selectedProfileId) {
      toast({ title: "Select a profile", description: "Please select a product profile first.", variant: "destructive" });
      return;
    }
    if (!content.trim() && !pendingFile) {
      toast({ title: "No content", description: "Please enter or upload content to analyze.", variant: "destructive" });
      return;
    }
    if (pendingFile && pendingFile.size > 30 * 1024 * 1024) {
      toast({ title: "File Too Large", description: "Maximum file size is 30MB.", variant: "destructive" });
      return;
    }

    setStep("results");

    if (pendingFile) {
      // Upload file for server-side processing
      uploadAnalysis.mutate(
        { profileId: parseInt(selectedProfileId, 10), files: [pendingFile] },
        {
          onSuccess: (data) => {
            setContent(data.extractedText);
            setExtractedImages(data.images || []);
            setOriginalDocument(data.originalDocument || null);
            setResults(data.results);
            setPendingFile(null);
            toast({
              title: "Analysis Complete",
              description: `Found ${data.summary.total} potential compliance issue${data.summary.total !== 1 ? 's' : ''}${data.summary.imageFindings ? ` (${data.summary.imageFindings} in images)` : ''}.`,
            });
          },
          onError: (error) => {
            toast({ title: "Analysis Failed", description: error.message, variant: "destructive" });
            setStep("input");
          },
        }
      );
    } else {
      analysis.mutate(
        { profileId: parseInt(selectedProfileId, 10), content },
        {
          onSuccess: (data) => {
            setResults(data.results);
            toast({
              title: "Analysis Complete",
              description: `Found ${data.summary.total} potential compliance issue${data.summary.total !== 1 ? 's' : ''}.`,
            });
          },
          onError: (error) => {
            toast({ title: "Analysis Failed", description: error.message, variant: "destructive" });
            setStep("input");
          },
        }
      );
    }
  };

  const applyFix = (id: string) => {
    const result = results?.find(r => r.id === id);
    if (result) {
      setContent(prev => prev.replace(result.original, result.suggestion));
      setResults(prev => prev?.filter(r => r.id !== id) || null);
      if (selectedIssueId === id) setSelectedIssueId(null);
      toast({ title: "Fix Applied", description: "Content updated with suggested wording." });
    }
  };

  const resetAnalysis = () => {
     setStep("input");
     setResults(null);
     setContent("");
     setUploadedFile(null);
     setPendingFile(null);
     setExtractedImages([]);
     setOriginalDocument(null);
     setScrollToPage(null);
     setActiveSectionIndex(null);
     setContentDirty(false);
     initialResultsCount.current = null;
     initialWeightedScore.current = null;
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportTxt = () => {
    downloadFile(new Blob([content], { type: 'text/plain' }), 'analyzed-document.txt');
  };

  const handleExportPdf = () => {
    // Build a styled HTML document and use the browser's print-to-PDF
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Analyzed Document</title>
      <style>body{font-family:Georgia,serif;max-width:700px;margin:40px auto;padding:0 20px;line-height:1.8;color:#1a1a1a}
      h3{font-size:1.25rem;font-weight:600;margin-top:1.5rem;margin-bottom:0.5rem}p{margin-bottom:1rem;font-size:1rem}</style>
      </head><body>${highlightedHTML.replace(/class="highlight-[^"]*"/g, '')}</body></html>`;
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      setTimeout(() => { w.print(); }, 300);
    }
  };

  const handleExportDocx = () => {
    // Build a simple .doc-compatible HTML file (opens in Word)
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"/><style>body{font-family:Georgia,serif;line-height:1.8;color:#1a1a1a}
      h3{font-size:16pt;font-weight:bold;margin-top:12pt}p{font-size:12pt;margin-bottom:8pt}</style></head>
      <body>${highlightedHTML.replace(/class="highlight-[^"]*"/g, '')}</body></html>`;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    downloadFile(blob, 'analyzed-document.doc');
  };

  const handleShare = () => {
    const profileName = selectedProfileName;
    const totalFindings = results?.length || 0;
    const score = riskScore.score;

    const subject = `MLR Review — ${profileName}: ${totalFindings} compliance findings (Risk Score: ${score})`;

    const top3 = (results || []).slice(0, 3).map((r, i) => {
      const original = r.original.length > 120 ? r.original.substring(0, 120) + '...' : r.original;
      return `${i + 1}. [${r.severity.toUpperCase()}] ${r.issue}\n   "${original}"`;
    }).join('\n\n');

    const deepLink = window.location.href;

    const body = `Device Profile: ${profileName}\nRisk Score: ${score}/100 (${riskScore.label})\nFindings: ${totalFindings} total (${severityCounts.high} high, ${severityCounts.medium} medium, ${severityCounts.low} low)\n\nTop Findings:\n${top3}\n\nFull Report: ${deepLink}`;

    // Try Web Share API on mobile
    if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
      navigator.share({ title: subject, text: body, url: deepLink }).catch(() => {});
      return;
    }

    // Fallback to mailto
    const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailto, '_blank');
  };

  const scrollToSection = (index: number) => {
    setActiveSectionIndex(index);
    if (index === -1) {
      // "Full Document" — scroll to top
      documentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const el = document.getElementById(`section-${index}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSelectIssue = (issueId: string) => {
    setSelectedIssueId(issueId);
    const result = results?.find(r => r.id === issueId);
    if (isDocumentMode && result?.pageNumber) {
      // In document mode, scroll to the page
      setScrollToPage(result.pageNumber);
    } else if (result?.imageId) {
      const imageEl = document.getElementById(`image-${result.imageId}`);
      imageEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      const highlightEl = document.getElementById(`highlight-${issueId}`);
      highlightEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Update highlight data attributes via DOM (avoids re-render of contentEditable)
  useEffect(() => {
    const container = editableRef.current;
    if (!container) return;
    container.querySelectorAll("[data-selected]").forEach(el => el.removeAttribute("data-selected"));
    if (selectedIssueId) {
      const el = container.querySelector(`[data-issue-id="${selectedIssueId}"]`);
      el?.setAttribute("data-selected", "true");
    }
  }, [selectedIssueId]);

  useEffect(() => {
    const container = editableRef.current;
    if (!container) return;
    container.querySelectorAll("[data-hovered]").forEach(el => el.removeAttribute("data-hovered"));
    if (hoveredIssueId) {
      const el = container.querySelector(`[data-issue-id="${hoveredIssueId}"]`);
      el?.setAttribute("data-hovered", "true");
    }
  }, [hoveredIssueId]);

  const selectedProfileName = products?.find(p => String(p.id) === selectedProfileId)?.name || "Select Profile";

  const filteredResults = useMemo(() => {
    if (!results) return null;
    if (severityFilter === "all") return results;
    return results.filter(r => r.severity === severityFilter);
  }, [results, severityFilter]);

  const severityCounts = useMemo(() => {
    if (!results) return { high: 0, medium: 0, low: 0 };
    return {
      high: results.filter(r => r.severity === 'high').length,
      medium: results.filter(r => r.severity === 'medium').length,
      low: results.filter(r => r.severity === 'low').length,
    };
  }, [results]);

  // ── Risk Score ──
  // Weighted score: each finding contributes points based on drift level.
  // The score is normalized to 0-100 where 0 = fully compliant, 100 = critical risk.
  // As fixes are applied (findings removed), the score decreases.
  const riskScore = useMemo(() => {
    if (!results || results.length === 0) return { score: 0, maxScore: 0, label: 'Compliant', color: 'text-emerald-600', bgColor: 'bg-emerald-500', barColor: 'bg-emerald-500', ringColor: 'ring-emerald-200' };

    // Weight by drift level: L0=1, L1=3, L2=7, L3=15, L4=25
    const weights: Record<number, number> = { 0: 1, 1: 3, 2: 7, 3: 15, 4: 25 };
    const totalWeightedScore = results.reduce((sum, r) => sum + (weights[r.driftLevel] || 3), 0);

    // Max possible = if every finding were L4
    const maxPossible = results.length * 25;
    // Normalize to 0-100
    const normalized = Math.round((totalWeightedScore / Math.max(maxPossible, 1)) * 100);

    // Determine label and colors based on score
    if (normalized >= 70) return { score: normalized, maxScore: totalWeightedScore, label: 'Critical Risk', color: 'text-red-700', bgColor: 'bg-red-600', barColor: 'bg-red-500', ringColor: 'ring-red-200' };
    if (normalized >= 50) return { score: normalized, maxScore: totalWeightedScore, label: 'High Risk', color: 'text-red-600', bgColor: 'bg-red-500', barColor: 'bg-red-400', ringColor: 'ring-red-100' };
    if (normalized >= 35) return { score: normalized, maxScore: totalWeightedScore, label: 'Elevated Risk', color: 'text-amber-600', bgColor: 'bg-amber-500', barColor: 'bg-amber-400', ringColor: 'ring-amber-100' };
    if (normalized >= 20) return { score: normalized, maxScore: totalWeightedScore, label: 'Moderate Risk', color: 'text-amber-500', bgColor: 'bg-amber-400', barColor: 'bg-amber-300', ringColor: 'ring-amber-100' };
    if (normalized >= 10) return { score: normalized, maxScore: totalWeightedScore, label: 'Low Risk', color: 'text-sky-600', bgColor: 'bg-sky-500', barColor: 'bg-sky-400', ringColor: 'ring-sky-100' };
    return { score: normalized, maxScore: totalWeightedScore, label: 'Minimal Risk', color: 'text-emerald-600', bgColor: 'bg-emerald-500', barColor: 'bg-emerald-400', ringColor: 'ring-emerald-100' };
  }, [results]);

  // Compute the initial score (from the original analysis, before any fixes)
  // so we can show progress. We track this via a ref that captures the first result set.
  const initialResultsCount = useRef<number | null>(null);
  const initialWeightedScore = useRef<number | null>(null);
  useEffect(() => {
    if (results && results.length > 0 && initialResultsCount.current === null) {
      initialResultsCount.current = results.length;
      const weights: Record<number, number> = { 0: 1, 1: 3, 2: 7, 3: 15, 4: 25 };
      initialWeightedScore.current = results.reduce((sum, r) => sum + (weights[r.driftLevel] || 3), 0);
    }
    if (!results || results.length === 0) {
      initialResultsCount.current = null;
      initialWeightedScore.current = null;
    }
  }, [results]);

  const fixProgress = useMemo(() => {
    if (!results || initialResultsCount.current === null || initialResultsCount.current === 0) return null;
    const fixed = initialResultsCount.current - results.length;
    if (fixed <= 0) return null;
    return { fixed, total: initialResultsCount.current };
  }, [results]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">

      {/* Top Bar */}
      <div className="h-12 border-b border-border/60 bg-card px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <Link href="/">
             <Button variant="ghost" size="icon" className="h-7 w-7">
                <Home className="h-4 w-4 text-muted-foreground" />
             </Button>
          </Link>
          <Link href="/devices" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Devices
          </Link>
          <Separator orientation="vertical" className="h-5" />
          <div className="flex items-center gap-2">
             <span className="font-medium text-sm">Analysis</span>
             <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
             <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
              <SelectTrigger className="w-[180px] h-7 text-xs bg-muted/40 border-0 focus:ring-0">
                <SelectValue placeholder="Select Profile" />
              </SelectTrigger>
              <SelectContent>
                {products?.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                ))}
                {(!products || products.length === 0) && (
                  <SelectItem value="__none__" disabled>No profiles yet</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
           {step === "results" && (
              <>
                {contentDirty && (
                  <Button size="sm" className="h-7 text-xs btn-soft-primary" onClick={() => { setContentDirty(false); handleAnalyze(); }}>
                    <Wand2 className="mr-1.5 h-3 w-3" /> Re-analyze
                  </Button>
                )}
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleShare}>
                  <Share2 className="mr-1.5 h-3 w-3" /> Share
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 text-xs">
                      <Download className="mr-1.5 h-3 w-3" /> Download <ChevronDown className="ml-1 h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleExportTxt}>
                      <FileText className="mr-2 h-3.5 w-3.5" /> Plain Text (.txt)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportPdf}>
                      <FileType className="mr-2 h-3.5 w-3.5" /> PDF (.pdf)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportDocx}>
                      <File className="mr-2 h-3.5 w-3.5" /> Word (.doc)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" size="sm" onClick={resetAnalysis} className="h-7 text-xs">
                   <RefreshCw className="mr-1.5 h-3 w-3" /> New Analysis
                </Button>
              </>
           )}
        </div>
      </div>

      {step === "input" ? (
          /* ================= INPUT MODE ================= */
          <div className="flex-1 overflow-y-auto flex items-center justify-center"
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <AnimatePresence>
              {(content || pendingFile) ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full max-w-3xl mx-auto px-6 py-8 flex flex-col gap-3 h-full"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground">
                      <FileText className="w-3.5 h-3.5 text-primary" />
                      Content to Analyze
                    </span>
                    {uploadedFile && (
                      <Badge variant="secondary" className="gap-1 text-xs h-6">
                        {getFileTypeIcon(uploadedFile)}
                        {uploadedFile}
                        {pendingFile && <span className="text-muted-foreground">(ready to upload)</span>}
                        <button className="ml-1 hover:text-foreground" onClick={() => { setUploadedFile(null); setPendingFile(null); }}>
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    )}
                  </div>
                  {pendingFile && !content ? (
                    <div className="flex-1 p-6 bg-card border rounded-lg flex flex-col items-center justify-center text-center gap-3">
                      <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                        {getFileTypeIcon(pendingFile.name)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{pendingFile.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {(pendingFile.size / 1024 / 1024).toFixed(1)} MB — ready to process
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Text and images will be extracted on the server
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div
                      contentEditable
                      suppressContentEditableWarning
                      className="flex-1 p-6 text-lg leading-relaxed bg-card border rounded-lg focus-visible:ring-1 focus-visible:ring-primary/20 overflow-y-auto focus:outline-none"
                      style={{ fontFamily: 'Georgia, serif' }}
                      dangerouslySetInnerHTML={{ __html: highlightedHTML }}
                      onBlur={(e) => {
                        const newText = e.currentTarget.innerText.trim();
                        if (newText !== content.trim()) {
                          setContent(newText);
                        }
                      }}
                    />
                  )}
                  <div className="flex justify-end gap-2 sticky bottom-0 bg-background pt-2 pb-2 z-10">
                    <Button variant="ghost" size="sm" onClick={() => { setContent(""); setPendingFile(null); setUploadedFile(null); }}>Clear</Button>
                    <Button onClick={handleAnalyze} className="btn-soft-primary" size="sm" disabled={!selectedProfileId}>
                      <Wand2 className="mr-1.5 h-3.5 w-3.5" /> {pendingFile ? "Upload & Analyze" : "Analyze Content"}
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`flex flex-col items-center text-center transition-all ${dragActive ? 'scale-[1.02]' : ''}`}
                >
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors mb-5 ${dragActive ? 'bg-primary/15' : 'bg-muted/60'}`}>
                    <Upload className={`w-7 h-7 ${dragActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight">Upload Content</h3>
                  <p className="text-muted-foreground text-sm mt-1 mb-5">
                    Drag & drop a PDF, Word doc, image, or text file
                  </p>
                  <div className="flex flex-col gap-2.5 w-full max-w-[240px]">
                    <div className="relative">
                      <Button className="w-full btn-soft-primary" size="sm">Choose File</Button>
                      <input
                        type="file"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => e.target.files && e.target.files[0] && handleFiles(e.target.files[0])}
                        accept=".txt,.csv,.md,.pdf,.docx,.doc,.png,.jpg,.jpeg,.webp"
                      />
                    </div>
                    <div className="relative flex items-center">
                      <div className="grow border-t border-border"></div>
                      <span className="px-2 text-[10px] text-muted-foreground uppercase">or</span>
                      <div className="grow border-t border-border"></div>
                    </div>
                    <Button onClick={() => setContent("\u200B")} variant="outline" size="sm">Paste Text</Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
      ) : (
          /* ================= RESULTS MODE (FULL SCREEN) ================= */
          <div className="flex-1 flex overflow-hidden">

             {/* Left Sidebar */}
             <motion.div
                animate={{ width: leftSidebarOpen ? 240 : 44 }}
                className="border-r border-border/60 bg-card flex-shrink-0 flex flex-col relative transition-all duration-200"
             >
                <div className="absolute -right-3 top-3 z-10">
                   <Button
                      variant="outline"
                      size="icon"
                      className="h-5 w-5 rounded-full shadow-sm bg-background border-border/60"
                      onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
                   >
                      {leftSidebarOpen ? <ChevronLeft className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}
                   </Button>
                </div>

                <div className="px-3 py-2.5 border-b border-border/60 h-10 flex items-center">
                   {leftSidebarOpen ? (
                      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        {isPdfMode ? "Pages" : "Sections"}
                      </span>
                   ) : (
                      <Menu className="h-3.5 w-3.5 text-muted-foreground mx-auto" />
                   )}
                </div>

                {leftSidebarOpen && (
                   <ScrollArea className="flex-1">
                     <div className="p-1.5 space-y-0.5">
                        {isPdfMode ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`w-full justify-start text-xs h-8 font-medium ${activeSectionIndex === null || activeSectionIndex === -1 ? 'bg-primary/8 text-primary' : 'text-muted-foreground'}`}
                              onClick={() => { setActiveSectionIndex(-1); setScrollToPage(null); }}
                            >
                               <FileText className="w-3.5 h-3.5 mr-2 shrink-0" /> All Pages
                               {results && results.length > 0 && (
                                 <Badge variant="secondary" className="ml-auto h-4 text-[10px] px-1.5">{results.length}</Badge>
                               )}
                            </Button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                              const issueCount = pageIssueCounts.get(pageNum) || 0;
                              return (
                                <Button
                                  key={pageNum}
                                  variant="ghost"
                                  size="sm"
                                  className={`w-full justify-start text-xs h-8 ${activeSectionIndex === pageNum ? 'bg-primary/8 text-primary font-medium' : 'text-muted-foreground'}`}
                                  onClick={() => { setActiveSectionIndex(pageNum); setScrollToPage(pageNum); }}
                                >
                                   <FileText className="w-3.5 h-3.5 mr-2 shrink-0" />
                                   <span className="truncate">Page {pageNum}</span>
                                   {issueCount > 0 && (
                                     <Badge variant="secondary" className="ml-auto h-4 text-[10px] px-1.5 shrink-0 bg-amber-100 text-amber-700">{issueCount}</Badge>
                                   )}
                                </Button>
                              );
                            })}
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`w-full justify-start text-xs h-8 font-medium ${activeSectionIndex === null || activeSectionIndex === -1 ? 'bg-primary/8 text-primary' : 'text-muted-foreground'}`}
                              onClick={() => scrollToSection(-1)}
                            >
                               <FileText className="w-3.5 h-3.5 mr-2 shrink-0" /> Full Document
                               {results && results.length > 0 && (
                                 <Badge variant="secondary" className="ml-auto h-4 text-[10px] px-1.5">{results.length}</Badge>
                               )}
                            </Button>
                            {sections.map((section, idx) => {
                              const issueCount = sectionIssueCounts.get(idx) || 0;
                              return (
                                <Button
                                  key={idx}
                                  variant="ghost"
                                  size="sm"
                                  className={`w-full justify-start text-xs h-8 ${activeSectionIndex === idx ? 'bg-primary/8 text-primary font-medium' : 'text-muted-foreground'}`}
                                  onClick={() => scrollToSection(idx)}
                                  title={section.label}
                                >
                                   <FileText className="w-3.5 h-3.5 mr-2 shrink-0" />
                                   <span className="truncate">{section.label}</span>
                                   {issueCount > 0 && (
                                     <Badge variant="secondary" className="ml-auto h-4 text-[10px] px-1.5 shrink-0 bg-amber-100 text-amber-700">{issueCount}</Badge>
                                   )}
                                </Button>
                              );
                            })}
                          </>
                        )}
                     </div>
                   </ScrollArea>
                )}

             </motion.div>

             {/* Center: Document Viewer */}
             <div className="flex-1 bg-muted/5 relative overflow-hidden flex flex-col">
                <div ref={documentRef} className="w-full h-full overflow-y-auto px-4 py-4">
                   {/* Loading overlay */}
                   {(analysis.isPending || uploadAnalysis.isPending) && (
                     <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center">
                        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                        <p className="text-lg font-medium text-foreground">
                          {uploadAnalysis.isPending ? "Processing & Analyzing Files..." : "Analyzing Content..."}
                        </p>
                        <p className="text-muted-foreground">
                          {uploadAnalysis.isPending ? "Extracting text & images, then checking claims" : `Checking claims against ${selectedProfileName}`}
                        </p>
                     </div>
                   )}

                   {isDocumentMode && !isPdfMode ? (
                     /* Rendered document (Image only - not PDF) */
                     <div className="mx-auto bg-white rounded-md shadow-sm border border-border/60 p-6 relative min-h-[900px]">
                       <div className="text-[11px] text-muted-foreground bg-muted/30 rounded px-3 py-1.5 mx-auto max-w-xl text-center mb-2">
                         Fixes apply to extracted text. Use Download to export the corrected version.
                       </div>
                       <DocumentViewer
                         originalDocument={originalDocument}
                         results={results}
                         selectedIssueId={selectedIssueId}
                         hoveredIssueId={hoveredIssueId}
                         onSelectIssue={(id) => {
                           setSelectedIssueId(id);
                           const cardEl = document.getElementById(`card-${id}`);
                           cardEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                         }}
                         onHoverIssue={setHoveredIssueId}
                         scrollToPage={scrollToPage}
                       />

                       {/* Extracted images in document mode */}
                       {extractedImages.length > 0 && (
                         <div className="mt-4 pt-4 border-t border-border/40">
                           <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                             <ImageIcon className="w-3.5 h-3.5" /> Extracted Images ({extractedImages.length})
                           </h3>
                           <div className="grid grid-cols-1 gap-3">
                             {extractedImages.map((img) => {
                               const imgFindings = results?.filter(r => r.imageId === img.id) || [];
                               const borderColor = imgFindings.some(f => f.severity === 'high') ? 'border-red-400'
                                 : imgFindings.some(f => f.severity === 'medium') ? 'border-amber-400'
                                 : imgFindings.length > 0 ? 'border-sky-300' : 'border-border/60';
                               return (
                                 <div key={img.id} id={`image-${img.id}`} className={`border-2 ${borderColor} rounded-lg p-3 bg-muted/10`}>
                                   <div className="flex items-center justify-between mb-2">
                                     <span className="text-xs text-muted-foreground">{img.sourceLabel}</span>
                                     {imgFindings.length > 0 && <Badge variant="secondary" className="text-[10px] h-5">{imgFindings.length} finding{imgFindings.length !== 1 ? 's' : ''}</Badge>}
                                   </div>
                                   <img src={`data:${img.mediaType};base64,${img.data}`} alt={img.sourceLabel} className="max-w-full rounded border border-border/30" style={{ maxHeight: '400px', objectFit: 'contain' }} />
                                 </div>
                               );
                             })}
                           </div>
                         </div>
                       )}
                     </div>
                   ) : (
                     /* Text editor fallback */
                     <div className="mx-auto min-h-[900px] bg-white rounded-md shadow-sm border border-border/60 p-10 relative">
                        <div
                          ref={editableRef}
                          contentEditable
                          suppressContentEditableWarning
                          className="text-foreground min-h-[800px] focus:outline-none"
                          dangerouslySetInnerHTML={{ __html: highlightedHTML || '<p style="font-family: Georgia, serif; font-size: 1.125rem; line-height: 1.75; color: #a1a1aa;">Paste or type your content here...</p>' }}
                          onBlur={(e) => {
                            const newText = e.currentTarget.innerText.trim();
                            if (newText !== content.trim()) {
                              setContent(newText);
                              if (results) setContentDirty(true);
                            }
                          }}
                          onClick={(e) => {
                            const target = (e.target as HTMLElement).closest("[data-issue-id]");
                            if (target) {
                              const issueId = target.getAttribute("data-issue-id");
                              if (issueId) {
                                setSelectedIssueId(issueId);
                                const cardEl = document.getElementById(`card-${issueId}`);
                                cardEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }
                            }
                          }}
                          onMouseOver={(e) => {
                            const target = (e.target as HTMLElement).closest("[data-issue-id]");
                            if (target) {
                              const issueId = target.getAttribute("data-issue-id");
                              if (issueId) setHoveredIssueId(issueId);
                            }
                          }}
                          onMouseOut={(e) => {
                            const target = (e.target as HTMLElement).closest("[data-issue-id]");
                            if (target) setHoveredIssueId(null);
                          }}
                        />

                        {/* Extracted Images Gallery (only in text mode) */}
                        {extractedImages.length > 0 && (
                          <div className="mt-8 pt-6 border-t border-border/40">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                              <ImageIcon className="w-4 h-4" />
                              Extracted Images ({extractedImages.length})
                            </h3>
                            <div className="grid grid-cols-1 gap-4">
                              {extractedImages.map((img) => {
                                const imgFindings = results?.filter(r => r.imageId === img.id) || [];
                                const highestSeverity = imgFindings.reduce<string>((acc, f) => {
                                  if (f.severity === 'high') return 'high';
                                  if (f.severity === 'medium' && acc !== 'high') return 'medium';
                                  if (f.severity === 'low' && acc !== 'high' && acc !== 'medium') return 'low';
                                  return acc;
                                }, '');
                                const borderColor = highestSeverity === 'high' ? 'border-red-400' : highestSeverity === 'medium' ? 'border-amber-400' : highestSeverity === 'low' ? 'border-sky-300' : 'border-border/60';

                                return (
                                  <div
                                    key={img.id}
                                    id={`image-${img.id}`}
                                    className={`border-2 ${borderColor} rounded-lg p-3 bg-muted/10`}
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-xs font-medium text-muted-foreground">{img.sourceLabel}</span>
                                      {imgFindings.length > 0 && (
                                        <Badge variant="secondary" className="text-[10px] h-5">
                                          {imgFindings.length} finding{imgFindings.length !== 1 ? 's' : ''}
                                        </Badge>
                                      )}
                                    </div>
                                    <img
                                      src={`data:${img.mediaType};base64,${img.data}`}
                                      alt={img.sourceLabel}
                                      className="max-w-full rounded border border-border/30"
                                      style={{ maxHeight: '400px', objectFit: 'contain' }}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                     </div>
                   )}
                </div>
             </div>

             {/* Right Sidebar: Findings */}
             <motion.div
                animate={{ width: rightSidebarOpen ? 300 : 0 }}
                className="border-l border-border/60 bg-card flex-shrink-0 flex flex-col relative transition-all duration-200 overflow-hidden"
             >
                <div className="absolute -left-3 top-3 z-10">
                   <Button
                      variant="outline"
                      size="icon"
                      className="h-5 w-5 rounded-full shadow-sm bg-background border-border/60"
                      onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
                   >
                      {rightSidebarOpen ? <ChevronRight className="h-2.5 w-2.5" /> : <ChevronLeft className="h-2.5 w-2.5" />}
                   </Button>
                </div>

                <div className="border-b border-border/60 min-w-[300px]">
                   {/* Header */}
                   <div className="px-3 py-2 flex items-center justify-between">
                      <span className="font-medium text-sm">Compliance Review</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => setRightSidebarOpen(false)}>
                          <PanelRightClose className="h-3.5 w-3.5" />
                      </Button>
                   </div>

                   {/* Risk Score Meter */}
                   {results && results.length > 0 && (
                      <div className="px-3 pb-3 space-y-3">
                         {/* Score display */}
                         <div className="flex items-baseline justify-between">
                            <div className="flex items-baseline gap-2">
                               <span className={`text-2xl font-bold tabular-nums ${riskScore.color}`}>{riskScore.score}</span>
                               <span className="text-xs text-muted-foreground">/100</span>
                            </div>
                            <span className={`text-xs font-semibold ${riskScore.color}`}>{riskScore.label}</span>
                         </div>

                         {/* Risk bar — segmented gauge */}
                         <div className="relative">
                            <div className="flex h-2.5 rounded-full overflow-hidden bg-muted/40 gap-[1px]">
                               {/* 5 segments representing the scale */}
                               <div className={`flex-1 rounded-l-full transition-colors duration-500 ${riskScore.score >= 10 ? 'bg-emerald-400' : 'bg-muted/60'}`} />
                               <div className={`flex-1 transition-colors duration-500 ${riskScore.score >= 20 ? 'bg-yellow-400' : 'bg-muted/60'}`} />
                               <div className={`flex-1 transition-colors duration-500 ${riskScore.score >= 35 ? 'bg-amber-400' : 'bg-muted/60'}`} />
                               <div className={`flex-1 transition-colors duration-500 ${riskScore.score >= 50 ? 'bg-orange-500' : 'bg-muted/60'}`} />
                               <div className={`flex-1 rounded-r-full transition-colors duration-500 ${riskScore.score >= 70 ? 'bg-red-500' : 'bg-muted/60'}`} />
                            </div>
                            {/* Needle/indicator */}
                            <div
                               className="absolute top-[-3px] transition-all duration-700 ease-out"
                               style={{ left: `${Math.min(Math.max(riskScore.score, 2), 98)}%`, transform: 'translateX(-50%)' }}
                            >
                               <div className={`w-1 h-4 rounded-full ${riskScore.bgColor} shadow-sm`} />
                            </div>
                            {/* Scale labels */}
                            <div className="flex justify-between mt-1">
                               <span className="text-[9px] text-muted-foreground/60">Compliant</span>
                               <span className="text-[9px] text-muted-foreground/60">Critical</span>
                            </div>
                         </div>

                         {/* Fix progress indicator */}
                         {fixProgress && (
                            <div className="flex items-center gap-2 bg-emerald-50 rounded-md px-2.5 py-1.5">
                               <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                               <span className="text-[11px] text-emerald-700 font-medium">
                                  {fixProgress.fixed} of {fixProgress.total} issues resolved
                               </span>
                            </div>
                         )}

                         {/* Breakdown by severity */}
                         <div className="grid grid-cols-3 gap-1.5">
                            <button
                               className={`flex flex-col items-center rounded-md py-1.5 transition-colors ${
                                  severityFilter === 'high' ? 'bg-red-100 ring-1 ring-red-200' : 'bg-muted/30 hover:bg-red-50'
                               }`}
                               onClick={() => setSeverityFilter(severityFilter === 'high' ? 'all' : 'high')}
                            >
                               <span className="text-sm font-bold text-red-600 tabular-nums">{severityCounts.high}</span>
                               <span className="text-[10px] text-red-600/70 font-medium">High</span>
                            </button>
                            <button
                               className={`flex flex-col items-center rounded-md py-1.5 transition-colors ${
                                  severityFilter === 'medium' ? 'bg-amber-100 ring-1 ring-amber-200' : 'bg-muted/30 hover:bg-amber-50'
                               }`}
                               onClick={() => setSeverityFilter(severityFilter === 'medium' ? 'all' : 'medium')}
                            >
                               <span className="text-sm font-bold text-amber-600 tabular-nums">{severityCounts.medium}</span>
                               <span className="text-[10px] text-amber-600/70 font-medium">Medium</span>
                            </button>
                            <button
                               className={`flex flex-col items-center rounded-md py-1.5 transition-colors ${
                                  severityFilter === 'low' ? 'bg-sky-100 ring-1 ring-sky-200' : 'bg-muted/30 hover:bg-sky-50'
                               }`}
                               onClick={() => setSeverityFilter(severityFilter === 'low' ? 'all' : 'low')}
                            >
                               <span className="text-sm font-bold text-sky-600 tabular-nums">{severityCounts.low}</span>
                               <span className="text-[10px] text-sky-600/70 font-medium">Low</span>
                            </button>
                         </div>

                         {/* Show all / filter label */}
                         {severityFilter !== 'all' && (
                            <button
                               className="w-full text-center text-[11px] text-primary hover:underline"
                               onClick={() => setSeverityFilter('all')}
                            >
                               Show all {results.length} findings
                            </button>
                         )}
                      </div>
                   )}
                </div>

                <ScrollArea className="flex-1 p-2 min-w-[300px]">
                   <div className="space-y-1.5 pb-16">
                      {filteredResults?.map((result) => {
                         const isExpanded = selectedIssueId === result.id || hoveredIssueId === result.id;

                         // Severity-specific styles
                         const severityConfig = result.severity === 'high' ? {
                           border: 'border-l-red-600',
                           bg: isExpanded ? 'bg-red-50/60' : 'bg-background',
                           badgeBg: 'bg-red-600 text-white',
                           badgeLabel: 'HIGH',
                           icon: <ShieldAlert className="w-3.5 h-3.5 text-red-600 shrink-0" />,
                           ring: 'ring-red-300',
                           accentText: 'text-red-700',
                           suggestionBg: 'bg-red-50 border border-red-100',
                           fixBtn: 'bg-red-600 hover:bg-red-700 text-white',
                         } : result.severity === 'medium' ? {
                           border: 'border-l-amber-500',
                           bg: isExpanded ? 'bg-amber-50/40' : 'bg-background',
                           badgeBg: 'bg-amber-500 text-white',
                           badgeLabel: 'MED',
                           icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />,
                           ring: 'ring-amber-300',
                           accentText: 'text-amber-700',
                           suggestionBg: 'bg-amber-50 border border-amber-100',
                           fixBtn: 'bg-amber-600 hover:bg-amber-700 text-white',
                         } : {
                           border: 'border-l-sky-400',
                           bg: isExpanded ? 'bg-sky-50/30' : 'bg-background',
                           badgeBg: 'bg-sky-100 text-sky-700',
                           badgeLabel: 'LOW',
                           icon: <Info className="w-3.5 h-3.5 text-sky-500 shrink-0" />,
                           ring: 'ring-sky-200',
                           accentText: 'text-sky-600',
                           suggestionBg: 'bg-sky-50 border border-sky-100',
                           fixBtn: 'bg-sky-600 hover:bg-sky-700 text-white',
                         };

                         return (
                           <motion.div
                              key={result.id}
                              id={`card-${result.id}`}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              layout
                           >
                              <div
                                 className={`border-l-[3px] ${severityConfig.border} rounded-md ${severityConfig.bg} border border-border/50 cursor-pointer transition-all hover:shadow-sm ${
                                    selectedIssueId === result.id ? `shadow-md ring-1 ${severityConfig.ring}` : ''
                                 }`}
                                 onClick={() => handleSelectIssue(result.id)}
                                 onMouseEnter={() => setHoveredIssueId(result.id)}
                                 onMouseLeave={() => setHoveredIssueId(null)}
                              >
                                 {/* Collapsed: icon + issue + severity badge */}
                                 <div className="px-3 py-2">
                                    <div className="flex items-center gap-2 mb-1">
                                       {result.imageId ? <ImageIcon className="w-3.5 h-3.5 text-purple-500 shrink-0" /> : severityConfig.icon}
                                       <span className={`text-xs font-semibold truncate ${isExpanded ? severityConfig.accentText : 'text-foreground'}`}>{result.issue}</span>
                                       {result.imageId && (
                                         <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-sm shrink-0 leading-none font-medium">IMG</span>
                                       )}
                                       <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-sm ml-auto shrink-0 leading-none ${severityConfig.badgeBg}`}>
                                          {severityConfig.badgeLabel}
                                       </span>
                                    </div>
                                    {result.imageId ? (
                                      <div className="pl-6">
                                        {(() => {
                                          const sourceImg = extractedImages.find(img => img.id === result.imageId);
                                          return sourceImg ? (
                                            <div className="flex items-center gap-2">
                                              <img
                                                src={`data:${sourceImg.mediaType};base64,${sourceImg.data}`}
                                                alt={sourceImg.sourceLabel}
                                                className="w-10 h-10 rounded border border-border/40 object-cover shrink-0"
                                              />
                                              <div>
                                                <p className="text-[10px] text-muted-foreground font-medium">{result.imageLabel || sourceImg.sourceLabel}</p>
                                                <p className="text-[11px] text-muted-foreground leading-snug line-clamp-1">{result.original}</p>
                                              </div>
                                            </div>
                                          ) : (
                                            <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">{result.original}</p>
                                          );
                                        })()}
                                      </div>
                                    ) : (
                                      <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2 pl-6">
                                         {result.original}
                                      </p>
                                    )}
                                 </div>

                                 {/* Expanded: reason, tags, suggestion, fix */}
                                 <AnimatePresence>
                                    {isExpanded && (
                                       <motion.div
                                          initial={{ height: 0, opacity: 0 }}
                                          animate={{ height: 'auto', opacity: 1 }}
                                          exit={{ height: 0, opacity: 0 }}
                                          transition={{ duration: 0.15 }}
                                          className="overflow-hidden"
                                       >
                                          <div className="px-3 pb-2.5 space-y-2.5 border-t border-border/40 pt-2">
                                             {/* Reason */}
                                             <p className="text-xs text-foreground/80 leading-relaxed">
                                                {result.reason}
                                             </p>

                                             {/* Metadata tags */}
                                             <div className="flex items-center gap-1.5 flex-wrap overflow-hidden">
                                                <span className="text-[10px] font-medium bg-muted/60 px-1.5 py-0.5 rounded text-muted-foreground shrink-0">
                                                   {getDriftShort(result.driftType)}
                                                </span>
                                                <span className="text-[10px] bg-muted/40 px-1.5 py-0.5 rounded text-muted-foreground shrink-0">
                                                   L{result.driftLevel}
                                                </span>
                                                {result.exposureTags?.length > 0 && result.exposureTags.map(tag => (
                                                   <span key={tag} className="text-[10px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded font-medium truncate max-w-[120px]">
                                                      {EXPOSURE_SHORT[tag]}
                                                   </span>
                                                ))}
                                             </div>

                                             {/* Suggestion + Apply Fix — always shown */}
                                             {result.suggestion && (
                                                <div className="space-y-2">
                                                   <div className={`${severityConfig.suggestionBg} rounded px-2.5 py-2`}>
                                                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground block mb-1">
                                                        {result.imageId ? "Recommended Change" : "Suggested Fix"}
                                                      </span>
                                                      <p className="text-[11px] text-foreground/80 leading-relaxed">
                                                         {result.suggestion}
                                                      </p>
                                                   </div>
                                                   {!result.imageId && (
                                                     <Button
                                                        size="sm"
                                                        className={`w-full h-7 text-xs ${severityConfig.fixBtn}`}
                                                        onClick={(e) => { e.stopPropagation(); applyFix(result.id); }}
                                                     >
                                                        <Sparkles className="w-3 h-3 mr-1.5" />
                                                        Apply Fix
                                                     </Button>
                                                   )}
                                                </div>
                                             )}
                                          </div>
                                       </motion.div>
                                    )}
                                 </AnimatePresence>
                              </div>
                           </motion.div>
                         );
                      })}
                      {filteredResults?.length === 0 && !analysis.isPending && (
                         <div className="text-center py-8 text-muted-foreground">
                            {results && results.length > 0 ? (
                              <>
                                <p className="text-sm">No {severityFilter} issues.</p>
                                <button className="text-xs text-primary mt-1" onClick={() => setSeverityFilter('all')}>Show all</button>
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                                <p className="text-sm">No issues found.</p>
                              </>
                            )}
                         </div>
                      )}
                   </div>
                </ScrollArea>
             </motion.div>

             {/* Sidebar Reopen Button */}
             {!rightSidebarOpen && (
                 <div className="absolute right-3 top-16 z-10">
                    <Tooltip>
                       <TooltipTrigger asChild>
                          <Button
                             variant="outline"
                             size="icon"
                             className="h-8 w-8 rounded-full shadow-sm bg-background border-border/60"
                             onClick={() => setRightSidebarOpen(true)}
                          >
                             <PanelRight className="h-4 w-4 text-muted-foreground" />
                          </Button>
                       </TooltipTrigger>
                       <TooltipContent side="left">Show Findings</TooltipContent>
                    </Tooltip>
                 </div>
             )}

          </div>
      )}

    </div>
  );
}
