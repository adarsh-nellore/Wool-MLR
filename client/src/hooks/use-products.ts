import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { ProductProfile, CoreClaim, PromoRule, StoredAnalysis } from "@shared/schema";

type ProductWithCounts = ProductProfile & { claimsCount: number };
type ProductDetail = ProductProfile & { claims: CoreClaim[]; rules: PromoRule[] };

export function useProducts() {
  return useQuery<ProductWithCounts[]>({
    queryKey: ["/api/products"],
  });
}

export function useProductDetail(id: number | string | undefined) {
  return useQuery<ProductDetail>({
    queryKey: [`/api/products/${id}`],
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/products", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
  });
}

export function useProductAnalyses(profileId: number | string | undefined) {
  return useQuery<StoredAnalysis[]>({
    queryKey: [`/api/products/${profileId}/analyses`],
    enabled: !!profileId,
  });
}

export type RecentAnalysis = {
  id: number;
  profileId: number;
  profileName: string;
  deviceType: string;
  summary: { total: number; high: number; medium: number; low: number };
  createdAt: string;
};

export function useRecentAnalyses() {
  return useQuery<RecentAnalysis[]>({
    queryKey: ["/api/analyses/recent"],
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
  });
}
