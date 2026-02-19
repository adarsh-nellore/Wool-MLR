import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WoolLogo } from "@/components/Layout";

export default function Login() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto">
            <WoolLogo className="w-12 h-12 text-stone-700" />
          </div>
          <CardTitle className="text-xl font-serif">Wool</CardTitle>
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
