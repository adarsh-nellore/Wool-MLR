import { useLocation } from "wouter";
import { Plus, ArrowRight, FileText, Clock, Shield } from "lucide-react";
import Layout from "../components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [, setLocation] = useLocation();

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-10">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, Jordan</h1>
          <p className="text-muted-foreground text-lg">
            Ready to review your medical device promotional content?
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="card-soft relative overflow-hidden group border-primary/20 bg-gradient-to-br from-white to-primary/5 hover:border-primary/40 transition-all duration-300">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Shield className="w-24 h-24 text-primary" />
            </div>
            <CardHeader>
              <CardTitle>New Analysis</CardTitle>
              <CardDescription>
                Check new content against your product profile.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => setLocation("/analyze")} 
                className="btn-soft-primary w-full sm:w-auto group-hover:scale-105 transition-transform"
              >
                Start Analysis <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </CardContent>
          </Card>

          <Card className="card-soft hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle>Create Product Profile</CardTitle>
              <CardDescription>
                Set up a new device context for analysis.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                onClick={() => setLocation("/onboarding")} 
                className="w-full sm:w-auto hover:bg-secondary/50"
              >
                <Plus className="mr-2 w-4 h-4" /> New Profile
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            Recent Activity
          </h2>
          
          <div className="grid gap-4">
            {[
              { title: "Q3 Marketing Brochure - Draft 2", device: "CardioFlow X1", status: "In Progress", date: "2 mins ago" },
              { title: "Surgeon Training Deck", device: "NeuroStim Pro", status: "Completed", date: "4 hours ago" },
              { title: "Email Campaign - US Launch", device: "CardioFlow X1", status: "Completed", date: "Yesterday" },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.device}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-xs px-2 py-1 rounded-full border ${
                    item.status === "Completed" 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                      : "bg-amber-50 text-amber-700 border-amber-100"
                  }`}>
                    {item.status}
                  </span>
                  <span className="text-sm text-muted-foreground">{item.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
