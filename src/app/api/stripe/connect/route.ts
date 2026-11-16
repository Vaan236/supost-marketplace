import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return NextResponse.json(
        { error: "Please enter a valid seller email address." },
        { status: 400 }
      );
    }

    const origin = req.nextUrl.origin;

    const { data: existingSeller } = await supabase
      .from("sellers")
      .select("*")
      .eq("email", cleanEmail)
      .maybeSingle();

    let accountId = existingSeller?.stripe_account_id;

    if (!accountId) {
      const account = await stripe.accounts.create({
        email: cleanEmail,
        controller: {
          stripe_dashboard: {
            type: "express",
          },
          fees: {
            payer: "application",
          },
          losses: {
            payments: "stripe",
          },
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      accountId = account.id;

      const { error: upsertError } = await supabase.from("sellers").upsert({
        email: cleanEmail,
        stripe_account_id: accountId,
        charges_enabled: Boolean(account.charges_enabled),
      });

      if (upsertError) {
        return NextResponse.json(
          { error: `Failed to save seller: ${upsertError.message}` },
          { status: 500 }
        );
      }
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/connect?email=${encodeURIComponent(cleanEmail)}&refresh=1`,
      return_url: `${origin}/connect?email=${encodeURIComponent(cleanEmail)}&return=1`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url, accountId });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to start Stripe onboarding.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}