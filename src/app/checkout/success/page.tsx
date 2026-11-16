"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Loader2, ShoppingBag } from "lucide-react";
import { Listing } from "@/lib/supabase";

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const accountId = searchParams.get("account_id");

  const [isVerifying, setIsVerifying] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [orderSummary, setOrderSummary] = useState<{
    amountTotal: number;
    buyerEmail: string;
    listing: Listing | null;
  } | null>(null);

  useEffect(() => {
    if (!sessionId || !accountId) {
      setErrorMsg("Missing payment session details.");
      setIsVerifying(false);
      return;
    }

    async function verify() {
      try {
        const res = await fetch("/api/stripe/verify-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, accountId }),
        });
        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.error || "Could not confirm order.");
        } else {
          setOrderSummary(data);
        }
      } catch {
        setErrorMsg("Network error confirming order.");
      } finally {
        setIsVerifying(false);
      }
    }

    verify();
  }, [sessionId, accountId]);

  if (isVerifying) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#1877F2] mx-auto" />
        <p className="text-sm font-semibold text-[#1c1e21]">
          Confirming your payment...
        </p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-3">
        <h1 className="text-xl font-bold text-red-600">Payment Verification Issue</h1>
        <p className="text-sm text-[#65676b]">{errorMsg}</p>
        <Link
          href="/"
          className="inline-block bg-[#1877F2] text-white text-sm font-bold px-4 py-2 rounded-lg"
        >
          Back to Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <div className="bg-white border border-[#dadde1] rounded-xl p-6 text-center space-y-4 shadow-xs">
        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-7 h-7" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-[#1c1e21]">
            Order Confirmed!
          </h1>
          <p className="text-xs text-[#65676b] mt-1">
            Your payment succeeded and the listing has been marked as{" "}
            <strong>Sold</strong>.
          </p>
        </div>

        {orderSummary?.listing && (
          <div className="bg-[#f7f8fa] border border-[#dadde1] rounded-lg p-4 text-left flex items-center gap-3">
            <div className="w-16 h-16 rounded-md bg-white border border-[#dadde1] overflow-hidden shrink-0 flex items-center justify-center">
              {orderSummary.listing.image_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={orderSummary.listing.image_url}
                  alt={orderSummary.listing.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <ShoppingBag className="w-5 h-5 text-[#65676b]" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-[#1c1e21] truncate">
                {orderSummary.listing.title}
              </div>
              <div className="text-xs text-[#65676b]">
                Paid: <strong>${orderSummary.amountTotal.toLocaleString()}</strong>
              </div>
              <div className="text-xs text-[#65676b] truncate">
                Seller: {orderSummary.listing.seller_email}
              </div>
            </div>
          </div>
        )}

        <Link
          href="/"
          className="inline-block w-full bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold text-sm py-2.5 rounded-lg transition-colors"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-lg mx-auto px-4 py-10">
          <div className="bg-white border border-[#dadde1] rounded-xl h-64 animate-pulse" />
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  );
}