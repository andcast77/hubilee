import { useQuery } from "@tanstack/react-query";
import { ApiError } from "@hubilee/shared";
import { authApi } from "@/lib/api-client";

export function useUser() {
  return useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      try {
        const response = await authApi.me();
        if (!response.success || !response.data) {
          throw new Error(response.error || "Failed to fetch user");
        }
        return response.data;
      } catch (e) {
        if (e instanceof ApiError && e.statusCode === 401) return null;
        throw e;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}
