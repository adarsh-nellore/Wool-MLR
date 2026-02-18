import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Loader2, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  ArrowRight, 
  RefreshCw,
  Copy,
  Wand2
} from "lucide-react";
import Layout from "../components/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

type AnalysisResult = {
  id: string;
  original: string;
  type: "Performance" | "Safety" | "Marketing" | "Procedural";
  issue: string;
  severity: "high" | "medium" | "low" | "none";
  reason: string;
  suggestion: string;
  start: number; // Mock start index for highlighting
  end: number;   // Mock end index
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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResult[] | null>(null);
  const [content, setContent] = useState("Reduces procedure time by 30%. The only catheter you'll ever need. Zero risk of infection.");
  const [activeTab, setActiveTab] = useState("edit");
  const { toast } = useToast();

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    // Simulate API delay
    setTimeout(() => {
      setIsAnalyzing(false);
      setResults(MOCK_RESULTS);
      setActiveTab("results");
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
      toast({
        title: "Fix Applied",
        description: "Content updated with suggested wording.",
      });
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto h-[calc(100vh-8rem)] flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Content Analysis</h1>
            <p className="text-muted-foreground">Check your promotional content against the Product Profile.</p>
          </div>
          <div className="flex items-center gap-4">
             <Select defaultValue="cardioflow">
              <SelectTrigger className="w-[200px] bg-card">
                <SelectValue placeholder="Select Profile" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cardioflow">CardioFlow X1</SelectItem>
                <SelectItem value="neurostim">NeuroStim Pro</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={handleAnalyze} 
              disabled={isAnalyzing || !content}
              className="btn-soft-primary min-w-[120px]"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Analyze
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
          {/* Input / Editor Column */}
          <Card className="flex flex-col border-muted-foreground/20 shadow-sm h-full overflow-hidden bg-card/50 backdrop-blur-sm">
            <CardHeader className="py-4 px-6 border-b bg-muted/20 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Source Content</CardTitle>
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setContent("")}>Clear</Button>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste your email copy, brochure text, or slide content here..."
                className="w-full h-full resize-none border-0 focus-visible:ring-0 p-6 text-base leading-relaxed bg-transparent"
              />
            </CardContent>
          </Card>

          {/* Results Column */}
          <Card className="flex flex-col border-muted-foreground/20 shadow-sm h-full overflow-hidden bg-muted/10">
            <CardHeader className="py-4 px-6 border-b bg-muted/20 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Findings {results ? `(${results.length})` : ""}
              </CardTitle>
              {results && (
                 <Badge variant="outline" className="bg-background">
                    {results.length} Issues Found
                 </Badge>
              )}
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden relative">
              <ScrollArea className="h-full w-full p-6">
                {!results && !isAnalyzing && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground opacity-60">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Wand2 className="w-8 h-8" />
                    </div>
                    <p>Enter text and click Analyze to see compliance checks.</p>
                  </div>
                )}
                
                {isAnalyzing && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8">
                     <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                     <p className="text-muted-foreground">Checking against 510(k) indications...</p>
                     <p className="text-xs text-muted-foreground/60 mt-1">Analyzing claims and risk balance</p>
                  </div>
                )}

                {results && results.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 text-green-600">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                      <CheckCircle className="w-8 h-8" />
                    </div>
                    <p className="font-medium">No issues found!</p>
                    <p className="text-sm text-green-600/80">Content appears to align with the product profile.</p>
                  </div>
                )}

                <div className="space-y-4 pb-12">
                  <AnimatePresence>
                    {results?.map((result) => (
                      <motion.div
                        key={result.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Card className={`border-l-4 ${
                          result.severity === 'high' ? 'border-l-destructive shadow-red-100' : 
                          result.severity === 'medium' ? 'border-l-amber-500 shadow-amber-50' : 
                          'border-l-blue-500 shadow-blue-50'
                        } overflow-hidden`}>
                          <div className="p-4 space-y-3">
                            {/* Header */}
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className={`${
                                    result.severity === 'high' ? 'text-destructive border-destructive/20 bg-destructive/5' : 
                                    'text-amber-600 border-amber-200 bg-amber-50'
                                  }`}>
                                    {result.issue}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground uppercase tracking-wide">{result.type} Claim</span>
                                </div>
                              </div>
                            </div>

                            {/* Content */}
                            <div className="space-y-3">
                              <div className="bg-muted/50 p-3 rounded-md text-sm border border-muted relative group">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-muted-foreground/20 rounded-l-md"></div>
                                <span className="font-medium text-foreground/80">"{result.original}"</span>
                              </div>
                              
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                <AlertTriangle className="w-3 h-3 inline mr-1 -mt-0.5" />
                                {result.reason}
                              </p>

                              {/* Fix Suggestion */}
                              <div className="bg-green-50/50 border border-green-100 rounded-md p-3 mt-2">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-semibold text-green-700 uppercase">Suggested Rewrite</span>
                                </div>
                                <p className="text-sm text-green-800 font-medium">"{result.suggestion}"</p>
                              </div>
                            </div>

                            {/* Action */}
                            <div className="pt-2 flex justify-end">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 text-xs hover:bg-green-50 hover:text-green-700 hover:border-green-200"
                                onClick={() => applyFix(result.id)}
                              >
                                <RefreshCw className="w-3 h-3 mr-1.5" />
                                Apply Fix
                              </Button>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
