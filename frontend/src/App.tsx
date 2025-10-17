import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/auth-context";
import DriverLoginPage from "@/pages/auth/DriverLogin";
import DriverSignupPage from "@/pages/auth/DriverSignup";
import PassengerLoginPage from "@/pages/auth/PassengerLogin";
import PassengerSignupPage from "@/pages/auth/PassengerSignup";
import DriverProfilePage from "@/pages/driver/Profile";
import Index from "@/pages/index";
import NotFound from "@/pages/NotFound";
import PassengerProfilePage from "@/pages/passenger/Profile";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<PassengerLoginPage />} />
            <Route path="/signup" element={<PassengerSignupPage />} />
            <Route path="/driver/login" element={<DriverLoginPage />} />
            <Route path="/driver/signup" element={<DriverSignupPage />} />
            <Route
              path="/passenger/profile"
              element={
                <ProtectedRoute requiredRole="passenger">
                  <PassengerProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/driver/profile"
              element={
                <ProtectedRoute requiredRole="driver">
                  <DriverProfilePage />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
