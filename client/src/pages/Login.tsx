import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Login() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-sm">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-xl">MedTech MLR Copilot</CardTitle>
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
