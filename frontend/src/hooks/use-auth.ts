import { useMemo } from "react";

import { useAuthContext } from "@/contexts/auth-context";

export const useAuth = () => {
  const context = useAuthContext();
  const isAuthenticated = context.status === "authenticated";

  return useMemo(
    () => ({
      ...context,
      isAuthenticated,
    }),
    [context, isAuthenticated]
  );
};
