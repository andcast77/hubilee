import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/lib/api/client";
import type { MeResponse } from "@hubilee/contracts";

export function useUser() {
  return useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const response = await authApi.me();
      // SharedApiClient returns the raw HTTP body. The API wraps
      // responses in { success, data } — extract the inner payload
      // so consumers read membershipRole / companyProfileComplete etc.
      if (response && typeof response === "object" && "success" in response && "data" in response) {
        const env = response as { success: boolean; data?: MeResponse };
        if (!env.success || !env.data) {
          return null;
        }
        return env.data;
      }
      return response as unknown as MeResponse;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}
