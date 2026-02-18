import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { AnalysisResponse } from "@shared/schema";

export function useAnalysis() {
  const queryClient = useQueryClient();
  return useMutation<AnalysisResponse, Error, { profileId: number; content: string }>({
    mutationFn: async (data) => {
      const res = await apiRequest("POST", "/api/analyze", data);
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/products/${variables.profileId}/analyses`] });
    },
  });
}
