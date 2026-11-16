import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!cleanEmail) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const { data: seller } = await supabase
      .from("sellers")
      .select("*")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (!seller) {
      return NextResponse.json({ connected: false, charges_enabled: false });
    }

    const account = await stripe.accounts.retrieve(seller.stripe_account_id);
    const chargesEnabled = Boolean(account.charges_enabled);

    if (chargesEnabled !== seller.charges_enabled) {
      await supabase
        .from("sellers")
        .update({ charges_enabled: chargesEnabled })
        .eq("email", cleanEmail);
    }

    return NextResponse.json({
      connected: true,
      stripe_account_id: seller.stripe_account_id,
      charges_enabled: chargesEnabled,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not verify seller status.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}