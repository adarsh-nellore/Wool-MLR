import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import {
  motion,
  useInView,
} from "framer-motion";
import {
  ArrowRight,
  FileSearch,
  AlertTriangle,
  PenLine,
  ClipboardList,
  Layers,
  BookOpen,
  Users,
  Stethoscope,
  Scale,
  Megaphone,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WoolLogo } from "@/components/Layout";
import { apiRequest } from "@/lib/queryClient";

const CALENDLY_URL = "https://calendly.com/adarsh-nellore/1-1";

/* YarnLogo imported from Layout */

const fadeUp = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

const sectionReveal = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

const stagger = {
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const capabilities = [
  {
    icon: FileSearch,
    title: "Document Analysis",
    description:
      "Upload PDF, Word, or images for instant compliance review against your device profile.",
  },
  {
    icon: AlertTriangle,
    title: "Risk Scoring",
    description:
      "Weighted severity scores with boundary drift detection across every claim.",
  },
  {
    icon: PenLine,
    title: "AI Rewrites",
    description:
      "Get compliant alternative suggestions for every piece of flagged content.",
  },
  {
    icon: ClipboardList,
    title: "Audit Trails",
    description:
      "Exportable compliance reports ready for your regulatory records.",
  },
  {
    icon: Layers,
    title: "Multi-Format Support",
    description:
      "Analyze brochures, ads, packaging, and digital assets in any format.",
  },
  {
    icon: BookOpen,
    title: "Regulatory Coverage",
    description:
      "FDA 21 CFR 820, MDR, IVDR guidance built in from day one.",
  },
];

const personas = [
  {
    icon: Megaphone,
    title: "Marketing Teams",
    description:
      "Launch campaigns faster with pre-submission compliance checks.",
  },
  {
    icon: Scale,
    title: "MLR / Compliance",
    description:
      "Reduce review cycles from weeks to hours with AI-assisted analysis.",
  },
  {
    icon: Users,
    title: "Regulatory Affairs",
    description:
      "Ensure promotional claims stay within cleared indications.",
  },
  {
    icon: Stethoscope,
    title: "Medical Affairs",
    description:
      "Validate clinical accuracy of marketing materials instantly.",
  },
];

/* ─── Static Background Orbs (warm tones, no scroll transforms) ─── */
function FloatingOrbs() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-amber-200/20 to-orange-100/10 blur-3xl lg:w-[800px] lg:h-[800px]" />
      <div className="absolute top-[30%] -right-60 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-rose-200/15 to-pink-100/8 blur-3xl lg:w-[700px] lg:h-[700px]" />
      <div className="absolute top-[60%] left-[15%] w-[400px] h-[400px] rounded-full bg-gradient-to-br from-stone-300/12 to-amber-200/8 blur-3xl hidden lg:block lg:w-[550px] lg:h-[550px]" />
      <div className="absolute top-[10%] left-[50%] w-[300px] h-[300px] rounded-full bg-gradient-to-br from-teal-200/10 to-emerald-100/6 blur-3xl hidden lg:block lg:w-[400px] lg:h-[400px]" />
    </div>
  );
}

/* ─── Animated Counter Hook ─── */
function useCounter(target: number, duration = 1500) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, target, duration]);

  return { count, ref };
}

