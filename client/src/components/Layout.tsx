import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function WoolLogo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Curly yarn strand - cartoon/Notion style */}
      <path
        d="M8 32 C8 28, 14 28, 14 24 C14 20, 8 20, 8 16 C8 12, 14 12, 14 8 C14 5, 11 4, 11 4"
        stroke="currentColor"
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 32 C14 28, 20 27, 20 23 C20 19, 14 19, 14 15 C14 11, 20 10, 20 7"
        stroke="currentColor"
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 34 C20 30, 26 28, 26 24 C26 20, 20 19, 20 15 C20 12, 25 10, 26 8"
        stroke="currentColor"
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M26 33 C26 30, 32 28, 32 24 C32 21, 27 20, 27 17"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.5"
      />
      {/* Loose end curl at bottom */}
      <path
        d="M7 32 Q5 35, 8 36 Q11 37, 10 34"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function AppHeader() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const initials = user
    ? `${(user.firstName || "")[0] || ""}${(user.lastName || "")[0] || ""}`.toUpperCase() || "U"
    : "U";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-card/90 backdrop-blur-xl">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <WoolLogo className="w-9 h-9 text-stone-800" />
            <span className="font-serif text-lg font-semibold tracking-tight">Wool</span>
          </Link>

          <nav className="flex items-center gap-1">
            <Link href="/devices" className={`text-sm px-3 py-1.5 rounded-md transition-colors ${location === "/devices" ? "text-primary bg-primary/8 font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}>
              Devices
            </Link>
            <Link href="/analyze" className={`text-sm px-3 py-1.5 rounded-md transition-colors ${location.startsWith("/analyze") ? "text-primary bg-primary/8 font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}>
              Analyze
            </Link>
          </nav>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-[11px] font-medium text-secondary-foreground cursor-pointer">
              {initials}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {user?.email && (
              <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                {user.email}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => logout()}>
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground flex flex-col">
      <AppHeader />
      <main className="flex-1 container mx-auto px-6 py-6">
        {children}
      </main>
    </div>
  );
}
