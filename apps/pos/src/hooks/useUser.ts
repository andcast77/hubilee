import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/lib/api/client";

export function useUser() {
  return useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      return await authApi.me();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}
