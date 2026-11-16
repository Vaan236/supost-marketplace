"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Mail,
  MapPin,
  Send,
  ShoppingBag,
  Tag,
} from "lucide-react";
import { supabase, Listing, formatTimeAgo } from "@/lib/supabase";

function ListingDetailContent() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [listing, setListing] = useState<Listing | null>(null);
  const [sellerReady, setSellerReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isBuying, setIsBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);

  const [buyerEmail, setBuyerEmail] = useState("");
  const [messageText, setMessageText] = useState(
    "Hi, is this still available?"
  );
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    async function fetchListingAndSeller() {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      const item = data as Listing;
      setListing(item);

      // Check if seller has completed Stripe Connect onboarding
      const { data: seller } = await supabase
        .from("sellers")
        .select("charges_enabled")
        .eq("email", item.seller_email.trim().toLowerCase())
        .maybeSingle();

      setSellerReady(Boolean(seller?.charges_enabled));
      setIsLoading(false);
    }

    fetchListingAndSeller();
  }, [id]);

  const handleBuyNow = async () => {
    if (!listing) return;
    setBuyError(null);
    setIsBuying(true);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: listing.id }),
      });
      const data = await res.json();

      if (!res.ok || !data.url) {
        setBuyError(data.error || "Could not open Stripe Checkout.");
        setIsBuying(false);
        return;
      }

      window.location.href = data.url;
    } catch {
      setBuyError("Network error starting checkout.");
      setIsBuying(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listing) return;
    setFormError(null);

    if (!buyerEmail.trim() || !buyerEmail.includes("@")) {
      setFormError("Please enter a valid email address.");
      return;
    }
    if (!messageText.trim()) {
      setFormError("Please write a message.");
      return;
    }

    setIsSending(true);

    const { error } = await supabase.from("messages").insert({
      listing_id: listing.id,
      buyer_email: buyerEmail.trim(),
      seller_email: listing.seller_email,
      message: messageText.trim(),
    });

    if (error) {
      setFormError(`Could not send message: ${error.message}`);
    } else {
      setSentSuccess(true);
    }

    setIsSending(false);
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="bg-white border border-[#dadde1] rounded-xl h-[520px] animate-pulse" />
      </div>
    );
  }

  if (notFound || !listing) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-3">
        <h1 className="text-xl font-bold text-[#1c1e21]">Listing not found</h1>
        <p className="text-sm text-[#65676b]">
          This listing may have been removed or the URL is invalid.
        </p>
        <Link
          href="/"
          className="inline-block bg-[#1877F2] text-white text-sm font-bold px-4 py-2 rounded-lg"
        >
          Back to Marketplace
        </Link>
      </div>
    );
  }

  const isSold = listing.status === "sold";

  const mailtoHref = `mailto:${encodeURIComponent(
    listing.seller_email
  )}?subject=${encodeURIComponent(
    `Marketplace Inquiry: ${listing.title}`
  )}&body=${encodeURIComponent(messageText)}`;

  return (
    <div className="max-w-6xl mx-auto px-4 py-5 space-y-4">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1877F2] hover:underline"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Marketplace</span>
      </Link>

      <div className="bg-white border border-[#dadde1] rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-[1.4fr_400px] shadow-xs">
        {/* Left Image Stage */}
        <div className="bg-[#f0f2f5] border-b lg:border-b-0 lg:border-r border-[#dadde1] flex items-center justify-center min-h-[340px] lg:min-h-[560px] p-4 relative">
          {isSold && (
            <span className="absolute top-4 left-4 bg-red-600 text-white text-xs font-extrabold uppercase tracking-wider px-3 py-1.5 rounded-md shadow-sm">
              Sold
            </span>
          )}
          {listing.image_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={listing.image_url}
              alt={listing.title}
              className="max-h-[540px] w-auto object-contain rounded-lg"
            />
          ) : (
            <span className="text-sm text-[#65676b]">No photo provided</span>
          )}
        </div>

        {/* Right Details, Buy Now & Seller Chat Box */}
        <div className="p-5 flex flex-col justify-between space-y-5 bg-white">
          <div className="space-y-4">
            <div>
              <div className="flex items-start justify-between gap-2">
                <h1 className="text-2xl font-bold text-[#1c1e21] leading-snug">
                  {listing.title}
                </h1>
                {isSold && (
                  <span className="shrink-0 bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full">
                    Sold
                  </span>
                )}
              </div>
              <div className="text-xl font-bold text-[#1c1e21] mt-1">
                ${Number(listing.price).toLocaleString()}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-[#65676b] mt-2">
                <span>{formatTimeAgo(listing.created_at)}</span>
                <span className="inline-flex items-center gap-1 text-[#1877F2] font-medium">
                  <MapPin className="w-3.5 h-3.5" />
                  {listing.location}
                </span>
              </div>
            </div>

            {/* Stripe Buy Now Section */}
            <div className="pt-1 space-y-2">
              {isSold ? (
                <div className="w-full bg-[#e4e6eb] text-[#65676b] font-bold text-sm py-2.5 px-4 rounded-lg text-center">
                  Item Sold
                </div>
              ) : sellerReady ? (
                <button
                  type="button"
                  onClick={handleBuyNow}
                  disabled={isBuying}
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#16a34a] hover:bg-[#15803d] disabled:bg-[#86efac] text-white font-bold text-sm py-3 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>
                    {isBuying
                      ? "Opening Stripe Checkout..."
                      : `Buy Now · $${Number(listing.price).toLocaleString()}`}
                  </span>
                </button>
              ) : (
                <div className="bg-[#f7f8fa] border border-[#dadde1] rounded-lg p-3 text-xs text-[#65676b] space-y-1.5">
                  <div className="font-semibold text-[#1c1e21] flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-[#635bff]" />
                    <span>Online checkout not enabled yet</span>
                  </div>
                  <p>
                    This seller hasn&apos;t connected Stripe payouts yet.{" "}
                    <Link
                      href={`/connect?email=${encodeURIComponent(
                        listing.seller_email
                      )}`}
                      className="text-[#635bff] font-semibold underline"
                    >
                      Seller? Connect here
                    </Link>
                  </p>
                </div>
              )}

              {buyError && (
                <p className="text-xs text-red-600 font-medium">{buyError}</p>
              )}
            </div>

            <div className="inline-flex items-center gap-1.5 bg-[#f0f2f5] text-[#1c1e21] text-xs font-semibold px-3 py-1.5 rounded-full">
              <Tag className="w-3.5 h-3.5 text-[#65676b]" />
              <span>{listing.category}</span>
            </div>

            <div className="border-t border-[#e4e6eb] pt-3.5">
              <h2 className="text-sm font-bold text-[#1c1e21] mb-1">Details</h2>
              <p className="text-sm text-[#1c1e21] whitespace-pre-wrap leading-relaxed">
                {listing.description || "No description provided."}
              </p>
            </div>

            <div className="border-t border-[#e4e6eb] pt-3.5">
              <h2 className="text-sm font-bold text-[#1c1e21] mb-1">
                Seller Information
              </h2>
              <p className="text-sm text-[#65676b] break-all">
                {listing.seller_email}
              </p>
            </div>
          </div>

          {/* Send Seller a Message Card */}
          <div className="bg-[#f7f8fa] border border-[#dadde1] rounded-xl p-4">
            <h2 className="text-sm font-bold text-[#1c1e21] mb-2.5 flex items-center gap-1.5">
              <Send className="w-4 h-4 text-[#1877F2]" />
              <span>Send seller a message</span>
            </h2>

            {sentSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Message sent to seller!</span>
                </div>
                <p className="text-xs text-emerald-700">
                  Saved in Supabase for <strong>{listing.seller_email}</strong>.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <a
                    href={mailtoHref}
                    className="inline-flex items-center gap-1.5 bg-[#1877F2] text-white text-xs font-bold px-3 py-1.5 rounded-lg"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Open Email App</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setSentSuccess(false);
                      setMessageText("");
                    }}
                    className="text-xs font-semibold text-[#1c1e21] underline px-2 py-1.5 cursor-pointer"
                  >
                    Send another
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="space-y-2.5">
                <input
                  type="email"
                  required
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  placeholder="Your email (e.g., buyer@email.com)"
                  className="w-full bg-white text-[#1c1e21] border border-[#ced0d4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1877F2]"
                />

                <textarea
                  rows={3}
                  required
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="w-full bg-white text-[#1c1e21] border border-[#ced0d4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1877F2] resize-none"
                />

                {formError && (
                  <p className="text-xs text-red-600 font-medium">{formError}</p>
                )}

                <button
                  type="submit"
                  disabled={isSending}
                  className="w-full bg-[#1877F2] hover:bg-[#166fe5] disabled:bg-[#9cb4d8] text-white font-bold text-sm py-2.5 rounded-lg transition-colors cursor-pointer"
                >
                  {isSending ? "Sending..." : "Send"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ListingDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="bg-white border border-[#dadde1] rounded-xl h-[520px] animate-pulse" />
        </div>
      }
    >
      <ListingDetailContent />
    </Suspense>
  );
}