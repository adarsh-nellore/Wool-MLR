import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useSearch } from "wouter";
import {
  Loader2,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Wand2,
  Upload,
  FileText,
  File,
  X,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  PanelRightClose,
  PanelRight,
  Home,
  Menu,
  Flag,
  Target,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useProducts } from "@/hooks/use-products";
import { useAnalysis } from "@/hooks/use-analysis";
import type { AnalysisResult, DriftType, DriftLevel, ExposureTag } from "@shared/schema";

// ── Drift UI Constants ──

const DRIFT_TYPE_COLORS: Record<DriftType, string> = {
  "Diagnostic Drift": "bg-purple-100 text-purple-700 border-purple-200",
  "Therapeutic Drift": "bg-rose-100 text-rose-700 border-rose-200",
  "Preventive Drift": "bg-orange-100 text-orange-700 border-orange-200",
  "Standalone Drift": "bg-indigo-100 text-indigo-700 border-indigo-200",
  "Classification Escalation": "bg-red-100 text-red-700 border-red-200",
  "Population Expansion": "bg-cyan-100 text-cyan-700 border-cyan-200",
  "Use Environment Expansion": "bg-teal-100 text-teal-700 border-teal-200",
  "Intended Use Redefinition": "bg-yellow-100 text-yellow-700 border-yellow-200",
};

const EXPOSURE_TAG_COLORS: Record<ExposureTag, string> = {
  "Substantiation Exposure": "bg-slate-100 text-slate-600 border-slate-200",
  "Liability Exposure": "bg-rose-50 text-rose-600 border-rose-200",
  "Advertising Exposure": "bg-amber-50 text-amber-600 border-amber-200",
};

const EXPOSURE_SHORT: Record<ExposureTag, string> = {
  "Substantiation Exposure": "Substantiation",
  "Liability Exposure": "Liability",
  "Advertising Exposure": "Advertising",
};

