import { Link, useLocation } from "wouter";
import { ShieldCheck } from "lucide-react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background font-sans text-foreground flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-card/90 backdrop-blur-xl">
        <div className="container mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-sm">
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-sm tracking-tight">MedTech MLR Copilot</span>
            </Link>

            <nav className="flex items-center gap-1">
              <Link href="/" className={`text-sm px-3 py-1.5 rounded-md transition-colors ${location === "/" ? "text-primary bg-primary/8 font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}>
                Dashboard
              </Link>
              <Link href="/onboarding" className={`text-sm px-3 py-1.5 rounded-md transition-colors ${location === "/onboarding" ? "text-primary bg-primary/8 font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}>
                Profiles
              </Link>
              <Link href="/analyze" className={`text-sm px-3 py-1.5 rounded-md transition-colors ${location === "/analyze" ? "text-primary bg-primary/8 font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}>
                Analyze
              </Link>
            </nav>
          </div>

          <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[10px] font-medium text-secondary-foreground">
            JD
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 py-6">
        {children}
      </main>
    </div>
  );
}
