import { Link, useLocation } from "wouter";
import { ShieldCheck, FileText, Activity, Home } from "lucide-react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background font-sans text-foreground flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">MedTech MLR Copilot</span>
          </div>

          <nav className="flex items-center gap-6">
            <Link href="/" className={`text-sm font-medium transition-colors hover:text-primary ${location === "/" ? "text-primary" : "text-muted-foreground"}`}>
              Dashboard
            </Link>
            <Link href="/onboarding" className={`text-sm font-medium transition-colors hover:text-primary ${location === "/onboarding" ? "text-primary" : "text-muted-foreground"}`}>
              Product Profiles
            </Link>
            <Link href="/analyze" className={`text-sm font-medium transition-colors hover:text-primary ${location === "/analyze" ? "text-primary" : "text-muted-foreground"}`}>
              Analyze Content
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center text-xs font-medium text-secondary-foreground">
              JD
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
