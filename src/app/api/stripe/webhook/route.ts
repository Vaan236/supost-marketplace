import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: "Missing webhook signature or secret." },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Invalid webhook signature.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    if (event.type === "account.updated") {
      const account = event.data.object as Stripe.Account;
      // Only update if this connected account belongs to our Supabase sellers table
      const { data: seller } = await supabase
        .from("sellers")
        .select("email")
        .eq("stripe_account_id", account.id)
        .maybeSingle();

      if (seller) {
        await supabase
          .from("sellers")
          .update({ charges_enabled: Boolean(account.charges_enabled) })
          .eq("stripe_account_id", account.id);
      }
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const listingId = session.metadata?.listing_id;

      // Ignore events from other candidates' apps in the shared Stripe sandbox
      if (!listingId) {
        return NextResponse.json({ received: true, ignored: true });
      }

      const { data: listing } = await supabase
        .from("listings")
        .select("*")
        .eq("id", listingId)
        .maybeSingle();

      if (!listing) {
        return NextResponse.json({ received: true, ignored: true });
      }

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

    return NextResponse.json({ received: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Webhook processing error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}