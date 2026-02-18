import { useState, useCallback, useEffect } from "react";
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
  PanelRightClose,
  PanelRight,
  Home,
  Menu,
  Flag,
  Target,
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
import type { AnalysisResult } from "@shared/schema";

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
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [selectedProfileId, setSelectedProfileId] = useState<string>(preselectedProfileId || "");

  const { toast } = useToast();
  const { data: products } = useProducts();
  const analysis = useAnalysis();

  // Set first product as default if none preselected
  useEffect(() => {
    if (!selectedProfileId && products && products.length > 0) {
      setSelectedProfileId(String(products[0].id));
    }
  }, [products, selectedProfileId]);

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
                  <SelectItem value="" disabled>No profiles yet</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
           {step === "results" && (
              <Button variant="outline" size="sm" onClick={resetAnalysis} className="h-7 text-xs">
                 <RefreshCw className="mr-1.5 h-3 w-3" /> New Analysis
              </Button>
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
                   <div className="p-1.5 space-y-0.5">
                      <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-8 font-medium bg-primary/8 text-primary">
                         <FileText className="w-3.5 h-3.5 mr-2" /> Full Document
                      </Button>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-8 text-muted-foreground">
                         <Target className="w-3.5 h-3.5 mr-2" /> Performance Claims
                      </Button>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-8 text-muted-foreground">
                         <AlertTriangle className="w-3.5 h-3.5 mr-2" /> Safety Warnings
                      </Button>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-8 text-muted-foreground">
                         <Flag className="w-3.5 h-3.5 mr-2" /> Marketing & Brand
                      </Button>
                   </div>
                )}

                <div className="mt-auto px-3 py-2.5 border-t border-border/60">
                   {leftSidebarOpen ? (
                      <div className="space-y-2">
                          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Summary</span>
                          <div className="flex items-center justify-between text-xs">
                             <span className="text-muted-foreground">Total Issues</span>
                             <Badge variant="secondary" className="h-5 text-[11px]">{results?.length || 0}</Badge>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                             <span className="text-muted-foreground">High Severity</span>
                             <Badge variant="secondary" className="h-5 text-[11px] bg-destructive/10 text-destructive">{results?.filter(r => r.severity === 'high').length || 0}</Badge>
                          </div>
                      </div>
                   ) : (
                      <div className="flex justify-center">
                         <Badge variant="secondary" className="h-5 w-5 flex items-center justify-center p-0 rounded-full text-[10px]">
                            {results?.length || 0}
                         </Badge>
                      </div>
                   )}
                </div>
             </motion.div>

             {/* Center: Main Editor */}
             <div className="flex-1 bg-muted/5 relative overflow-hidden flex flex-col">
                <div className="w-full h-full overflow-y-auto px-4 py-4">
                   <div className="mx-auto min-h-[900px] bg-white rounded-md shadow-sm border border-border/60 p-10 relative">
                      {analysis.isPending && (
                         <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center">
                            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                            <p className="text-lg font-medium text-foreground">Analyzing Content...</p>
                            <p className="text-muted-foreground">Checking claims against {selectedProfileName}</p>
                         </div>
                      )}
                      <Textarea
                         value={content}
                         onChange={(e) => setContent(e.target.value)}
                         className="w-full h-full min-h-[800px] resize-none border-0 focus-visible:ring-0 p-0 text-lg leading-loose text-foreground font-serif"
                         placeholder="Document content..."
                         style={{ fontFamily: 'Georgia, serif' }}
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
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, height: 0 }}
                            layout
                         >
                            <Card
                               className={`border-l-[3px] cursor-pointer transition-all ${
                                  selectedIssueId === result.id ? 'ring-1 ring-primary ring-offset-1' : ''
                               } ${
                                  result.severity === 'high' ? 'border-l-destructive' :
                                  result.severity === 'medium' ? 'border-l-amber-500' :
                                  'border-l-blue-500'
                               }`}
                               onClick={() => setSelectedIssueId(result.id)}
                            >
                               <CardContent className="p-2.5 space-y-1.5">
                                  <div className="flex items-center justify-between">
                                     <Badge variant="outline" className={`text-[11px] h-5 ${
                                        result.severity === 'high' ? 'text-destructive border-destructive/20 bg-destructive/5' :
                                        'text-amber-600 border-amber-200 bg-amber-50'
                                     }`}>
                                        {result.issue}
                                     </Badge>
                                     <span className="text-[10px] text-muted-foreground uppercase">{result.type}</span>
                                  </div>

                                  <div className="bg-muted/30 px-2 py-1 rounded text-[11px] italic border-l-2 border-muted-foreground/20 text-muted-foreground leading-relaxed">
                                     "{result.original}"
                                  </div>

                                  <p className="text-[11px] text-foreground leading-relaxed">
                                     {result.reason}
                                  </p>

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
