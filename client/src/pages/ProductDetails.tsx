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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  // Mock finding product details (in real app, fetch from API)
  const productName = productId === "cardioflow" ? "CardioFlow X1" : "NeuroStim Pro";

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Breadcrumb / Back */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Button variant="ghost" size="sm" className="h-6 px-2 -ml-2" onClick={() => setLocation("/")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Products
          </Button>
          <span>/</span>
          <span className="font-medium text-foreground">{productName}</span>
        </div>

        {/* Product Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{productName}</h1>
              <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200">
                Active Profile
              </Badge>
            </div>
            <p className="text-muted-foreground max-w-2xl">
              Next-generation implantable hemodynamic monitor for heart failure management.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">Edit Profile</Button>
            <Button className="btn-soft-primary" onClick={() => setLocation("/analyze")}>
              <Plus className="w-4 h-4 mr-2" /> New Analysis
            </Button>
          </div>
        </div>

        {/* Product Profile Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Target className="w-4 h-4" /> Indications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm line-clamp-3">
                Indicated for patients with NYHA Class III heart failure who have been hospitalized in the past year...
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Core Claims
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-semibold">12 Approved Claims</p>
              <p className="text-xs text-muted-foreground mt-1">Last updated 2 days ago</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileWarning className="w-4 h-4" /> Risks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm line-clamp-3">
                Contraindicated for patients unable to take dual antiplatelet therapy for one month post-implant...
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Content List Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Tabs defaultValue="all" className="w-[400px]">
              <TabsList>
                <TabsTrigger value="all">All Content</TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
                <TabsTrigger value="review">Needs Review</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search content..." className="pl-8 h-9" />
              </div>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 p-4 bg-muted/30 border-b text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <div>Content Title</div>
              <div>Type</div>
              <div>Status</div>
              <div>Last Updated</div>
              <div className="w-10"></div>
            </div>
            
            {MOCK_CONTENT.map((item) => (
              <div 
                key={item.id} 
                className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 p-4 border-b last:border-0 hover:bg-muted/10 transition-colors items-center cursor-pointer group"
                onClick={() => setLocation("/analyze")}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="font-medium text-foreground">{item.title}</span>
                </div>
                
                <div>
                  <Badge variant="outline" className="font-normal">
                    {item.type}
                  </Badge>
                </div>

                <div>
                  <Badge 
                    className={`
                      ${item.status === 'Approved' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200' : ''}
                      ${item.status === 'Changes Needed' ? 'bg-red-50 text-red-700 hover:bg-red-50 border-red-200' : ''}
                      ${item.status === 'In Review' ? 'bg-amber-50 text-amber-700 hover:bg-amber-50 border-amber-200' : ''}
                      ${item.status === 'Draft' ? 'bg-gray-100 text-gray-700 hover:bg-gray-100 border-gray-200' : ''}
                    `}
                    variant="secondary"
                  >
                    {item.status === 'Changes Needed' && <AlertTriangle className="w-3 h-3 mr-1" />}
                    {item.status === 'Approved' && <CheckCircle className="w-3 h-3 mr-1" />}
                    {item.status}
                  </Badge>
                </div>

                <div className="text-sm text-muted-foreground">
                  {item.date}
                </div>

                <div className="flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="h-4 w-4" />
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
