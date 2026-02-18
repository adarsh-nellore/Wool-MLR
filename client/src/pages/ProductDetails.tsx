import { useRoute, useLocation } from "wouter";
import {
  ArrowLeft,
  Plus,
  ShieldCheck,
  Target,
  FileWarning,
  Loader2,
  BookOpen,
  Scale,
} from "lucide-react";
import Layout from "../components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProductDetail } from "@/hooks/use-products";

export default function ProductDetails() {
  const [match, params] = useRoute("/product/:id");
  const [, setLocation] = useLocation();

  if (!match) return null;

  const productId = params.id;
  const { data: product, isLoading, error } = useProductDetail(productId);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (error || !product) {
    return (
      <Layout>
        <div className="text-center py-20 text-muted-foreground">
          <p>Product not found.</p>
          <Button variant="ghost" className="mt-4" onClick={() => setLocation("/")}>
            Back to Dashboard
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Button variant="ghost" size="sm" className="h-6 px-2 -ml-2 text-muted-foreground" onClick={() => setLocation("/")}>
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Products
          </Button>
          <span className="text-border">/</span>
          <span className="font-medium text-foreground">{product.name}</span>
        </div>

        {/* Product Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-semibold tracking-tight">{product.name}</h1>
              <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200 text-xs capitalize">
                {product.deviceType}
              </Badge>
            </div>
            {product.oneLiner && (
              <p className="text-muted-foreground text-sm mt-1 max-w-xl">
                {product.oneLiner}
              </p>
            )}
          </div>
          <Button className="btn-soft-primary" size="sm" onClick={() => setLocation(`/analyze?profileId=${product.id}`)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> New Analysis
          </Button>
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
              <p className="text-sm leading-relaxed line-clamp-3">
                {product.ifuText}
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
              <p className="text-sm font-medium">{product.claims?.length || 0} Approved Claims</p>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <FileWarning className="w-3.5 h-3.5" /> Risks
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-sm leading-relaxed line-clamp-3">
                {product.risksText}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Claims List */}
        {product.claims && product.claims.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" /> Approved Claims Library
            </h2>
            <div className="border border-border/60 rounded-lg bg-card overflow-hidden">
              {product.claims.map((claim, idx) => (
                <div
                  key={claim.id}
                  className="px-4 py-3 border-b last:border-0 text-sm flex items-start gap-3"
                >
                  <span className="text-muted-foreground text-xs font-mono mt-0.5">{idx + 1}</span>
                  <span>{claim.claimText}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rules List */}
        {product.rules && product.rules.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <Scale className="w-4 h-4" /> Promotional Rules
            </h2>
            <div className="border border-border/60 rounded-lg bg-card overflow-hidden">
              {product.rules.map((rule, idx) => (
                <div
                  key={rule.id}
                  className="px-4 py-3 border-b last:border-0 text-sm flex items-start gap-3"
                >
                  <span className="text-muted-foreground text-xs font-mono mt-0.5">{idx + 1}</span>
                  <span>{rule.ruleText}</span>
                  {rule.isDefault && (
                    <Badge variant="secondary" className="text-[10px] h-4 ml-auto">default</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state CTA */}
        <div className="border border-dashed border-border/60 rounded-lg p-8 text-center">
          <p className="text-muted-foreground text-sm mb-3">No analyses yet. Start reviewing promotional content.</p>
          <Button className="btn-soft-primary" size="sm" onClick={() => setLocation(`/analyze?profileId=${product.id}`)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Start Analysis
          </Button>
        </div>
      </div>
    </Layout>
  );
}
