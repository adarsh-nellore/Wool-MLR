import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { AnalysisResponse, StoredImage, StoredDocument } from "@shared/schema";

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

export interface UploadAnalysisResponse extends AnalysisResponse {
  extractedText: string;
  images: StoredImage[];
  originalDocument?: StoredDocument;
}

export function useAnalysisUpload() {
  const queryClient = useQueryClient();
  return useMutation<UploadAnalysisResponse, Error, { profileId: number; files: File[] }>({
    mutationFn: async ({ profileId, files }) => {
      const formData = new FormData();
      formData.append("profileId", String(profileId));
      for (const file of files) {
        formData.append("files", file);
      }

      const res = await fetch("/api/analyze/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(body.error || `Upload failed (${res.status})`);
      }

      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/products/${variables.profileId}/analyses`] });
    },
  });
}
