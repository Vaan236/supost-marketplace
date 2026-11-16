"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Loader2,
} from "lucide-react";

function ConnectStripeContent() {
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || "";
  const isReturning = searchParams.get("return") === "1";

  const [email, setEmail] = useState(initialEmail);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [statusInfo, setStatusInfo] = useState<{
    connected: boolean;
    charges_enabled: boolean;
    stripe_account_id?: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!initialEmail) return;
    setEmail(initialEmail);

    async function checkStatus() {
      setIsChecking(true);
      try {
        const res = await fetch("/api/stripe/connect/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: initialEmail }),
        });
        const data = await res.json();
        if (res.ok) setStatusInfo(data);
      } finally {
        setIsChecking(false);
      }
    }

    checkStatus();
  }, [initialEmail, isReturning]);

  const handleStartOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/stripe/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok || !data.url) {
        setErrorMsg(data.error || "Could not start Stripe onboarding.");
        setIsLoading(false);
        return;
      }

      window.location.href = data.url;
    } catch {
      setErrorMsg("Network error connecting to Stripe.");
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-10 space-y-5">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1877F2] hover:underline"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Marketplace</span>
      </Link>

      <div className="bg-white border border-[#dadde1] rounded-xl p-6 space-y-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-[#635bff]/10 text-[#635bff] flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1c1e21]">
              Seller Payouts with Stripe
            </h1>
            <p className="text-xs text-[#65676b]">
              Connect your seller email to enable &ldquo;Buy Now&rdquo; on all your
              listings (90% seller payout, 10% platform fee).
            </p>
          </div>
        </div>

        {isChecking && (
          <div className="flex items-center gap-2 text-xs text-[#65676b] bg-[#f7f8fa] p-3 rounded-lg">
            <Loader2 className="w-4 h-4 animate-spin text-[#635bff]" />
            <span>Verifying your Stripe onboarding status...</span>
          </div>
        )}

        {statusInfo?.charges_enabled && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Stripe Connected & Ready for Payouts!</span>
            </div>
            <p className="text-xs text-emerald-700">
              Account <strong>{statusInfo.stripe_account_id}</strong> is active.
              All listings under <strong>{email}</strong> now display a{" "}
              <strong>Buy Now</strong> button.
            </p>
            <Link
              href="/"
              className="inline-block bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg mt-1"
            >
              View Your Live Listings
            </Link>
          </div>
        )}

        {statusInfo && statusInfo.connected && !statusInfo.charges_enabled && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3.5 rounded-lg">
            Onboarding is incomplete for <strong>{email}</strong>. Click below
            to finish Stripe&apos;s test onboarding form.
          </div>
        )}

        <form onSubmit={handleStartOnboarding} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#1c1e21] mb-1">
              Seller Email (must match your listing email) *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seller@example.com"
              className="w-full border border-[#ced0d4] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#635bff]"
            />
          </div>

          {errorMsg && (
            <div className="bg-red-50 border border-red-300 text-red-700 text-xs px-3 py-2 rounded-lg">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full inline-flex items-center justify-center gap-2 bg-[#635bff] hover:bg-[#5249f5] disabled:bg-[#a5a0ff] text-white font-bold text-sm py-2.5 rounded-lg transition-colors cursor-pointer"
          >
            <span>
              {isLoading
                ? "Redirecting to Stripe..."
                : statusInfo?.charges_enabled
                ? "Open Stripe Onboarding Again"
                : "Connect with Stripe"}
            </span>
            <ExternalLink className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ConnectPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-lg mx-auto px-4 py-10">
          <div className="bg-white border border-[#dadde1] rounded-xl h-64 animate-pulse" />
        </div>
      }
    >
      <ConnectStripeContent />
    </Suspense>
  );
}