/* ─── Hero Mockup (bigger, refined) ─── */
function HeroMockup() {
  const { count: riskScore, ref: scoreRef } = useCounter(42, 1800);

  const findings = [
    { color: "red", delay: 1.5 },
    { color: "amber", delay: 2.2 },
    { color: "red", delay: 2.9 },
    { color: "amber", delay: 3.5 },
  ];

  return (
    <div className="relative" ref={scoreRef}>
      {/* Floating annotation badges */}
      <div className="hidden lg:block absolute -top-7 -right-10 animate-float z-20">
        <div className="bg-white/80 backdrop-blur-md border border-stone-200/60 shadow-lg shadow-stone-900/5 rounded-full px-5 py-2.5 text-xs font-medium text-stone-700">
          FDA 21 CFR 820
        </div>
      </div>
      <div className="hidden lg:block absolute bottom-16 -left-12 animate-float-delayed z-20">
        <div className="bg-white/80 backdrop-blur-md border border-stone-200/60 shadow-lg shadow-stone-900/5 rounded-full px-5 py-2.5 text-xs font-medium text-amber-700">
          3 issues found
        </div>
      </div>
      <div className="hidden lg:block absolute top-1/2 -right-14 animate-float z-20" style={{ animationDelay: "0.5s" }}>
        <div className="bg-white/80 backdrop-blur-md border border-stone-200/60 shadow-lg shadow-stone-900/5 rounded-full px-5 py-2.5 text-xs font-medium text-emerald-700">
          Auto-scan
        </div>
      </div>

      {/* Outer glow */}
      <div className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-amber-200/30 via-rose-200/20 to-stone-200/30 blur-2xl" />

      <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-stone-900/10 border border-stone-200/60 bg-white/70 backdrop-blur-xl">
        {/* Title bar */}
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-stone-200/50 bg-stone-50/80">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400/60" />
            <div className="w-3 h-3 rounded-full bg-amber-400/60" />
            <div className="w-3 h-3 rounded-full bg-emerald-400/60" />
          </div>
          <div className="flex items-center gap-2 ml-3 text-xs text-stone-500">
            <span className="font-medium text-stone-700">Analysis</span>
            <span className="text-stone-300">/</span>
            <span className="bg-stone-800/5 rounded-md px-2 py-0.5 text-[11px] text-stone-700 font-medium">
              CardioFlow X1
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium border border-emerald-200/50">
              Live
            </span>
            <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium border border-amber-200/50">
              3 Findings
            </span>
          </div>
        </div>

        {/* Three-panel layout */}
        <div className="flex bg-white/50" style={{ height: 480 }}>
          {/* Left sidebar */}
          <div className="w-[120px] border-r border-stone-200/40 bg-stone-50/50 p-4 space-y-1.5 hidden sm:block">
            <div className="text-[8px] font-semibold text-stone-400 uppercase tracking-wider px-1 mb-2">
              Sections
            </div>
            {["Overview", "Claims", "Safety", "Use Env.", "History"].map(
              (label, i) => (
                <div
                  key={label}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-[10px] ${
                    i === 0
                      ? "bg-stone-800/5 text-stone-800 font-medium"
                      : "text-stone-400"
                  }`}
                >
                  <span className="truncate">{label}</span>
                </div>
              )
            )}
          </div>

          {/* Center - Document with scan line */}
          <div className="flex-1 p-6 overflow-hidden relative">
            <div className="bg-white/80 rounded-xl border border-stone-200/40 p-6 h-full space-y-3 relative overflow-hidden">
              {/* Scan line animation */}
              <motion.div
                className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/60 to-transparent z-10 pointer-events-none"
                style={{ boxShadow: "0 0 16px 3px rgba(217, 119, 6, 0.2)" }}
                animate={{
                  top: ["0%", "100%", "100%"],
                }}
                transition={{
                  duration: 5,
                  times: [0, 0.6, 1],
                  repeat: Infinity,
                  ease: "linear",
                }}
              />

              {[
                { w: 65, flag: false },
                { w: 85, flag: false },
                { w: 55, flag: false },
                { w: 0, flag: false },
                { w: 40, flag: false, heading: true },
                { w: 78, flag: "high" },
                { w: 60, flag: false },
                { w: 90, flag: "medium" },
                { w: 72, flag: false },
                { w: 0, flag: false },
                { w: 35, flag: false, heading: true },
                { w: 82, flag: false },
                { w: 68, flag: "high" },
                { w: 50, flag: false },
                { w: 0, flag: false },
                { w: 45, flag: false, heading: true },
                { w: 75, flag: false },
                { w: 58, flag: "medium" },
                { w: 88, flag: false },
                { w: 0, flag: false },
                { w: 38, flag: false, heading: true },
                { w: 70, flag: false },
                { w: 62, flag: false },
                { w: 80, flag: false },
              ].map((line, i) =>
                line.w === 0 ? (
                  <div key={i} className="h-2" />
                ) : (
                  <div key={i} className="flex items-center gap-1.5">
                    {line.flag && (
                      <div
                        className={`w-[3px] h-3 rounded-full shrink-0 ${
                          line.flag === "high"
                            ? "bg-red-500"
                            : "bg-amber-500"
                        }`}
                      />
                    )}
                    <div
                      className={`rounded-full ${
                        line.heading
                          ? "h-3 bg-stone-200/60"
                          : line.flag === "high"
                            ? "h-2 bg-red-500/10"
                            : line.flag === "medium"
                              ? "h-2 bg-amber-500/10"
                              : "h-2 bg-stone-200/40"
                      }`}
                      style={{ width: `${line.w}%` }}
                    />
                  </div>
                )
              )}
            </div>
          </div>

          {/* Right sidebar - Findings */}
          <div className="w-[160px] border-l border-stone-200/40 bg-stone-50/50 p-4 space-y-3 hidden sm:block">
            <div className="text-center py-3">
              <div className="text-3xl font-bold text-amber-600 tabular-nums leading-none">
                {riskScore}
              </div>
              <div className="text-[10px] text-stone-400 mt-1.5 font-medium">
                Risk Score
              </div>
              <div className="flex h-2 rounded-full overflow-hidden bg-stone-100 gap-px mt-2 mx-1">
                <div className="flex-1 bg-emerald-400 rounded-l-full" />
                <div className="flex-1 bg-amber-400" />
                <div className="flex-1 bg-stone-200" />
                <div className="flex-1 bg-stone-200" />
                <div className="flex-1 bg-stone-200 rounded-r-full" />
              </div>
            </div>
            <div className="space-y-2">
              {findings.map((finding, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    delay: finding.delay,
                    duration: 0.4,
                    ease: "easeOut",
                  }}
                  className={`border-l-2 ${
                    finding.color === "red"
                      ? "border-l-red-400 bg-red-50/80"
                      : "border-l-amber-400 bg-amber-50/80"
                  } rounded-r-md px-2 py-2`}
                >
                  <div
                    className={`h-2 rounded-full mb-1.5 ${
                      finding.color === "red"
                        ? "w-16 bg-red-500/15"
                        : "w-14 bg-amber-500/15"
                    }`}
                  />
                  <div
                    className={`h-1.5 rounded-full bg-stone-200/60 ${
                      finding.color === "red" ? "w-14" : "w-12"
                    }`}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Landing Page ─── */
export default function Landing() {
  const [, setLocation] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className="min-h-screen text-stone-900"
      style={{
        background:
          "linear-gradient(160deg, #faf9f7 0%, #f5f0eb 25%, #f7f5f2 50%, #f0ece6 75%, #f5f3f0 100%)",
      }}
    >
      <FloatingOrbs />

      {/* ── Sticky Header ── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-white/70 backdrop-blur-2xl border-b border-stone-200/40 shadow-sm shadow-stone-900/3"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2.5">
              <WoolLogo className="w-9 h-9 text-stone-800" />
              <span className="font-serif text-lg font-semibold tracking-tight text-stone-900">
                Wool
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer">
              <Button
                size="sm"
                variant="ghost"
                className="h-9 text-xs text-stone-500 hover:text-stone-800 hover:bg-stone-100/60"
              >
                Book a Call
              </Button>
            </a>
            <Button
              size="sm"
              className="h-9 text-xs bg-stone-900 text-white hover:bg-stone-800 shadow-sm"
              onClick={() => setLocation("/devices")}
            >
              Try It Now
              <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="min-h-screen flex items-center pt-20 pb-20 px-8 relative z-10">
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left column - Text */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={stagger}
              className="text-center lg:text-left"
            >
              <motion.div variants={fadeUp} className="mb-8">
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-stone-100/80 border border-stone-200/60 text-xs font-medium text-stone-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  AI-Powered MLR Review
                </span>
              </motion.div>
              <motion.h1
                variants={fadeUp}
                className="text-5xl lg:text-7xl font-semibold tracking-tight leading-[1.05]"
              >
                Compliance at the{" "}
                <span className="bg-gradient-to-r from-stone-800 via-amber-700 to-stone-700 bg-clip-text text-transparent">
                  Speed of Marketing
                </span>
              </motion.h1>
              <motion.p
                variants={fadeUp}
                className="mt-8 text-lg lg:text-xl text-stone-500 leading-relaxed max-w-xl mx-auto lg:mx-0"
              >
                AI-powered MLR review for medical device promotional content.
                From upload to compliance report in seconds, not weeks.
              </motion.p>
              <motion.div
                variants={fadeUp}
                className="mt-12 flex flex-wrap items-center justify-center lg:justify-start gap-4"
              >
                <Button
                  size="lg"
                  className="bg-stone-900 text-white hover:bg-stone-800 text-sm px-8 py-6 shadow-lg shadow-stone-900/15 transition-all duration-300 hover:shadow-xl hover:shadow-stone-900/20 hover:-translate-y-0.5"
                  onClick={() => setLocation("/devices")}
                >
                  Try It Now
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
                <a
                  href={CALENDLY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    size="lg"
                    variant="outline"
                    className="text-sm px-8 py-6 border-stone-300/60 text-stone-600 hover:bg-stone-50 hover:border-stone-400/60"
                  >
                    Book a Call
                  </Button>
                </a>
              </motion.div>
            </motion.div>

            {/* Right column - Animated Mockup */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
              className="lg:scale-110"
            >
              <HeroMockup />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Metrics Strip ── */}
      <section className="py-20 px-8 relative z-10 border-y border-stone-200/40 bg-white/30 backdrop-blur-md">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={sectionReveal}
        >
          <motion.div
            variants={stagger}
            className="max-w-5xl mx-auto"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-stone-200/50">
              {[
                {
                  value: "10x",
                  suffix: "Faster",
                  label: "Than manual MLR review cycles",
                },
                {
                  value: "< 30",
                  suffix: "Seconds",
                  label: "From upload to compliance report",
                },
                {
                  value: "85%",
                  suffix: "Fewer",
                  label: "Review iterations before approval",
                },
              ].map((stat) => (
                <motion.div
                  key={stat.value}
                  variants={fadeUp}
                  className="text-center py-8 sm:py-0 sm:px-10"
                >
                  <div className="text-5xl lg:text-6xl font-bold tracking-tight text-stone-900">
                    {stat.value}
                  </div>
                  <div className="text-sm font-medium text-amber-700 mt-2">
                    {stat.suffix}
                  </div>
                  <div className="text-sm text-stone-400 mt-2">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Capabilities Section ── */}
      <section className="py-24 lg:py-32 px-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={sectionReveal}
          >
            <motion.div variants={fadeUp} className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl lg:text-5xl font-semibold tracking-tight">
                Everything you need for compliant content
              </h2>
              <p className="mt-5 text-lg text-stone-400">
                A complete toolkit to review, flag, and fix promotional materials before they go live.
              </p>
            </motion.div>
            <motion.div
              variants={stagger}
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
            >
              {capabilities.map((cap) => (
                <motion.div
                  key={cap.title}
                  variants={fadeUp}
                  className="group rounded-2xl p-8 bg-white/50 backdrop-blur-sm border border-stone-200/40 hover:-translate-y-1 hover:shadow-xl hover:shadow-stone-900/5 hover:bg-white/70 transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-stone-100 to-stone-50 border border-stone-200/50 flex items-center justify-center mb-5 group-hover:from-amber-50 group-hover:to-orange-50 group-hover:border-amber-200/50 transition-all duration-300">
                    <cap.icon className="w-5.5 h-5.5 text-stone-600 group-hover:text-amber-700 transition-colors duration-300" />
                  </div>
                  <h3 className="text-lg font-semibold text-stone-800">{cap.title}</h3>
                  <p className="text-sm text-stone-400 mt-3 leading-relaxed">
                    {cap.description}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Personas Section ── */}
      <section className="py-24 lg:py-32 px-8 relative z-10 border-y border-stone-200/40 bg-white/30 backdrop-blur-md">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={sectionReveal}
          >
            <motion.div variants={fadeUp} className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl lg:text-5xl font-semibold tracking-tight">
                Built for every team in the review process
              </h2>
              <p className="mt-5 text-lg text-stone-400">
                Whether you write the copy or approve it, Wool keeps everyone aligned.
              </p>
            </motion.div>
            <motion.div
              variants={stagger}
              className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8"
            >
              {personas.map((persona) => (
                <motion.div
                  key={persona.title}
                  variants={fadeUp}
                  className="group rounded-2xl p-8 bg-white/50 backdrop-blur-sm border border-stone-200/40 text-center hover:-translate-y-1 hover:shadow-xl hover:shadow-stone-900/5 hover:bg-white/70 transition-all duration-300"
                >
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-stone-100 to-stone-50 border border-stone-200/50 flex items-center justify-center mx-auto mb-5 group-hover:from-amber-50 group-hover:to-orange-50 group-hover:border-amber-200/50 transition-all duration-300">
                    <persona.icon className="w-6 h-6 text-stone-600 group-hover:text-amber-700 transition-colors duration-300" />
                  </div>
                  <h3 className="text-base font-semibold text-stone-800">{persona.title}</h3>
                  <p className="text-sm text-stone-400 mt-3 leading-relaxed">
                    {persona.description}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section
        className="py-24 lg:py-32 px-8 text-white relative z-10 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #1c1917 0%, #292524 40%, #1c1917 70%, #0c0a09 100%)",
        }}
      >
        {/* Decorative warm gradient orbs */}
        <div className="absolute top-[-80px] left-[-60px] w-72 h-72 rounded-full bg-amber-500/8 blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-60px] right-[-50px] w-80 h-80 rounded-full bg-rose-500/6 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full bg-amber-400/4 blur-2xl pointer-events-none" />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={sectionReveal}
          className="max-w-3xl mx-auto text-center relative"
        >
          <motion.h2
            variants={fadeUp}
            className="text-4xl lg:text-5xl font-semibold tracking-tight"
          >
            Ready to accelerate your MLR review?
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mt-6 text-stone-400 text-lg lg:text-xl"
          >
            Join teams that have cut their compliance review time by 10x.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-12">
            {submitted ? (
              <div className="flex items-center justify-center gap-2 text-emerald-400 text-lg font-medium">
                <CheckCircle className="w-5 h-5" />
                Thanks! Redirecting you now...
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setFormError("");
                  setSubmitting(true);
                  try {
                    await apiRequest("POST", "/api/leads", { name: leadName, email: leadEmail });
                    setSubmitted(true);
                    setTimeout(() => setLocation("/devices"), 1500);
                  } catch {
                    setFormError("Something went wrong. Please try again.");
                  } finally {
                    setSubmitting(false);
                  }
                }}
                className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-lg mx-auto"
              >
                <Input
                  type="text"
                  placeholder="Your name"
                  required
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  className="h-12 bg-white/10 border-stone-600 text-white placeholder:text-stone-500 focus:border-white/40"
                />
                <Input
                  type="email"
                  placeholder="Your email"
                  required
                  value={leadEmail}
                  onChange={(e) => setLeadEmail(e.target.value)}
                  className="h-12 bg-white/10 border-stone-600 text-white placeholder:text-stone-500 focus:border-white/40"
                />
                <Button
                  type="submit"
                  size="lg"
                  disabled={submitting}
                  className="h-12 bg-white text-stone-900 hover:bg-stone-100 text-sm px-8 font-semibold shadow-lg shadow-white/10 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 shrink-0"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Get Access <ArrowRight className="ml-2 w-4 h-4" /></>}
                </Button>
              </form>
            )}
            {formError && (
              <p className="text-red-400 text-sm mt-3">{formError}</p>
            )}
            <div className="mt-6 flex justify-center">
              <a
                href={CALENDLY_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  size="lg"
                  variant="outline"
                  className="border-stone-600 text-stone-300 hover:bg-stone-800 hover:text-white text-sm px-8 py-6"
                >
                  Book a Call
                </Button>
              </a>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-stone-200/40 py-10 px-8 bg-white/50 backdrop-blur-xl relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <WoolLogo className="w-7 h-7 text-stone-500" />
            <span className="text-sm font-serif font-medium text-stone-400">
              Wool
            </span>
          </div>
          <nav className="flex items-center gap-6">
            <a
              href={CALENDLY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-stone-400 hover:text-stone-700 transition-colors"
            >
              Contact
            </a>
          </nav>
          <p className="text-stone-300 text-xs">
            &copy; 2026 Wool
          </p>
        </div>
      </footer>
    </div>
  );
}