const DRIFT_LEVEL_LABELS: Record<DriftLevel, string> = {
  0: "Aligned",
  1: "Amplification",
  2: "Implied",
  3: "Explicit",
  4: "Class-Changing",
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

function getHighlightClass(severity: string, isHovered: boolean, isSelected: boolean): string {
  if (isSelected) {
    if (severity === 'high') return 'bg-red-300 ring-1 ring-red-400';
    if (severity === 'medium') return 'bg-amber-300 ring-1 ring-amber-400';
    return 'bg-blue-300 ring-1 ring-blue-400';
  }
  if (isHovered) {
    if (severity === 'high') return 'bg-red-200';
    if (severity === 'medium') return 'bg-amber-200';
    return 'bg-blue-200';
  }
  if (severity === 'high') return 'bg-red-100/60';
  if (severity === 'medium') return 'bg-amber-100/60';
  return 'bg-blue-100/60';
}

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
  const [summaryOpen, setSummaryOpen] = useState(true);

  const documentRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();
  const { data: products } = useProducts();
  const analysis = useAnalysis();

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

  // Render highlighted content as React elements
  const renderHighlightedContent = useCallback(() => {
    if (!content) return null;

    // Build inline children for a text segment, inserting highlights
    const buildInline = (text: string, segStart: number): React.ReactNode[] => {
      const segEnd = segStart + text.length;
      const segRanges = highlightRanges.filter(
        r => r.start < segEnd && r.end > segStart
      );
      const children: React.ReactNode[] = [];
      let cursor = 0;

      for (const range of segRanges) {
        const relStart = Math.max(0, range.start - segStart);
        const relEnd = Math.min(text.length, range.end - segStart);

        if (relStart > cursor) {
          children.push(text.substring(cursor, relStart));
        }

        const isHovered = hoveredIssueId === range.resultId;
        const isSelected = selectedIssueId === range.resultId;
        const className = `rounded-sm cursor-pointer transition-colors ${getHighlightClass(range.severity, isHovered, isSelected)}`;

        children.push(
          <span
            key={`highlight-${range.resultId}`}
            id={`highlight-${range.resultId}`}
            data-issue-id={range.resultId}
            className={className}
            onMouseEnter={() => setHoveredIssueId(range.resultId)}
            onMouseLeave={() => setHoveredIssueId(null)}
            onClick={() => {
              setSelectedIssueId(range.resultId);
              const cardEl = document.getElementById(`card-${range.resultId}`);
              cardEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
          >
            {text.substring(relStart, relEnd)}
          </span>
        );

        cursor = relEnd;
      }

      if (cursor < text.length) {
        children.push(text.substring(cursor));
      }

      return children;
    };

    // Interleave text children with <br /> for single newlines
    const renderWithBreaks = (text: string, segStart: number): React.ReactNode[] => {
      const lines = text.split('\n');
      const result: React.ReactNode[] = [];
      let offset = segStart;
      for (let i = 0; i < lines.length; i++) {
        if (i > 0) result.push(<br key={`br-${offset}`} />);
        result.push(...buildInline(lines[i], offset));
        offset += lines[i].length + 1; // +1 for the \n
      }
      return result;
    };

    const paragraphs = content.split('\n\n');
    let globalOffset = 0;
    const elements: React.ReactNode[] = [];

    for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
      const para = paragraphs[pIdx];
      const paraStart = globalOffset;

      const lines = para.split('\n');
      const firstLine = lines[0].trim();
      const heading = isHeadingLine(firstLine);

      if (heading) {
        // Render heading as <h3>
        elements.push(
          <h3
            key={`heading-${pIdx}`}
            id={`section-${pIdx}`}
            className="text-xl font-semibold mt-6 mb-2"
          >
            {buildInline(lines[0], paraStart)}
          </h3>
        );

        // Render the rest of the block as a body paragraph
        if (lines.length > 1) {
          const restText = lines.slice(1).join('\n');
          const restOffset = paraStart + lines[0].length + 1;
          elements.push(
            <p
              key={`section-body-${pIdx}`}
              className="mb-4 text-lg leading-relaxed"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              {renderWithBreaks(restText, restOffset)}
            </p>
          );
        }
      } else {
        // Plain paragraph — preserve single \n as <br />
        elements.push(
          <p
            key={`section-${pIdx}`}
            id={`section-${pIdx}`}
            className="mb-4 text-lg leading-relaxed"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {renderWithBreaks(para, paraStart)}
          </p>
        );
      }

      globalOffset = paraStart + para.length + 2; // +2 for \n\n
    }

    return elements;
  }, [content, highlightRanges, hoveredIssueId, selectedIssueId]);

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
  };

  const handleExport = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'analyzed-document.txt';
    a.click();
    URL.revokeObjectURL(url);
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

  const selectedProfileName = products?.find(p => String(p.id) === selectedProfileId)?.name || "Select Profile";

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
                <Button variant="outline" size="sm" onClick={handleExport} className="h-7 text-xs">
                   <Download className="mr-1.5 h-3 w-3" /> Download
                </Button>
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
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="flex-1 resize-none p-6 text-base leading-relaxed bg-card border rounded-lg focus-visible:ring-1 focus-visible:ring-primary/20"
                    placeholder="Paste text here..."
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
                    <Button onClick={() => setContent(" ")} variant="outline" size="sm">Paste Text</Button>
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
                   {/* Collapsible Summary Banner */}
                   {results && (
                     <div className="mx-auto mb-3">
                       <div className="bg-card border rounded-lg px-4 py-2.5">
                         <div className="flex items-center justify-between">
                           <div className="flex items-center gap-3">
                             <Badge variant="secondary" className="h-6 text-xs font-semibold">
                               {results.length} {results.length === 1 ? 'Issue' : 'Issues'}
                             </Badge>
                             <AnimatePresence>
                               {summaryOpen && (
                                 <motion.div
                                   initial={{ opacity: 0, width: 0 }}
                                   animate={{ opacity: 1, width: 'auto' }}
                                   exit={{ opacity: 0, width: 0 }}
                                   className="flex items-center gap-2 overflow-hidden"
                                 >
                                   <Badge variant="outline" className="h-5 text-[11px] text-destructive border-destructive/20 bg-destructive/5">
                                     {results.filter(r => r.severity === 'high').length} High
                                   </Badge>
                                   <Badge variant="outline" className="h-5 text-[11px] text-amber-600 border-amber-200 bg-amber-50">
                                     {results.filter(r => r.severity === 'medium').length} Medium
                                   </Badge>
                                   <Badge variant="outline" className="h-5 text-[11px] text-blue-600 border-blue-200 bg-blue-50">
                                     {results.filter(r => r.severity === 'low').length} Low
                                   </Badge>
                                   <Separator orientation="vertical" className="h-4" />
                                   <span className="text-xs text-muted-foreground">{selectedProfileName}</span>
                                 </motion.div>
                               )}
                             </AnimatePresence>
                             <AnimatePresence>
                               {summaryOpen && results && (
                                 <motion.div
                                   initial={{ opacity: 0, width: 0 }}
                                   animate={{ opacity: 1, width: 'auto' }}
                                   exit={{ opacity: 0, width: 0 }}
                                   className="flex items-center gap-1.5 overflow-hidden"
                                 >
                                   <Separator orientation="vertical" className="h-4" />
                                   {([0, 1, 2, 3, 4] as DriftLevel[]).map(level => {
                                     const count = results.filter(r => r.driftLevel === level).length;
                                     if (count === 0) return null;
                                     return (
                                       <Badge key={level} variant="outline" className={`h-5 text-[10px] font-mono ${
                                         level >= 3 ? 'text-red-600 border-red-200 bg-red-50' :
                                         level === 2 ? 'text-amber-600 border-amber-200 bg-amber-50' :
                                         'text-gray-500 border-gray-200 bg-gray-50'
                                       }`}>
                                         L{level}: {count}
                                       </Badge>
                                     );
                                   })}
                                 </motion.div>
                               )}
                             </AnimatePresence>
                           </div>
                           <Button
                             variant="ghost"
                             size="icon"
                             className="h-6 w-6 text-muted-foreground"
                             onClick={() => setSummaryOpen(!summaryOpen)}
                           >
                             {summaryOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                           </Button>
                         </div>
                       </div>
                     </div>
                   )}

                   <div className="mx-auto min-h-[900px] bg-white rounded-md shadow-sm border border-border/60 p-10 relative">
                      {analysis.isPending && (
                         <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center">
                            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                            <p className="text-lg font-medium text-foreground">Analyzing Content...</p>
                            <p className="text-muted-foreground">Checking claims against {selectedProfileName}</p>
                         </div>
                      )}
                      {results ? (
                        <div className="text-foreground">
                          {renderHighlightedContent()}
                        </div>
                      ) : (
                        <Textarea
                           value={content}
                           onChange={(e) => setContent(e.target.value)}
                           className="w-full h-full min-h-[800px] resize-none border-0 focus-visible:ring-0 p-0 text-lg leading-loose text-foreground font-serif"
                           placeholder="Document content..."
                           style={{ fontFamily: 'Georgia, serif' }}
                        />
                      )}
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

                <div className="px-3 py-2 border-b border-border/60 h-10 flex items-center justify-between min-w-[300px]">
                   <span className="font-medium text-sm">Findings</span>
                   <div className="flex items-center gap-1.5">
                       <Badge variant="outline" className="text-[11px] h-5">{results?.length || 0}</Badge>
                       <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => setRightSidebarOpen(false)}>
                           <PanelRightClose className="h-3.5 w-3.5" />
                       </Button>
                   </div>
                </div>

                <ScrollArea className="flex-1 p-2 min-w-[300px]">
                   <div className="space-y-2 pb-16">
                      {results?.map((result) => (
                         <motion.div
                            key={result.id}
                            id={`card-${result.id}`}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, height: 0 }}
                            layout
                         >
                            <Card
                               className={`border-l-[3px] cursor-pointer transition-all ${
                                  selectedIssueId === result.id ? 'ring-1 ring-primary ring-offset-1' : ''
                               } ${
                                  hoveredIssueId === result.id && selectedIssueId !== result.id ? 'ring-1 ring-muted-foreground/30' : ''
                               } ${
                                  result.severity === 'high' ? 'border-l-destructive' :
                                  result.severity === 'medium' ? 'border-l-amber-500' :
                                  'border-l-blue-500'
                               }`}
                               onClick={() => handleSelectIssue(result.id)}
                               onMouseEnter={() => setHoveredIssueId(result.id)}
                               onMouseLeave={() => setHoveredIssueId(null)}
                            >
                               <CardContent className="p-2.5 space-y-1.5">
                                  <div className="flex items-center justify-between">
                                     <Badge variant="outline" className={`text-[11px] h-5 ${
                                        result.severity === 'high' ? 'text-destructive border-destructive/20 bg-destructive/5' :
                                        'text-amber-600 border-amber-200 bg-amber-50'
                                     }`}>
                                        {result.issue}
                                     </Badge>
                                     <span className="text-[10px] text-muted-foreground uppercase">{getDriftShort(result.driftType) || result.type}</span>
                                  </div>

                                  {/* Drift & Exposure pills */}
                                  <div className="flex items-center gap-1 flex-wrap">
                                     <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium border ${DRIFT_TYPE_COLORS[result.driftType] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                        {result.driftType}
                                     </span>
                                     <span className={`inline-flex items-center rounded px-1 py-0.5 text-[10px] font-mono font-bold ${
                                        result.driftLevel >= 3 ? 'bg-red-100 text-red-700' :
                                        result.driftLevel === 2 ? 'bg-amber-100 text-amber-700' :
                                        'bg-gray-100 text-gray-500'
                                     }`}>
                                        L{result.driftLevel}
                                     </span>
                                     {result.exposureTags?.map(tag => (
                                        <span key={tag} className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] border ${EXPOSURE_TAG_COLORS[tag] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                                           {EXPOSURE_SHORT[tag] || tag}
                                        </span>
                                     ))}
                                  </div>

                                  <div className="bg-muted/30 px-2 py-1 rounded text-[11px] italic border-l-2 border-muted-foreground/20 text-muted-foreground leading-relaxed">
                                     "{result.original}"
                                  </div>

                                  <p className="text-[11px] text-foreground leading-relaxed">
                                     {result.reason}
                                  </p>

                                  {result.boundaryReference && (
                                     <div className="border-l-2 border-primary/30 pl-2">
                                        <p className="text-[10px] italic text-muted-foreground leading-relaxed">
                                           {result.boundaryReference}
                                        </p>
                                     </div>
                                  )}

                                  {selectedIssueId === result.id && (
                                     <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="pt-1"
                                     >
                                        <div className="bg-green-50 border border-green-100 rounded p-2 mb-2">
                                           <div className="flex items-center gap-1.5 mb-0.5">
                                              <CheckCircle className="w-3 h-3 text-green-600" />
                                              <span className="text-[10px] font-semibold text-green-700 uppercase">Suggestion</span>
                                           </div>
                                           <p className="text-xs text-green-800 font-medium leading-relaxed">"{result.suggestion}"</p>
                                        </div>
                                        <Button
                                           size="sm"
                                           className="w-full btn-soft-primary h-7 text-xs"
                                           onClick={(e) => { e.stopPropagation(); applyFix(result.id); }}
                                        >
                                           <RefreshCw className="w-3 h-3 mr-1.5" />
                                           Apply Fix
                                        </Button>
                                     </motion.div>
                                  )}
                               </CardContent>
                            </Card>
                         </motion.div>
                      ))}
                      {results?.length === 0 && !analysis.isPending && (
                         <div className="text-center py-8 text-muted-foreground">
                            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                            <p className="text-sm">No issues found.</p>
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
