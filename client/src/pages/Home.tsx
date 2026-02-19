import { useLocation } from "wouter";
import {
  Plus,
  FileText,
  Box,
  MoreVertical,
  ChevronRight,
  Loader2,
  Clock,
  AlertTriangle,
} from "lucide-react";
import Layout from "../components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProducts, useDeleteProduct, useRecentAnalyses } from "@/hooks/use-products";
import { useToast } from "@/hooks/use-toast";

const deviceTypeColors: Record<string, { bg: string; text: string }> = {
  implant: { bg: "bg-blue-50", text: "text-blue-600" },
  diagnostic: { bg: "bg-purple-50", text: "text-purple-600" },
  monitoring: { bg: "bg-emerald-50", text: "text-emerald-600" },
  samd: { bg: "bg-amber-50", text: "text-amber-600" },
  instrument: { bg: "bg-rose-50", text: "text-rose-600" },
};

export default function Home() {
  const [, setLocation] = useLocation();
  const { data: products, isLoading, error } = useProducts();
  const deleteProduct = useDeleteProduct();
  const { data: recentAnalyses } = useRecentAnalyses();
  const { toast } = useToast();

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

        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="text-center py-20 text-muted-foreground">
            <p>Failed to load products.</p>
          </div>
        )}

        {!isLoading && !error && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {products?.map((product) => {
                const colors = deviceTypeColors[product.deviceType] || { bg: "bg-gray-50", text: "text-gray-600" };
                return (
                  <Card
                    key={product.id}
                    className="group hover:shadow-md transition-all duration-200 cursor-pointer border-border/60 hover:border-primary/30"
                    onClick={() => product.isSample ? setLocation(`/analyze?profileId=${product.id}&loadSample=true`) : setLocation(`/product/${product.id}`)}
                  >
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center`}>
                          <Box className={`w-4 h-4 ${colors.text}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-sm font-semibold">{product.name}</CardTitle>
                            {product.isSample && (
                              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-amber-100 text-amber-700 font-semibold">
                                SAMPLE
                              </Badge>
                            )}
                          </div>
                          <CardDescription className="text-xs mt-0.5 capitalize">{product.deviceType}</CardDescription>
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
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setLocation(`/product/${product.id}`); }}>
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteProduct.mutate(product.id, {
                                onSuccess: () => toast({ title: "Product deleted" }),
                              });
                            }}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardHeader>

                    <CardContent className="pb-3">
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <FileText className="w-3.5 h-3.5" />
                          <span className="font-medium text-foreground">{product.claimsCount}</span> claims
                        </div>
                      </div>
                    </CardContent>

                    <div className="px-5 py-2.5 border-t flex justify-between items-center text-xs text-muted-foreground">
                      <span>Created {new Date(product.createdAt).toLocaleDateString()}</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:text-primary transition-colors" />
                    </div>
                  </Card>
                );
              })}

              {/* Add New Placeholder Card */}
              <Card
                className="border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer flex flex-col items-center justify-center gap-3 min-h-[180px]"
                onClick={() => setLocation("/onboarding")}
              >
                <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
                <div className="text-center px-6">
                  <p className="font-semibold text-sm text-primary">Add Device Profile</p>
                  <p className="text-xs text-muted-foreground mt-1">Set up a new device for content analysis.</p>
                </div>
              </Card>
            </div>

            {/* Recent Analyses */}
            {recentAnalyses && recentAnalyses.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-foreground">Recent Analyses</h2>
                </div>
                <div className="space-y-2">
                  {recentAnalyses.map((analysis) => {
                    const colors = deviceTypeColors[analysis.deviceType] || { bg: "bg-gray-50", text: "text-gray-600" };
                    return (
                      <Card
                        key={analysis.id}
                        className="group hover:shadow-sm transition-all cursor-pointer border-border/60 hover:border-primary/30"
                        onClick={() => setLocation(`/analyze?analysisId=${analysis.id}&profileId=${analysis.profileId}`)}
                      >
                        <div className="flex items-center justify-between px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-7 h-7 rounded-md ${colors.bg} flex items-center justify-center shrink-0`}>
                              <FileText className={`w-3.5 h-3.5 ${colors.text}`} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium truncate">
                                  Analysis #{analysis.id}
                                </span>
                                <Badge variant="outline" className="text-[10px] h-5 px-1.5 shrink-0 capitalize">
                                  {analysis.profileName}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                <span>{new Date(analysis.createdAt).toLocaleDateString()}</span>
                                <span className="flex items-center gap-1">
                                  {analysis.summary.total} finding{analysis.summary.total !== 1 ? 's' : ''}
                                </span>
                                {analysis.summary.high > 0 && (
                                  <span className="flex items-center gap-0.5 text-red-600">
                                    <AlertTriangle className="w-3 h-3" />
                                    {analysis.summary.high} high
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
