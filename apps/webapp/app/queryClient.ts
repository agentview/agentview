import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 1000, // 10 seconds - fresh
      gcTime: 10 * 60 * 1000, // 10 min - keep in cache
    },
  },
});
