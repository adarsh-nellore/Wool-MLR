import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { AnalysisResponse } from "@shared/schema";

export function useAnalysis() {
  return useMutation<AnalysisResponse, Error, { profileId: number; content: string }>({
    mutationFn: async (data) => {
      const res = await apiRequest("POST", "/api/analyze", data);
      return res.json();
    },
  });
}
