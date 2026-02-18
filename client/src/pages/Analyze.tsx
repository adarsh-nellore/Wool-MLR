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
import { useAnalysis } from "@/hooks/use-analysis";
import type { AnalysisResult, DriftType, ExposureTag, StoredAnalysis } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

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
  .highlight-high { background: rgba(239, 68, 68, 0.15); border-radius: 2px; cursor: pointer; transition: background 0.15s; }
  .highlight-medium { background: rgba(245, 158, 11, 0.15); border-radius: 2px; cursor: pointer; transition: background 0.15s; }
  .highlight-low { background: rgba(59, 130, 246, 0.15); border-radius: 2px; cursor: pointer; transition: background 0.15s; }

  .highlight-high:hover, .highlight-high[data-hovered="true"] { background: rgba(239, 68, 68, 0.35); }
  .highlight-medium:hover, .highlight-medium[data-hovered="true"] { background: rgba(245, 158, 11, 0.35); }
  .highlight-low:hover, .highlight-low[data-hovered="true"] { background: rgba(59, 130, 246, 0.35); }

  .highlight-high[data-selected="true"] { background: rgba(239, 68, 68, 0.5); box-shadow: 0 0 0 1px rgba(239, 68, 68, 0.6); }
  .highlight-medium[data-selected="true"] { background: rgba(245, 158, 11, 0.5); box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.6); }
  .highlight-low[data-selected="true"] { background: rgba(59, 130, 246, 0.5); box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.6); }

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

  const documentRef = useRef<HTMLDivElement>(null);
  const editableRef = useRef<HTMLDivElement>(null);
  const [contentDirty, setContentDirty] = useState(false);

  const { toast } = useToast();
  const { data: products } = useProducts();
  const analysis = useAnalysis();

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
          setSelectedProfileId(String(stored.profileId));
          setStep("results");
        } catch {
          toast({ title: "Error", description: "Could not load stored analysis.", variant: "destructive" });
        }
      })();
    }
  }, [analysisIdParam]);

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
    // Read text from file
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
    if (!content.trim()) {
      toast({ title: "No content", description: "Please enter or upload content to analyze.", variant: "destructive" });
      return;
    }

    setStep("results");
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
     setActiveSectionIndex(null);
     setContentDirty(false);
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
    // Scroll document to the highlight
    const highlightEl = document.getElementById(`highlight-${issueId}`);
    highlightEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
              {content ? (
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
                        <File className="w-3 h-3" />
                        {uploadedFile}
                        <button className="ml-1 hover:text-foreground" onClick={() => setUploadedFile(null)}>
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    )}
                  </div>
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
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setContent("")}>Clear</Button>
                    <Button onClick={handleAnalyze} className="btn-soft-primary" size="sm" disabled={!selectedProfileId}>
                      <Wand2 className="mr-1.5 h-3.5 w-3.5" /> Analyze Content
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
                    Drag & drop a text file or paste content directly
                  </p>
                  <div className="flex flex-col gap-2.5 w-full max-w-[240px]">
                    <div className="relative">
                      <Button className="w-full btn-soft-primary" size="sm">Choose File</Button>
                      <input
                        type="file"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => e.target.files && e.target.files[0] && handleFiles(e.target.files[0])}
                        accept=".txt,.csv,.md"
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
                      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Sections</span>
                   ) : (
                      <Menu className="h-3.5 w-3.5 text-muted-foreground mx-auto" />
                   )}
                </div>

                {leftSidebarOpen && (
                   <ScrollArea className="flex-1">
                     <div className="p-1.5 space-y-0.5">
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
                     </div>
                   </ScrollArea>
                )}

             </motion.div>

             {/* Center: Document Viewer */}
             <div className="flex-1 bg-muted/5 relative overflow-hidden flex flex-col">
                <div ref={documentRef} className="w-full h-full overflow-y-auto px-4 py-4">
                   <div className="mx-auto min-h-[900px] bg-white rounded-md shadow-sm border border-border/60 p-10 relative">
                      {analysis.isPending && (
                         <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center">
                            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                            <p className="text-lg font-medium text-foreground">Analyzing Content...</p>
                            <p className="text-muted-foreground">Checking claims against {selectedProfileName}</p>
                         </div>
                      )}
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
                          // Event delegation for highlight clicks
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
                   </div>
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
                   <div className="px-3 py-2 flex items-center justify-between">
                      <span className="font-medium text-sm">Findings</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => setRightSidebarOpen(false)}>
                          <PanelRightClose className="h-3.5 w-3.5" />
                      </Button>
                   </div>
                   {results && results.length > 0 && (
                      <div className="px-2 pb-2 flex items-center gap-1">
                         <button
                            className={`h-6 px-2 rounded text-[11px] font-medium transition-colors ${severityFilter === 'all' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                            onClick={() => setSeverityFilter('all')}
                         >
                            All {results.length}
                         </button>
                         {severityCounts.high > 0 && (
                            <button
                               className={`h-6 px-2 rounded text-[11px] font-medium transition-colors ${severityFilter === 'high' ? 'bg-red-100 text-red-700' : 'text-red-500/70 hover:text-red-700 hover:bg-red-50'}`}
                               onClick={() => setSeverityFilter(severityFilter === 'high' ? 'all' : 'high')}
                            >
                               {severityCounts.high} High
                            </button>
                         )}
                         {severityCounts.medium > 0 && (
                            <button
                               className={`h-6 px-2 rounded text-[11px] font-medium transition-colors ${severityFilter === 'medium' ? 'bg-amber-100 text-amber-700' : 'text-amber-500/70 hover:text-amber-700 hover:bg-amber-50'}`}
                               onClick={() => setSeverityFilter(severityFilter === 'medium' ? 'all' : 'medium')}
                            >
                               {severityCounts.medium} Med
                            </button>
                         )}
                         {severityCounts.low > 0 && (
                            <button
                               className={`h-6 px-2 rounded text-[11px] font-medium transition-colors ${severityFilter === 'low' ? 'bg-blue-100 text-blue-700' : 'text-blue-500/70 hover:text-blue-700 hover:bg-blue-50'}`}
                               onClick={() => setSeverityFilter(severityFilter === 'low' ? 'all' : 'low')}
                            >
                               {severityCounts.low} Low
                            </button>
                         )}
                      </div>
                   )}
                </div>

                <ScrollArea className="flex-1 p-2 min-w-[300px]">
                   <div className="space-y-1.5 pb-16">
                      {filteredResults?.map((result) => {
                         const isExpanded = selectedIssueId === result.id || hoveredIssueId === result.id;
                         const severityColor = result.severity === 'high' ? 'border-l-red-500' : result.severity === 'medium' ? 'border-l-amber-400' : 'border-l-blue-400';
                         const severityDot = result.severity === 'high' ? 'bg-red-500' : result.severity === 'medium' ? 'bg-amber-400' : 'bg-blue-400';

                         return (
                           <motion.div
                              key={result.id}
                              id={`card-${result.id}`}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              layout
                           >
                              <div
                                 className={`border-l-[3px] ${severityColor} rounded-md bg-background border border-border/50 cursor-pointer transition-all hover:shadow-sm ${
                                    selectedIssueId === result.id ? 'shadow-sm ring-1 ring-primary/30' : ''
                                 }`}
                                 onClick={() => handleSelectIssue(result.id)}
                                 onMouseEnter={() => setHoveredIssueId(result.id)}
                                 onMouseLeave={() => setHoveredIssueId(null)}
                              >
                                 {/* Collapsed: severity dot + issue label + snippet */}
                                 <div className="px-3 py-2">
                                    <div className="flex items-center gap-2 mb-1">
                                       <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${severityDot}`} />
                                       <span className="text-xs font-medium text-foreground truncate">{result.issue}</span>
                                       <span className="text-[10px] text-muted-foreground ml-auto shrink-0">L{result.driftLevel}</span>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2 pl-3.5">
                                       {result.original}
                                    </p>
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
                                          <div className="px-3 pb-2.5 space-y-2 border-t border-border/40 pt-2">
                                             {/* Reason */}
                                             <p className="text-xs text-foreground/80 leading-relaxed">
                                                {result.reason}
                                             </p>

                                             {/* Compact metadata row */}
                                             <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="text-[10px] text-muted-foreground">{getDriftShort(result.driftType)}</span>
                                                {result.exposureTags?.length > 0 && (
                                                   <>
                                                      <span className="text-border">·</span>
                                                      {result.exposureTags.map(tag => (
                                                         <span key={tag} className="text-[10px] text-muted-foreground">
                                                            {EXPOSURE_SHORT[tag]}
                                                         </span>
                                                      ))}
                                                   </>
                                                )}
                                             </div>

                                             {/* Suggestion + Apply Fix */}
                                             {result.suggestion && (
                                                <div className="space-y-2">
                                                   <p className="text-[11px] text-foreground/70 leading-relaxed bg-muted/30 rounded px-2.5 py-1.5">
                                                      {result.suggestion}
                                                   </p>
                                                   <Button
                                                      size="sm"
                                                      className="w-full h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                                                      onClick={(e) => { e.stopPropagation(); applyFix(result.id); }}
                                                   >
                                                      <Sparkles className="w-3 h-3 mr-1.5" />
                                                      Apply AI Fix
                                                   </Button>
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
