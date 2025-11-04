import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import {
  paymentService,
  type PaymentSummary,
  type PayoutResponse,
} from "@/lib/payment-service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, DollarSign, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const DriverEarningsPage = () => {
  const { session, isAuthenticated, profile } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [payouts, setPayouts] = useState<PayoutResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !session?.token) {
      navigate("/driver/login");
      return;
    }

    if (profile?.role !== "driver") {
      navigate("/");
      return;
    }

    loadEarningsData();
  }, [isAuthenticated, session, profile, navigate]);

  const loadEarningsData = async () => {
    if (!session?.token) return;

    try {
      setIsLoading(true);
      const [summaryData, payoutHistory] = await Promise.all([
        paymentService.getPaymentSummary(session.token),
        paymentService.getPayoutHistory(session.token),
      ]);
      setSummary(summaryData);
      setPayouts(payoutHistory);
    } catch (error) {
      console.error("Failed to load earnings data:", error);
      toast({
        title: "Error",
        description: "Failed to load earnings data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPayoutStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/15 text-green-200";
      case "processing":
        return "bg-blue-500/15 text-blue-200";
      case "failed":
        return "bg-red-500/15 text-red-200";
      default:
        return "bg-yellow-500/15 text-yellow-200";
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/driver/profile")}
            className="text-slate-200"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Profile
          </Button>
          <h1 className="text-2xl font-bold">Earnings Dashboard</h1>
          <div className="w-32" /> {/* Spacer for centering */}
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-3 mb-8">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-lg bg-white/5"
              />
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3 mb-8">
              <Card className="border-white/10 bg-white/5">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-300">
                    Total Earnings
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-emerald-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-300">
                    {summary?.currency} {summary?.totalEarnings.toFixed(2) || "0.00"}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-white/5">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-300">
                    Pending Payouts
                  </CardTitle>
                  <Clock className="h-4 w-4 text-yellow-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-300">
                    {summary?.currency} {summary?.pendingPayouts.toFixed(2) || "0.00"}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-white/5">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-300">
                    Completed Payouts
                  </CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-300">
                    {summary?.currency} {summary?.completedPayouts.toFixed(2) || "0.00"}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-white/10 bg-white/5">
              <CardHeader>
                <CardTitle>Payout History</CardTitle>
              </CardHeader>
              <CardContent>
                {payouts.length === 0 ? (
                  <p className="text-center text-slate-400 py-8">
                    No payouts yet
                  </p>
                ) : (
                  <div className="space-y-4">
                    {payouts.map((payout) => (
                      <div
                        key={payout.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <TrendingUp className="h-5 w-5 text-emerald-400" />
                            <div>
                              <p className="font-medium text-white">
                                {payout.currency} {payout.amount.toFixed(2)}
                              </p>
                              <p className="text-sm text-slate-400">
                                {new Date(payout.periodStart).toLocaleDateString()} -{" "}
                                {new Date(payout.periodEnd).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <Badge className={getPayoutStatusColor(payout.status)}>
                              {payout.status}
                            </Badge>
                            {payout.processedAt && (
                              <p className="text-xs text-slate-400 mt-1">
                                {new Date(payout.processedAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default DriverEarningsPage;





