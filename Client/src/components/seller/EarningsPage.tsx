import React from "react";
import { useNavigate } from "react-router-dom";
import {
  DollarSign,
  TrendingUp,
  ArrowDownToLine,
} from "lucide-react";

import { Header } from "../shared/Header";
import { Footer } from "../shared/Footer";

import { sellerEarningsApi, request } from "../../config/api";

interface EarningsSummary {
  total_earnings?: number;
  available_balance?: number;
  pending_clearance?: number;
}

const EarningsPage: React.FC = () => {
  const navigate = useNavigate();

  const [summary, setSummary] = React.useState<EarningsSummary>({});
  const [loading, setLoading] = React.useState(true);
  const [withdrawing, setWithdrawing] = React.useState(false);

  /* ===========================
     LOAD SUMMARY
  =========================== */
  React.useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data: any = await sellerEarningsApi.summary();

        // Server returns gross_earnings / net_earnings (see sellerEarningsController)
        setSummary({
          total_earnings:
            typeof data?.net_earnings === "number"
              ? data.net_earnings
              : typeof data?.gross_earnings === "number"
              ? data.gross_earnings
              : undefined,
          // available_balance and pending_clearance are not provided by the server yet
          available_balance: undefined,
          pending_clearance: undefined,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  /* ===========================
     WITHDRAW
  =========================== */
  const requestWithdraw = async () => {
    try {
      setWithdrawing(true);
      await request("/sellerpayout/request", {
        method: "POST",
      });

      // reload summary after request and normalize fields
      const data: any = await sellerEarningsApi.summary();
      setSummary({
        total_earnings:
          typeof data?.net_earnings === "number"
            ? data.net_earnings
            : typeof data?.gross_earnings === "number"
            ? data.gross_earnings
            : undefined,
        available_balance: undefined,
        pending_clearance: undefined,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading earnings…
      </div>
    );
  }

  /* ===========================
     UI
  =========================== */
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
    <main className="flex-1 bg-gray-50 dark:bg-[#0A0A0A]">
        <div className="container mx-auto px-4 py-8 space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl mb-2">Earnings</h1>
            <p className="text-muted-foreground">
              Track your revenue and payouts
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              label="Total Earnings"
              value={
                typeof summary.total_earnings === "number"
                  ? `₹${summary.total_earnings.toFixed(2)}`
                  : "—"
              }
              icon={<TrendingUp />}
              highlight
            />

            <StatCard
              label="Available Balance"
              value={
                typeof summary.available_balance === "number"
                  ? `₹${summary.available_balance.toFixed(2)}`
                  : "—"
              }
              icon={<DollarSign />}
            />

            <StatCard
              label="Pending Clearance"
              value={
                typeof summary.pending_clearance === "number"
                  ? `₹${summary.pending_clearance.toFixed(2)}`
                  : "—"
              }
              icon={<DollarSign />}
            />
          </div>

          {/* Withdraw */}
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-6 border border-border mt-6">
            <h2 className="text-xl mb-4">Withdraw Funds</h2>

            <div className="flex flex-wrap items-center gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Available for withdrawal
                </p>
                <p className="text-3xl text-[#0D47A1] dark:text-[#00B0FF]">
                  {typeof summary.available_balance === "number"
                    ? `₹${summary.available_balance.toFixed(2)}`
                    : "—"}
                </p>
              </div>

              <button
                onClick={requestWithdraw}
                disabled={withdrawing}
                className="bg-gradient-to-r from-[#0D47A1] to-[#00B0FF] text-white px-8 py-3 rounded-xl flex items-center gap-2"
              >
                <ArrowDownToLine className="w-5 h-5" />
                {withdrawing ? "Requesting…" : "Request Withdrawal"}
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="text-sm text-muted-foreground">
            Detailed transaction history will be available once enabled
            by the platform.
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

const StatCard = ({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  highlight?: boolean;
}) => (
  <div
    className={`rounded-xl p-6 border border-border ${
      highlight
        ? "bg-gradient-to-br from-[#0D47A1] to-[#00B0FF] text-white"
        : "bg-white dark:bg-[#1a1a1a]"
    }`}
  >
    <div className="flex items-center justify-between mb-4">
      <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
        {icon}
      </div>
    </div>
    <h3 className="text-3xl mb-1">{value}</h3>
    <p className={highlight ? "text-white/80" : "text-muted-foreground"}>
      {label}
    </p>
  </div>
);

export default EarningsPage;
