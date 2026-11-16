import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { sessionId, accountId } = await req.json();
    if (!sessionId || !accountId) {
      return NextResponse.json(
        { error: "Missing sessionId or accountId." },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.retrieve(
      sessionId,
      {},
      { stripeAccount: accountId }
    );

    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Payment is not completed yet." },
        { status: 400 }
      );
    }

    const listingId = session.metadata?.listing_id;
    let listing = null;

    if (listingId) {
      const { data } = await supabase
        .from("listings")
        .select("*")
        .eq("id", listingId)
        .maybeSingle();
      listing = data;

      if (listing) {
        const amount = (session.amount_total || 0) / 100;
        const platformFee = session.metadata?.platform_fee
          ? Number(session.metadata.platform_fee)
          : Number((amount * 0.1).toFixed(2));

        await supabase.from("orders").upsert(
          {
            listing_id: listing.id,
            buyer_email:
              session.customer_details?.email || session.customer_email || null,
            seller_email: listing.seller_email,
            amount,
            platform_fee: platformFee,
            stripe_session_id: session.id,
            status: "paid",
          },
          { onConflict: "stripe_session_id" }
        );

        await supabase
          .from("listings")
          .update({ status: "sold" })
          .eq("id", listing.id);
      }
    }

    return NextResponse.json({
      paid: true,
      amountTotal: (session.amount_total || 0) / 100,
      buyerEmail: session.customer_details?.email || session.customer_email || "",
      listing,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not verify payment session.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}