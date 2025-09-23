import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "@/hooks/use-auth";
import type { AuthRole } from "@/lib/auth-service";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: AuthRole | AuthRole[];
  redirectTo?: string;
}

const ensureArray = (role?: AuthRole | AuthRole[]) => {
  if (!role) {
    return undefined;
  }
  return Array.isArray(role) ? role : [role];
};

export const ProtectedRoute = ({
  children,
  requiredRole,
  redirectTo = "/login",
}: ProtectedRouteProps) => {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();
  const allowedRoles = ensureArray(requiredRole);

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    const fallback = allowedRoles.includes("driver") ? "/driver/login" : "/login";
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
};




