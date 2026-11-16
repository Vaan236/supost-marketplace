import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { listingId } = await req.json();
    if (!listingId) {
      return NextResponse.json(
        { error: "Listing ID is required." },
        { status: 400 }
      );
    }

    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("*")
      .eq("id", listingId)
      .single();

    if (listingError || !listing) {
      return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    }

    if (listing.status === "sold") {
      return NextResponse.json(
        { error: "This item has already been sold." },
        { status: 400 }
      );
    }

    const sellerEmail = listing.seller_email.trim().toLowerCase();
    const { data: seller } = await supabase
      .from("sellers")
      .select("*")
      .eq("email", sellerEmail)
      .maybeSingle();

    if (!seller || !seller.charges_enabled) {
      return NextResponse.json(
        { error: "Seller has not completed Stripe onboarding yet." },
        { status: 400 }
      );
    }

    const unitAmount = Math.max(50, Math.round(Number(listing.price) * 100)); // cents
    const applicationFeeAmount = Math.round(unitAmount * 0.1); // 10% platform fee
    const origin = req.nextUrl.origin;

    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: listing.title,
                description: listing.description || `${listing.category} listing`,
                ...(listing.image_url ? { images: [listing.image_url] } : {}),
              },
              unit_amount: unitAmount,
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          application_fee_amount: applicationFeeAmount,
        },
        metadata: {
          listing_id: listing.id,
          seller_email: sellerEmail,
          platform_fee: (applicationFeeAmount / 100).toFixed(2),
        },
        success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}&account_id=${encodeURIComponent(
          seller.stripe_account_id
        )}`,
        cancel_url: `${origin}/item/${listing.id}`,
      },
      {
        stripeAccount: seller.stripe_account_id,
      }
    );

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create Stripe Checkout.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}