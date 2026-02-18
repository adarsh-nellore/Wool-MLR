import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Loader2, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  ArrowRight, 
  RefreshCw,
  Copy,
  Wand2,
  Upload,
  FileText,
  File,
  X,
  ChevronRight,
  Search,
  Maximize2,
  Minimize2,
  MoreVertical,
  Flag,
  Target
} from "lucide-react";
import Layout from "../components/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

type AnalysisResult = {
  id: string;
  original: string;
  type: "Performance" | "Safety" | "Marketing" | "Procedural";
  issue: string;
  severity: "high" | "medium" | "low" | "none";
  reason: string;
  suggestion: string;
  start: number;
  end: number;
};

const MOCK_RESULTS: AnalysisResult[] = [
  {
    id: "1",
    original: "Reduces procedure time by 30%.",
    type: "Performance",
    issue: "Unsubstantiated Claim",
    severity: "medium",
    reason: "Specific percentage claims require head-to-head clinical data from a pivotal trial.",
    suggestion: "May help reduce procedure time compared to standard techniques.",
    start: 0,
    end: 28
  },
  {
    id: "2",
    original: "The only catheter you'll ever need.",
    type: "Marketing",
    issue: "Absolutes / Superlatives",
    severity: "high",
    reason: "Avoid 'only', 'always', 'never' unless substantiated by definitive market share data.",
    suggestion: "Designed to be a versatile solution for diverse procedural needs.",
    start: 35,
    end: 70
  },
  {
    id: "3",
    original: "Zero risk of infection.",
    type: "Safety",
    issue: "False Safety Guarantee",
    severity: "high",
    reason: "No device can guarantee zero risk. Use 'Designed to minimize infection risk'.",
    suggestion: "Designed to minimize the risk of infection.",
    start: 80,
    end: 103
  }
];

