import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function YarnLogo({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="18" cy="18" r="14" fill="currentColor" opacity="0.10" />
      <circle cx="18" cy="18" r="14" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 12 Q18 5, 29 12" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <path d="M5 20 Q18 28, 31 20" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <path d="M12 5 Q16 18, 12 31" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <path d="M22 5 Q20 18, 24 31" stroke="currentColor" strokeWidth="1.1" fill="none" strokeLinecap="round" opacity="0.5" />
      <path d="M29 24 Q33 30, 30 37" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <circle cx="30" cy="37" r="1" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

export default function Login() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto">
            <YarnLogo className="w-12 h-12 text-stone-700" />
          </div>
          <CardTitle className="text-xl">Wool</CardTitle>
          <CardDescription>
            Sign in to manage device profiles and analyze promotional content for compliance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            onClick={() => {
              window.location.href = "/api/login";
            }}
          >
            Sign in with Replit
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
