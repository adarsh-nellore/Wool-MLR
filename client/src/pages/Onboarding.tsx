import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  AlertTriangle, 
  ShieldCheck, 
  Plus, 
  MessageSquare, 
  FileEdit,
  Send,
  Bot
} from "lucide-react";
import Layout from "../components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const formSchema = z.object({
  productName: z.string().min(2, { message: "Product name is required." }),
  deviceType: z.string().min(1, { message: "Device type is required." }),
  description: z.string().max(200, { message: "Description must be under 200 characters." }),
  indications: z.string().min(10, { message: "Indications are required." }),
  risks: z.string().min(10, { message: "Risks and limitations are required." }),
});

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export default function Onboarding() {
  const [mode, setMode] = useState<"form" | "chat">("form");
  const [step, setStep] = useState(1);
  const [claims, setClaims] = useState([{ id: 1, text: "" }]);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Chat State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hi! I can help you set up your product profile. What's the name of the medical device you want to add?"
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productName: "",
      deviceType: "",
      description: "",
      indications: "",
      risks: "",
    },
  });

  // Auto-scroll chat
  useEffect(() => {
    if (mode === "chat") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, mode]);

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const newMsg: Message = { id: Date.now().toString(), role: "user", content: inputMessage };
    setMessages([...messages, newMsg]);
    setInputMessage("");

    // Mock AI Response Logic (Simple State Machine)
    setTimeout(() => {
      let responseText = "";
      const currentValues = form.getValues();

      if (!currentValues.productName) {
        form.setValue("productName", inputMessage);
        responseText = `Got it, **${inputMessage}**. What type of device is it? (e.g., Implant, Diagnostic, SaMD)`;
      } else if (!currentValues.deviceType) {
        form.setValue("deviceType", inputMessage.toLowerCase());
        responseText = "Understood. Can you give me a short one-sentence description of what it does?";
      } else if (!currentValues.description) {
        form.setValue("description", inputMessage);
        responseText = "Thanks. Now, please paste the official **Indications for Use** (IFU) from your 510(k) or PMA.";
      } else if (!currentValues.indications) {
        form.setValue("indications", inputMessage);
        responseText = "Crucial step: What are the key **Warnings, Precautions, and Contraindications**?";
      } else if (!currentValues.risks) {
        form.setValue("risks", inputMessage);
        responseText = "Great. Finally, do you have any core approved claims? List one here, or say 'done' to finish.";
      } else {
        if (inputMessage.toLowerCase().includes("done")) {
           responseText = "Profile complete! I've filled out the form for you. You can review it now.";
           setMode("form");
        } else {
           setClaims(prev => [...prev, { id: prev.length + 1, text: inputMessage }]);
           responseText = "Claim added. Add another, or say 'done'.";
        }
      }

      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: responseText }]);
    }, 1000);
  };


  const nextStep = async () => {
    const fields = step === 1 
      ? ["productName", "deviceType", "description"] 
      : step === 2 
      ? ["indications"] 
      : step === 3 
      ? ["risks"] 
      : [];
    
    const isValid = await form.trigger(fields as any);
    if (isValid) setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  const addClaim = () => setClaims([...claims, { id: claims.length + 1, text: "" }]);

  const updateClaim = (id: number, text: string) => {
    setClaims(claims.map(c => c.id === id ? { ...c, text } : c));
  };

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    console.log({ ...data, claims });
    toast({
      title: "Profile Created",
      description: "Your product profile has been successfully saved.",
    });
    // Navigate to analyze
    setLocation("/product/cardioflow"); // Redirect to the new product page
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 50 : -50,
      opacity: 0
    })
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto py-10">
        
        {/* Header with Toggle */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="space-y-1">
             <h1 className="text-2xl font-bold tracking-tight">Create Product Profile</h1>
             <p className="text-muted-foreground">Define the compliance context for your device.</p>
          </div>
          
          <div className="bg-muted p-1 rounded-lg flex items-center">
            <button
              onClick={() => setMode("form")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                mode === "form" 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileEdit className="w-4 h-4" /> Form
            </button>
            <button
              onClick={() => setMode("chat")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                mode === "chat" 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MessageSquare className="w-4 h-4" /> Chat Intake
            </button>
          </div>
        </div>

        {mode === "form" ? (
          /* ================= FORM MODE ================= */
          <>
            <div className="mb-8 space-y-2">
              <div className="flex items-center justify-between text-sm font-medium text-muted-foreground mb-2">
                <span>Step {step} of 4</span>
                <span>{Math.round((step / 4) * 100)}%</span>
              </div>
              <Progress value={(step / 4) * 100} className="h-2" />
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <Card className="card-soft border-t-4 border-t-primary">
                  <CardHeader>
                    <CardTitle className="text-2xl">
                      {step === 1 && "Device Basics"}
                      {step === 2 && "Indications for Use"}
                      {step === 3 && "Risks & Limitations"}
                      {step === 4 && "Core Approved Claims"}
                    </CardTitle>
                    <CardDescription>
                      {step === 1 && "Let's start with the fundamental details of your device."}
                      {step === 2 && "Define the cleared indications and patient population."}
                      {step === 3 && "List key warnings, precautions, and contraindications."}
                      {step === 4 && "Add your pre-approved marketing claims library."}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    {step === 1 && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="productName">Product Name</Label>
                          <Input 
                            id="productName" 
                            {...form.register("productName")} 
                            placeholder="e.g. CardioFlow X1" 
                            className="bg-card"
                          />
                          {form.formState.errors.productName && (
                            <p className="text-destructive text-sm">{form.formState.errors.productName.message}</p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="deviceType">Device Type</Label>
                          <Select onValueChange={(val) => form.setValue("deviceType", val)} defaultValue={form.getValues("deviceType")}>
                            <SelectTrigger className="bg-card">
                              <SelectValue placeholder="Select device type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="implant">Implant</SelectItem>
                              <SelectItem value="diagnostic">Diagnostic</SelectItem>
                              <SelectItem value="monitoring">Monitoring</SelectItem>
                              <SelectItem value="samd">SaMD (Software as a Medical Device)</SelectItem>
                              <SelectItem value="instrument">Instrument</SelectItem>
                            </SelectContent>
                          </Select>
                          {form.formState.errors.deviceType && (
                            <p className="text-destructive text-sm">{form.formState.errors.deviceType.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="description">One-liner Description</Label>
                          <Textarea 
                            id="description" 
                            {...form.register("description")} 
                            placeholder="Briefly describe the device's main function..." 
                            className="bg-card resize-none"
                          />
                          <p className="text-xs text-muted-foreground text-right">
                            {form.watch("description").length}/200
                          </p>
                        </div>
                      </div>
                    )}

                    {step === 2 && (
                      <div className="space-y-4">
                        <div className="bg-primary/5 p-4 rounded-lg border border-primary/10 flex gap-3">
                            <ShieldCheck className="w-5 h-5 text-primary mt-0.5" />
                            <div className="text-sm text-primary-foreground/80">
                              <p className="font-semibold text-primary">Tip:</p>
                              You can paste directly from your 510(k) summary or PMA approval letter.
                            </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="indications">Indications for Use</Label>
                          <Textarea 
                            id="indications" 
                            {...form.register("indications")} 
                            className="min-h-[200px] bg-card font-mono text-sm"
                            placeholder="The [Device Name] is indicated for..."
                          />
                          {form.formState.errors.indications && (
                            <p className="text-destructive text-sm">{form.formState.errors.indications.message}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {step === 3 && (
                      <div className="space-y-4">
                        <div className="bg-amber-50 p-4 rounded-lg border border-amber-100 flex gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                            <div className="text-sm text-amber-800">
                              <p className="font-semibold text-amber-900">Crucial for Compliance:</p>
                              Include all boxed warnings and major contraindications to ensure accurate analysis.
                            </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="risks">Warnings & Limitations</Label>
                          <Textarea 
                            id="risks" 
                            {...form.register("risks")} 
                            className="min-h-[200px] bg-card font-mono text-sm"
                            placeholder="Contraindicated for patients with..."
                          />
                          {form.formState.errors.risks && (
                            <p className="text-destructive text-sm">{form.formState.errors.risks.message}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {step === 4 && (
                      <div className="space-y-4">
                        <div className="space-y-3">
                          {claims.map((claim, index) => (
                            <div key={claim.id} className="flex gap-2">
                              <div className="flex-1">
                                <Label className="sr-only">Claim {index + 1}</Label>
                                <Input 
                                  value={claim.text} 
                                  onChange={(e) => updateClaim(claim.id, e.target.value)}
                                  placeholder={`Approved Claim #${index + 1}`}
                                  className="bg-card"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={addClaim} 
                          className="w-full border-dashed border-2 hover:border-primary hover:text-primary"
                        >
                          <Plus className="w-4 h-4 mr-2" /> Add Another Claim
                        </Button>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-between border-t bg-muted/20 p-6">
                    <Button 
                      variant="ghost" 
                      onClick={prevStep} 
                      disabled={step === 1}
                      className="hover:bg-background"
                    >
                      <ChevronLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    
                    {step < 4 ? (
                      <Button onClick={nextStep} className="btn-soft-primary">
                        Next Step <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    ) : (
                      <Button onClick={form.handleSubmit(onSubmit)} className="btn-soft-primary bg-emerald-600 hover:bg-emerald-700">
                        Create Profile <Check className="w-4 h-4 ml-2" />
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              </motion.div>
            </AnimatePresence>
          </>
        ) : (
          /* ================= CHAT MODE ================= */
          <Card className="h-[600px] flex flex-col overflow-hidden border-primary/20 shadow-lg">
             <CardHeader className="bg-muted/30 border-b pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                   <Bot className="w-5 h-5 text-primary" />
                   AI Intake Assistant
                </CardTitle>
                <CardDescription>
                   Answer a few questions and I'll fill out the profile for you.
                </CardDescription>
             </CardHeader>
             <CardContent className="flex-1 p-0 overflow-hidden bg-background/50">
                <ScrollArea className="h-full p-4">
                   <div className="space-y-4">
                      {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                           <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                              msg.role === "user" 
                                ? "bg-primary text-primary-foreground rounded-tr-none"
                                : "bg-muted text-foreground rounded-tl-none"
                           }`}>
                              {msg.content}
                           </div>
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                   </div>
                </ScrollArea>
             </CardContent>
             <div className="p-4 bg-background border-t">
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                  className="flex gap-2"
                >
                   <Input 
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder="Type your answer..."
                      className="flex-1"
                   />
                   <Button type="submit" size="icon" className="shrink-0 btn-soft-primary">
                      <Send className="w-4 h-4" />
                   </Button>
                </form>
             </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}
