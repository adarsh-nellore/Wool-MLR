import { useRoute, useLocation } from "wouter";
import {
  ArrowLeft,
  Plus,
  FileText,
  AlertTriangle,
  CheckCircle,
  MoreHorizontal,
  Search,
  Filter,
  ShieldCheck,
  Target,
  FileWarning
} from "lucide-react";
import Layout from "../components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const MOCK_CONTENT = [
  { id: 1, title: "Q3 Marketing Brochure", type: "Brochure", status: "Approved", issues: 0, date: "Oct 24, 2025" },
  { id: 2, title: "Surgeon Training Deck", type: "Presentation", status: "Changes Needed", issues: 3, date: "Oct 22, 2025" },
  { id: 3, title: "Launch Email Campaign", type: "Email", status: "In Review", issues: 1, date: "Oct 20, 2025" },
  { id: 4, title: "Website Landing Page", type: "Web", status: "Draft", issues: 0, date: "Oct 18, 2025" },
];

export default function ProductDetails() {
  const [match, params] = useRoute("/product/:id");
  const [, setLocation] = useLocation();

  if (!match) return null;

  const productId = params.id;
  const productName = productId === "cardioflow" ? "CardioFlow X1" : "NeuroStim Pro";

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Button variant="ghost" size="sm" className="h-6 px-2 -ml-2 text-muted-foreground" onClick={() => setLocation("/")}>
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Products
          </Button>
          <span className="text-border">/</span>
          <span className="font-medium text-foreground">{productName}</span>
        </div>

        {/* Product Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-semibold tracking-tight">{productName}</h1>
              <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200 text-xs">
                Active
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm mt-1 max-w-xl">
              Next-generation implantable hemodynamic monitor for heart failure management.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">Edit Profile</Button>
            <Button className="btn-soft-primary" size="sm" onClick={() => setLocation("/analyze")}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> New Analysis
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-border/60">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" /> Indications
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-sm leading-relaxed line-clamp-2">
                Indicated for patients with NYHA Class III heart failure who have been hospitalized in the past year...
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Core Claims
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-sm font-medium">12 Approved Claims</p>
              <p className="text-xs text-muted-foreground mt-0.5">Last updated 2 days ago</p>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <FileWarning className="w-3.5 h-3.5" /> Risks
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-sm leading-relaxed line-clamp-2">
                Contraindicated for patients unable to take dual antiplatelet therapy for one month post-implant...
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Content List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Tabs defaultValue="all" className="w-[360px]">
              <TabsList className="h-8">
                <TabsTrigger value="all" className="text-xs h-7">All Content</TabsTrigger>
                <TabsTrigger value="approved" className="text-xs h-7">Approved</TabsTrigger>
                <TabsTrigger value="review" className="text-xs h-7">Needs Review</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-2">
              <div className="relative w-56">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Search content..." className="pl-8 h-8 text-sm" />
              </div>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <Filter className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="border border-border/60 rounded-lg bg-card overflow-hidden">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 px-4 py-2.5 bg-muted/30 border-b text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              <div>Title</div>
              <div>Type</div>
              <div>Status</div>
              <div>Updated</div>
              <div className="w-8"></div>
            </div>

            {MOCK_CONTENT.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 px-4 py-3 border-b last:border-0 hover:bg-muted/10 transition-colors items-center cursor-pointer group"
                onClick={() => setLocation("/analyze")}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded bg-primary/8 text-primary flex items-center justify-center">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm font-medium">{item.title}</span>
                </div>

                <div>
                  <Badge variant="outline" className="font-normal text-xs h-5">
                    {item.type}
                  </Badge>
                </div>

                <div>
                  <Badge
                    className={`text-xs h-5 ${
                      item.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      item.status === 'Changes Needed' ? 'bg-red-50 text-red-700 border-red-200' :
                      item.status === 'In Review' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-gray-50 text-gray-600 border-gray-200'
                    }`}
                    variant="secondary"
                  >
                    {item.status === 'Changes Needed' && <AlertTriangle className="w-3 h-3 mr-1" />}
                    {item.status === 'Approved' && <CheckCircle className="w-3 h-3 mr-1" />}
                    {item.status}
                  </Badge>
                </div>

                <div className="text-xs text-muted-foreground">
                  {item.date}
                </div>

                <div className="flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setLocation("/analyze")}>Open Analysis</DropdownMenuItem>
                      <DropdownMenuItem>Rename</DropdownMenuItem>
                      <DropdownMenuItem>Duplicate</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