export default function Analyze() {
  const [step, setStep] = useState<"input" | "results">("input");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResult[] | null>(null);
  const [content, setContent] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const { toast } = useToast();

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
    toast({
      title: "File Uploaded",
      description: `Extracting text from ${file.name}...`,
    });
    
    setTimeout(() => {
       setContent(prev => prev + (prev ? "\n\n" : "") + "Reduces procedure time by 30%. The only catheter you'll ever need. Zero risk of infection.\n\nAdditional content from the document goes here. This section discusses the safety profile and ease of use features that are critical for adoption.");
       toast({
          title: "Extraction Complete",
          description: "Text extracted from document.",
       });
    }, 1000);
  };

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    setStep("results");
    setTimeout(() => {
      setIsAnalyzing(false);
      setResults(MOCK_RESULTS);
      toast({
        title: "Analysis Complete",
        description: "Found 3 potential compliance issues.",
      });
    }, 2000);
  };

  const applyFix = (id: string) => {
    const result = results?.find(r => r.id === id);
    if (result) {
      setContent(prev => prev.replace(result.original, result.suggestion));
      setResults(prev => prev?.filter(r => r.id !== id) || null);
      if (selectedIssueId === id) setSelectedIssueId(null);
      toast({
        title: "Fix Applied",
        description: "Content updated with suggested wording.",
      });
    }
  };

  const resetAnalysis = () => {
     setStep("input");
     setResults(null);
     setContent("");
     setUploadedFile(null);
  }

  return (
    <Layout>
      <div className="h-[calc(100vh-4rem)] flex flex-col bg-muted/5"> {/* Full height container */}
        
        {/* Top Bar */}
        <div className="h-16 border-b bg-card px-6 flex items-center justify-between shrink-0 z-20 shadow-sm">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold tracking-tight">Content Analysis</h1>
            <Separator orientation="vertical" className="h-6" />
            <Select defaultValue="cardioflow">
              <SelectTrigger className="w-[180px] h-8 text-sm bg-muted/50 border-0 focus:ring-0">
                <SelectValue placeholder="Select Profile" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cardioflow">CardioFlow X1</SelectItem>
                <SelectItem value="neurostim">NeuroStim Pro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
             {step === "results" && (
                <Button variant="outline" size="sm" onClick={resetAnalysis} className="h-9">
                   <RefreshCw className="mr-2 h-4 w-4" /> New Analysis
                </Button>
             )}
          </div>
        </div>

        {step === "input" ? (
            /* ================= INPUT MODE ================= */
            <div className="flex-1 p-8 overflow-y-auto">
               <div className="max-w-4xl mx-auto h-full flex flex-col">
                  <Card className="flex-1 flex flex-col border-dashed border-2 shadow-none bg-muted/10">
                      <CardContent className="flex-1 flex flex-col items-center justify-center p-12 gap-6"
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                      >
                        <AnimatePresence>
                            {content ? (
                              <motion.div 
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className="w-full h-full flex flex-col gap-4"
                              >
                                  <div className="flex items-center justify-between">
                                    <h3 className="font-semibold flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-primary" />
                                        Content to Analyze
                                    </h3>
                                    {uploadedFile && (
                                        <Badge variant="secondary" className="gap-1">
                                          <File className="w-3 h-3" />
                                          {uploadedFile}
                                          <Button variant="ghost" size="icon" className="h-4 w-4 ml-1 hover:bg-transparent" onClick={() => setUploadedFile(null)}>
                                              <X className="w-3 h-3" />
                                          </Button>
                                        </Badge>
                                    )}
                                  </div>
                                  <Textarea 
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    className="flex-1 resize-none p-8 text-lg leading-relaxed bg-card shadow-sm border rounded-xl focus-visible:ring-1 focus-visible:ring-primary/20"
                                    placeholder="Paste text here..."
                                  />
                                  <div className="flex justify-end gap-3 pt-2">
                                    <Button variant="ghost" onClick={() => setContent("")}>Clear</Button>
                                    <Button onClick={handleAnalyze} className="btn-soft-primary min-w-[150px]">
                                        <Wand2 className="mr-2 h-4 w-4" /> Analyze Content
                                    </Button>
                                  </div>
                              </motion.div>
                            ) : (
                              <motion.div 
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  className={`flex flex-col items-center justify-center text-center gap-4 transition-all ${dragActive ? 'scale-105' : ''}`}
                              >
                                  <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-colors mb-4 ${dragActive ? 'bg-primary/20' : 'bg-white shadow-sm border'}`}>
                                    <Upload className={`w-10 h-10 ${dragActive ? 'text-primary' : 'text-muted-foreground'}`} />
                                  </div>
                                  <div className="space-y-2">
                                    <h3 className="text-2xl font-bold tracking-tight">Upload Content</h3>
                                    <p className="text-muted-foreground max-w-sm text-lg">
                                        Drag & drop PDF, DOCX, or PPTX
                                    </p>
                                  </div>
                                  <div className="flex flex-col gap-3 w-full max-w-xs mt-6">
                                    <div className="relative">
                                        <Button size="lg" className="w-full btn-soft-primary">Choose File</Button>
                                        <input 
                                          type="file" 
                                          className="absolute inset-0 opacity-0 cursor-pointer"
                                          onChange={(e) => e.target.files && e.target.files[0] && handleFiles(e.target.files[0])}
                                          accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
                                        />
                                    </div>
                                    <div className="relative flex items-center py-2">
                                        <div className="grow border-t border-muted-foreground/20"></div>
                                        <span className="shrink-0 px-2 text-xs text-muted-foreground uppercase font-medium">Or</span>
                                        <div className="grow border-t border-muted-foreground/20"></div>
                                    </div>
                                    <Button onClick={() => setContent(" ")} variant="outline" size="lg" className="bg-white">Paste Text</Button>
                                  </div>
                              </motion.div>
                            )}
                        </AnimatePresence>
                      </CardContent>
                  </Card>
               </div>
            </div>
        ) : (
            /* ================= RESULTS MODE (3-COLUMN) ================= */
            <div className="flex-1 flex overflow-hidden">
               
               {/* Left Sidebar: Navigation / TOC */}
               <div className="w-64 border-r bg-card flex-shrink-0 flex flex-col">
                  <div className="p-4 border-b">
                     <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Document Sections</h3>
                     <div className="space-y-1">
                        <Button variant="ghost" size="sm" className="w-full justify-start font-medium bg-primary/10 text-primary">
                           <FileText className="w-4 h-4 mr-2" /> Full Document
                        </Button>
                        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
                           <Target className="w-4 h-4 mr-2" /> Performance Claims
                        </Button>
                        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
                           <AlertTriangle className="w-4 h-4 mr-2" /> Safety Warnings
                        </Button>
                        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
                           <Flag className="w-4 h-4 mr-2" /> Marketing & Brand
                        </Button>
                     </div>
                  </div>
                  <div className="p-4 flex-1">
                     <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Summary</h3>
                     <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                           <span className="text-muted-foreground">Total Issues</span>
                           <Badge variant="secondary">{results?.length || 0}</Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                           <span className="text-muted-foreground">High Severity</span>
                           <Badge variant="secondary" className="bg-destructive/10 text-destructive">{results?.filter(r => r.severity === 'high').length || 0}</Badge>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Center: Main Editor */}
               <div className="flex-1 bg-muted/10 relative overflow-hidden flex flex-col items-center">
                  <div className="w-full h-full overflow-y-auto p-8">
                     <div className="max-w-3xl mx-auto min-h-[800px] bg-white rounded-xl shadow-sm border p-12 relative">
                        {isAnalyzing && (
                           <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center">
                              <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                              <p className="text-lg font-medium text-foreground">Analyzing Content...</p>
                              <p className="text-muted-foreground">Checking claims against CardioFlow X1 profile</p>
                           </div>
                        )}
                        <Textarea 
                           value={content}
                           onChange={(e) => setContent(e.target.value)}
                           className="w-full h-full min-h-[700px] resize-none border-0 focus-visible:ring-0 p-0 text-lg leading-loose text-foreground font-serif"
                           placeholder="Document content..."
                           style={{ fontFamily: 'Georgia, serif' }}
                        />
                     </div>
                  </div>
               </div>

               {/* Right Sidebar: Findings */}
               <div className="w-[400px] border-l bg-card flex-shrink-0 flex flex-col">
                  <div className="p-4 border-b bg-muted/5 flex items-center justify-between">
                     <h3 className="font-semibold text-sm">Findings</h3>
                     <Badge variant="outline" className="ml-2">{results?.length || 0} Issues</Badge>
                  </div>
                  
                  <ScrollArea className="flex-1 p-4 bg-muted/5">
                     <div className="space-y-4">
                        {results?.map((result) => (
                           <motion.div
                              key={result.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, height: 0 }}
                              layout
                           >
                              <Card 
                                 className={`border-l-4 cursor-pointer transition-all ${
                                    selectedIssueId === result.id ? 'ring-2 ring-primary ring-offset-2' : ''
                                 } ${
                                    result.severity === 'high' ? 'border-l-destructive' : 
                                    result.severity === 'medium' ? 'border-l-amber-500' : 
                                    'border-l-blue-500'
                                 }`}
                                 onClick={() => setSelectedIssueId(result.id)}
                              >
                                 <CardContent className="p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                       <Badge variant="outline" className={`${
                                          result.severity === 'high' ? 'text-destructive border-destructive/20 bg-destructive/5' : 
                                          'text-amber-600 border-amber-200 bg-amber-50'
                                       }`}>
                                          {result.issue}
                                       </Badge>
                                       <span className="text-[10px] text-muted-foreground uppercase font-medium">{result.type}</span>
                                    </div>
                                    
                                    <div className="bg-muted/30 p-2 rounded text-sm italic border-l-2 border-muted-foreground/20 text-muted-foreground">
                                       "{result.original}"
                                    </div>

                                    <p className="text-sm text-foreground leading-relaxed">
                                       {result.reason}
                                    </p>

                                    {selectedIssueId === result.id && (
                                       <motion.div 
                                          initial={{ opacity: 0, height: 0 }}
                                          animate={{ opacity: 1, height: 'auto' }}
                                          className="pt-2"
                                       >
                                          <div className="bg-green-50 border border-green-100 rounded-md p-3 mb-3">
                                             <div className="flex items-center gap-2 mb-1">
                                                <CheckCircle className="w-3 h-3 text-green-600" />
                                                <span className="text-xs font-semibold text-green-700 uppercase">Suggestion</span>
                                             </div>
                                             <p className="text-sm text-green-800 font-medium">"{result.suggestion}"</p>
                                          </div>
                                          <Button 
                                             size="sm" 
                                             className="w-full btn-soft-primary h-8"
                                             onClick={(e) => { e.stopPropagation(); applyFix(result.id); }}
                                          >
                                             <RefreshCw className="w-3 h-3 mr-2" />
                                             Apply Fix
                                          </Button>
                                       </motion.div>
                                    )}
                                 </CardContent>
                              </Card>
                           </motion.div>
                        ))}
                        {results?.length === 0 && !isAnalyzing && (
                           <div className="text-center py-10 text-muted-foreground">
                              <CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-500" />
                              <p>No issues found.</p>
                           </div>
                        )}
                     </div>
                  </ScrollArea>
               </div>

            </div>
        )}

      </div>
    </Layout>
  );
}
