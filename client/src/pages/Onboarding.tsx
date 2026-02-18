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

const formSchema = z.object({
  productName: z.string().min(2, { message: "Product name is required." }),
  deviceType: z.string().min(1, { message: "Device type is required." }),
  description: z.string().max(200, { message: "Description must be under 200 characters." }),
  indications: z.string().min(10, { message: "Indications are required." }),
  risks: z.string().min(10, { message: "Risks and limitations are required." }),
});

const STEPS = [
  { title: "Device Basics", desc: "Fundamental details of your device." },
  { title: "Indications for Use", desc: "Cleared indications and patient population." },
  { title: "Risks & Limitations", desc: "Warnings, precautions, and contraindications." },
  { title: "Core Claims", desc: "Pre-approved marketing claims library." },
];

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [claims, setClaims] = useState([{ id: 1, text: "" }]);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

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
    setLocation("/product/cardioflow");
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 30 : -30,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 30 : -30,
      opacity: 0
    })
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto py-4">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight">Create Product Profile</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Define the compliance context for your device.</p>
        </div>

        {/* Step Indicator */}
        <div className="mb-6">
          <div className="flex items-center gap-1 mb-3">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center gap-1 flex-1">
                <div className={`h-1.5 rounded-full flex-1 transition-colors ${
                  i + 1 <= step ? 'bg-primary' : 'bg-border'
                }`} />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{STEPS[step - 1].title}</span>
            <span>Step {step} of 4</span>
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
          >
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">
                  {STEPS[step - 1].title}
                </CardTitle>
                <CardDescription className="text-sm">
                  {STEPS[step - 1].desc}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {step === 1 && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="productName" className="text-sm">Product Name</Label>
                      <Input
                        id="productName"
                        {...form.register("productName")}
                        placeholder="e.g. CardioFlow X1"
                      />
                      {form.formState.errors.productName && (
                        <p className="text-destructive text-xs">{form.formState.errors.productName.message}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="deviceType" className="text-sm">Device Type</Label>
                      <Select onValueChange={(val) => form.setValue("deviceType", val)} defaultValue={form.getValues("deviceType")}>
                        <SelectTrigger>
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
                        <p className="text-destructive text-xs">{form.formState.errors.deviceType.message}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="description" className="text-sm">One-liner Description</Label>
                      <Textarea
                        id="description"
                        {...form.register("description")}
                        placeholder="Briefly describe the device's main function..."
                        className="resize-none min-h-[80px]"
                      />
                      <p className="text-[11px] text-muted-foreground text-right">
                        {form.watch("description").length}/200
                      </p>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <div className="bg-primary/5 p-3 rounded-lg border border-primary/10 flex gap-2.5 text-sm">
                      <ShieldCheck className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <p className="text-muted-foreground">
                        <span className="font-medium text-foreground">Tip:</span> Paste directly from your 510(k) summary or PMA approval letter.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="indications" className="text-sm">Indications for Use</Label>
                      <Textarea
                        id="indications"
                        {...form.register("indications")}
                        className="min-h-[180px] font-mono text-sm"
                        placeholder="The [Device Name] is indicated for..."
                      />
                      {form.formState.errors.indications && (
                        <p className="text-destructive text-xs">{form.formState.errors.indications.message}</p>
                      )}
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-4">
                    <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 flex gap-2.5 text-sm">
                      <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                      <p className="text-amber-800">
                        <span className="font-medium text-amber-900">Important:</span> Include all boxed warnings and major contraindications.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="risks" className="text-sm">Warnings & Limitations</Label>
                      <Textarea
                        id="risks"
                        {...form.register("risks")}
                        className="min-h-[180px] font-mono text-sm"
                        placeholder="Contraindicated for patients with..."
                      />
                      {form.formState.errors.risks && (
                        <p className="text-destructive text-xs">{form.formState.errors.risks.message}</p>
                      )}
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      {claims.map((claim, index) => (
                        <Input
                          key={claim.id}
                          value={claim.text}
                          onChange={(e) => updateClaim(claim.id, e.target.value)}
                          placeholder={`Approved claim #${index + 1}`}
                        />
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addClaim}
                      size="sm"
                      className="w-full border-dashed hover:border-primary hover:text-primary"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Claim
                    </Button>
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex justify-between border-t pt-4">
                <Button
                  variant="ghost"
                  onClick={prevStep}
                  disabled={step === 1}
                  size="sm"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Back
                </Button>

                {step < 4 ? (
                  <Button onClick={nextStep} className="btn-soft-primary" size="sm">
                    Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                ) : (
                  <Button onClick={form.handleSubmit(onSubmit)} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    Create Profile <Check className="w-3.5 h-3.5 ml-1" />
                  </Button>
                )}
              </CardFooter>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </Layout>
  );
}
