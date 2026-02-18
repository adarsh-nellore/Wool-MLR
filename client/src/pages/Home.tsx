import { Link, useLocation } from "wouter";
import {
  Plus,
  ArrowRight,
  FileText,
  Box,
  Activity,
  MoreVertical,
  Calendar,
  ChevronRight,
  AlertCircle
} from "lucide-react";
import Layout from "../components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Mock Data for Products
const PRODUCTS = [
  {
    id: "cardioflow",
    name: "CardioFlow X1",
    type: "Implant",
    lastUpdated: "2 hours ago",
    status: "Active",
    analyses: 12,
    issues: 3,
    color: "blue"
  },
  {
    id: "neurostim",
    name: "NeuroStim Pro",
    type: "Device",
    lastUpdated: "Yesterday",
    status: "In Review",
    analyses: 5,
    issues: 0,
    color: "purple"
  },
  {
    id: "orthofix",
    name: "OrthoFix Ultra",
    type: "Instrument",
    lastUpdated: "3 days ago",
    status: "Draft",
    analyses: 0,
    issues: 0,
    color: "emerald"
  }
];

const colorMap: Record<string, { bg: string; text: string; dot: string }> = {
  blue: { bg: "bg-blue-50", text: "text-blue-600", dot: "bg-blue-500" },
  purple: { bg: "bg-purple-50", text: "text-purple-600", dot: "bg-purple-500" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-600", dot: "bg-emerald-500" },
};

export default function Home() {
  const [, setLocation] = useLocation();

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Manage device profiles and promotional content.
            </p>
          </div>
          <Button
            onClick={() => setLocation("/onboarding")}
            className="btn-soft-primary"
            size="sm"
          >
            <Plus className="mr-1.5 w-3.5 h-3.5" /> New Profile
          </Button>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PRODUCTS.map((product) => {
            const colors = colorMap[product.color];
            return (
              <Card
                key={product.id}
                className="group hover:shadow-md transition-all duration-200 cursor-pointer border-border/60 hover:border-primary/30"
                onClick={() => setLocation(`/product/${product.id}`)}
              >
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center`}>
                      <Box className={`w-4 h-4 ${colors.text}`} />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold">{product.name}</CardTitle>
                      <CardDescription className="text-xs mt-0.5">{product.type}</CardDescription>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="sr-only">Open menu</span>
                        <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setLocation(`/product/${product.id}`)}>
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem>Edit Profile</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Archive</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>

                <CardContent className="pb-3">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <FileText className="w-3.5 h-3.5" />
                      <span className="font-medium text-foreground">{product.analyses}</span> analyses
                    </div>
                    {product.issues > 0 ? (
                      <div className="flex items-center gap-1.5 text-amber-600">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span className="font-medium">{product.issues}</span> issues
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">No issues</span>
                    )}
                  </div>
                </CardContent>

                <div className="px-5 py-2.5 border-t flex justify-between items-center text-xs text-muted-foreground">
                  <span>Updated {product.lastUpdated}</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:text-primary transition-colors" />
                </div>
              </Card>
            );
          })}

          {/* Add New Placeholder Card */}
          <Card
            className="border-dashed border-2 border-border/60 bg-transparent hover:bg-muted/30 hover:border-primary/40 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 min-h-[180px]"
            onClick={() => setLocation("/onboarding")}
          >
            <div className="w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center">
              <Plus className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="font-medium text-sm">Add Product</p>
              <p className="text-xs text-muted-foreground mt-0.5">Create a new device profile</p>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
