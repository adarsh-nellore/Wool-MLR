import { Link, useLocation } from "wouter";
import { 
  Plus, 
  ArrowRight, 
  FileText, 
  Box, 
  Activity, 
  MoreVertical,
  Calendar,
  ChevronRight
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
    color: "bg-blue-500"
  },
  {
    id: "neurostim",
    name: "NeuroStim Pro",
    type: "Device",
    lastUpdated: "Yesterday",
    status: "In Review",
    analyses: 5,
    issues: 0,
    color: "bg-purple-500"
  },
  {
    id: "orthofix",
    name: "OrthoFix Ultra",
    type: "Instrument",
    lastUpdated: "3 days ago",
    status: "Draft",
    analyses: 0,
    issues: 0,
    color: "bg-emerald-500"
  }
];

export default function Home() {
  const [, setLocation] = useLocation();

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Products</h1>
            <p className="text-muted-foreground text-lg">
              Manage your device profiles and their promotional content.
            </p>
          </div>
          <Button 
            onClick={() => setLocation("/onboarding")} 
            className="btn-soft-primary"
          >
            <Plus className="mr-2 w-4 h-4" /> New Product Profile
          </Button>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PRODUCTS.map((product) => (
            <Card 
              key={product.id} 
              className="card-soft group hover:shadow-lg transition-all duration-300 cursor-pointer border-transparent hover:border-primary/20"
              onClick={() => setLocation(`/product/${product.id}`)}
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${product.color} bg-opacity-10 flex items-center justify-center`}>
                    <Box className={`w-5 h-5 ${product.color.replace('bg-', 'text-')}`} />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">{product.name}</CardTitle>
                    <CardDescription className="text-xs">{product.type}</CardDescription>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
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
              
              <CardContent className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Analyses</p>
                    <p className="text-2xl font-bold">{product.analyses}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Open Issues</p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold">{product.issues}</p>
                      {product.issues > 0 && (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 h-5 px-1.5">
                          Alert
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="bg-muted/30 p-4 border-t flex justify-between items-center group-hover:bg-primary/5 transition-colors">
                <div className="flex items-center text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3 mr-1" />
                  Updated {product.lastUpdated}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardFooter>
            </Card>
          ))}

          {/* Add New Placeholder Card */}
          <Card 
            className="border-dashed border-2 bg-transparent hover:bg-muted/20 hover:border-primary/50 transition-all cursor-pointer flex flex-col items-center justify-center gap-4 min-h-[280px]"
            onClick={() => setLocation("/onboarding")}
          >
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Plus className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-lg">Add Product</h3>
              <p className="text-sm text-muted-foreground">Create a new device profile</p>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
